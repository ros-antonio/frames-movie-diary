import type { AuthUser, CustomList, MovieInput, MovieLog, SavedFrame, StatisticsOverview } from '../types';

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface GraphQLErrorPayload {
  message?: string;
  extensions?: {
    statusCode?: number;
    details?: Array<{ message?: string }>;
  };
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLErrorPayload[];
}

export class ApiHttpError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiHttpError';
  }
}

export class ApiNetworkError extends Error {
  constructor(message = 'Network is unavailable') {
    super(message);
    this.name = 'ApiNetworkError';
  }
}

export function isOfflineLikeError(error: unknown): boolean {
  if (error instanceof ApiNetworkError) {
    return true;
  }

  if (error instanceof TypeError) {
    return /fetch|network|failed to fetch/i.test(error.message);
  }

  if (error instanceof Error) {
    return /network|offline|failed to fetch|load data from the backend/i.test(error.message);
  }

  return false;
}

export interface MovieDiaryApi {
  getMoviesPage(page: number, pageSize?: number): Promise<PaginatedResponse<MovieLog>>;
  getAllMovies(): Promise<MovieLog[]>;
  createMovie(movie: MovieInput): Promise<MovieLog>;
  updateMovie(movieId: string, movie: MovieInput): Promise<MovieLog>;
  deleteMovie(movieId: string): Promise<void>;
  addFrame(movieId: string, frame: Omit<SavedFrame, 'id'>): Promise<SavedFrame>;
  deleteFrame(movieId: string, frameId: string): Promise<void>;
  getAllLists(): Promise<CustomList[]>;
  createList(name: string, description: string): Promise<CustomList>;
  deleteList(listId: string): Promise<void>;
  addMovieToList(listId: string, movieId: string): Promise<CustomList>;
  removeMovieFromList(listId: string, movieId: string): Promise<CustomList>;
  register(input: { name: string; email: string; password: string; confirmPassword: string }): Promise<AuthUser>;
  login(input: { email: string; password: string }): Promise<AuthUser>;
  getStatisticsOverview(): Promise<StatisticsOverview>;
}

function resolveGraphQLEndpoint(baseUrl?: string): string {
  if (!baseUrl) {
    return 'http://localhost:4000/api/graphql';
  }

  const trimmed = baseUrl.replace(/\/+$/, '');
  if (trimmed.endsWith('/graphql')) {
    return trimmed;
  }

  if (trimmed.endsWith('/api')) {
    return `${trimmed}/graphql`;
  }

  return `${trimmed}/api/graphql`;
}

const API_BASE_URL = resolveGraphQLEndpoint(import.meta.env.VITE_API_BASE_URL as string | undefined);

async function requestGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new ApiNetworkError(error.message);
    }

    throw new ApiNetworkError();
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const body = (await response.json()) as GraphQLResponse<Record<string, unknown>>;
      const firstError = body.errors?.[0];
      if (firstError?.message) {
        message = firstError.message;
      }

      const firstDetail = firstError?.extensions?.details?.[0]?.message;
      if (firstDetail && firstError?.message) {
        message = `${firstError.message}: ${firstDetail}`;
      }
    } catch {
      // Keep fallback message if response body is not JSON.
    }

    throw new ApiHttpError(response.status, message);
  }

  const body = (await response.json()) as GraphQLResponse<T>;
  const firstError = body.errors?.[0];
  if (firstError) {
    let message = firstError.message ?? 'GraphQL request failed';
    const firstDetail = firstError.extensions?.details?.[0]?.message;
    if (firstDetail && firstError.message) {
      message = `${firstError.message}: ${firstDetail}`;
    }

    throw new ApiHttpError(firstError.extensions?.statusCode ?? 500, message);
  }

  if (body.data === undefined) {
    throw new ApiHttpError(500, 'Invalid GraphQL response payload');
  }

  return body.data;
}

async function getAllPages<T>(fetchPage: (page: number, pageSize: number) => Promise<PaginatedResponse<T>>): Promise<T[]> {
  const pageSize = 100;
  let page = 1;
  const aggregated: T[] = [];

  while (true) {
    const payload = await fetchPage(page, pageSize);
    aggregated.push(...payload.data);

    if (!payload.pagination.hasNextPage) {
      return aggregated;
    }

    page += 1;
  }
}

export function registerUser(input: { name: string; email: string; password: string; confirmPassword: string }) {
  return requestGraphQL<{ register: AuthUser }>(
    `mutation Register($input: RegisterInput!) {
      register(input: $input) {
        id
        name
        email
      }
    }`,
    { input },
  ).then((result) => result.register);
}

function mapStatisticsOverview(raw: {
  totalMovies: number;
  ratedMovies: number;
  unratedMovies: number;
  averageRating: number | null;
  totalFrames: number;
  moviesWithFrames: number;
  topRatedMovies: Array<{ id: string; movieName: string; rating?: number }>;
  ratingDistribution: {
    value0_5: number;
    value1: number;
    value1_5: number;
    value2: number;
    value2_5: number;
    value3: number;
    value3_5: number;
    value4: number;
    value4_5: number;
    value5: number;
  };
}): StatisticsOverview {
  return {
    totalMovies: raw.totalMovies,
    ratedMovies: raw.ratedMovies,
    unratedMovies: raw.unratedMovies,
    averageRating: raw.averageRating,
    totalFrames: raw.totalFrames,
    moviesWithFrames: raw.moviesWithFrames,
    topRatedMovies: raw.topRatedMovies,
    ratingDistribution: {
      '0.5': raw.ratingDistribution.value0_5,
      '1': raw.ratingDistribution.value1,
      '1.5': raw.ratingDistribution.value1_5,
      '2': raw.ratingDistribution.value2,
      '2.5': raw.ratingDistribution.value2_5,
      '3': raw.ratingDistribution.value3,
      '3.5': raw.ratingDistribution.value3_5,
      '4': raw.ratingDistribution.value4,
      '4.5': raw.ratingDistribution.value4_5,
      '5': raw.ratingDistribution.value5,
    },
  };
}

export function loginUser(input: { email: string; password: string }) {
  return requestGraphQL<{ login: AuthUser }>(
    `mutation Login($input: LoginInput!) {
      login(input: $input) {
        id
        name
        email
      }
    }`,
    { input },
  ).then((result) => result.login);
}

const movieSelectionSet = `
  id
  movieName
  watchDate
  rating
  review
  movieLink
  frames {
    id
    imageUrl
    timestamp
    caption
  }
`;

const listSelectionSet = `
  id
  name
  description
  movieIds
`;

export const movieDiaryApi: MovieDiaryApi = {
  getMoviesPage(page: number, pageSize = 12) {
    return requestGraphQL<{ movies: PaginatedResponse<MovieLog> }>(
      `query Movies($page: Int!, $pageSize: Int!) {
        movies(page: $page, pageSize: $pageSize) {
          data {
            ${movieSelectionSet}
          }
          pagination {
            page
            pageSize
            totalItems
            totalPages
            hasNextPage
            hasPreviousPage
          }
        }
      }`,
      { page, pageSize },
    ).then((result) => result.movies);
  },

  getAllMovies() {
    return getAllPages<MovieLog>((page, pageSize) => this.getMoviesPage(page, pageSize));
  },

  createMovie(movie: MovieInput) {
    return requestGraphQL<{ createMovie: MovieLog }>(
      `mutation CreateMovie($input: MovieInput!) {
        createMovie(input: $input) {
          ${movieSelectionSet}
        }
      }`,
      { input: movie },
    ).then((result) => result.createMovie);
  },

  updateMovie(movieId: string, movie: MovieInput) {
    return requestGraphQL<{ updateMovie: MovieLog }>(
      `mutation UpdateMovie($movieId: ID!, $input: MovieInput!) {
        updateMovie(movieId: $movieId, input: $input) {
          ${movieSelectionSet}
        }
      }`,
      { movieId, input: movie },
    ).then((result) => result.updateMovie);
  },

  deleteMovie(movieId: string) {
    return requestGraphQL<{ deleteMovie: boolean }>(
      `mutation DeleteMovie($movieId: ID!) {
        deleteMovie(movieId: $movieId)
      }`,
      { movieId },
    ).then(() => undefined);
  },

  addFrame(movieId: string, frame: Omit<SavedFrame, 'id'>) {
    return requestGraphQL<{ addFrame: SavedFrame }>(
      `mutation AddFrame($movieId: ID!, $input: FrameInput!) {
        addFrame(movieId: $movieId, input: $input) {
          id
          imageUrl
          timestamp
          caption
        }
      }`,
      { movieId, input: frame },
    ).then((result) => result.addFrame);
  },

  deleteFrame(movieId: string, frameId: string) {
    return requestGraphQL<{ deleteFrame: boolean }>(
      `mutation DeleteFrame($movieId: ID!, $frameId: ID!) {
        deleteFrame(movieId: $movieId, frameId: $frameId)
      }`,
      { movieId, frameId },
    ).then(() => undefined);
  },

  getAllLists() {
    return getAllPages<CustomList>((page, pageSize) =>
      requestGraphQL<{ lists: PaginatedResponse<CustomList> }>(
        `query Lists($page: Int!, $pageSize: Int!) {
          lists(page: $page, pageSize: $pageSize) {
            data {
              ${listSelectionSet}
            }
            pagination {
              page
              pageSize
              totalItems
              totalPages
              hasNextPage
              hasPreviousPage
            }
          }
        }`,
        { page, pageSize },
      ).then((result) => result.lists),
    );
  },

  createList(name: string, description: string) {
    return requestGraphQL<{ createList: CustomList }>(
      `mutation CreateList($input: ListInput!) {
        createList(input: $input) {
          ${listSelectionSet}
        }
      }`,
      { input: { name, description } },
    ).then((result) => result.createList);
  },

  deleteList(listId: string) {
    return requestGraphQL<{ deleteList: boolean }>(
      `mutation DeleteList($listId: ID!) {
        deleteList(listId: $listId)
      }`,
      { listId },
    ).then(() => undefined);
  },

  addMovieToList(listId: string, movieId: string) {
    return requestGraphQL<{ addMovieToList: CustomList }>(
      `mutation AddMovieToList($listId: ID!, $movieId: ID!) {
        addMovieToList(listId: $listId, movieId: $movieId) {
          ${listSelectionSet}
        }
      }`,
      { listId, movieId },
    ).then((result) => result.addMovieToList);
  },

  removeMovieFromList(listId: string, movieId: string) {
    return requestGraphQL<{ removeMovieFromList: CustomList }>(
      `mutation RemoveMovieFromList($listId: ID!, $movieId: ID!) {
        removeMovieFromList(listId: $listId, movieId: $movieId) {
          ${listSelectionSet}
        }
      }`,
      { listId, movieId },
    ).then((result) => result.removeMovieFromList);
  },

  register(input: { name: string; email: string; password: string; confirmPassword: string }) {
    return registerUser(input);
  },

  login(input: { email: string; password: string }) {
    return loginUser(input);
  },

  getStatisticsOverview() {
    return requestGraphQL<{
      statisticsOverview: {
        totalMovies: number;
        ratedMovies: number;
        unratedMovies: number;
        averageRating: number | null;
        totalFrames: number;
        moviesWithFrames: number;
        topRatedMovies: Array<{ id: string; movieName: string; rating?: number }>;
        ratingDistribution: {
          value0_5: number;
          value1: number;
          value1_5: number;
          value2: number;
          value2_5: number;
          value3: number;
          value3_5: number;
          value4: number;
          value4_5: number;
          value5: number;
        };
      };
    }>(
      `query StatisticsOverview {
        statisticsOverview {
          totalMovies
          ratedMovies
          unratedMovies
          averageRating
          totalFrames
          moviesWithFrames
          topRatedMovies {
            id
            movieName
            rating
          }
          ratingDistribution {
            value0_5
            value1
            value1_5
            value2
            value2_5
            value3
            value3_5
            value4
            value4_5
            value5
          }
        }
      }`,
    ).then((result) => mapStatisticsOverview(result.statisticsOverview));
  },
};

