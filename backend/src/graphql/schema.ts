import { GraphQLError } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError.js';
import { movieService } from '../services/movieService.js';
import { listService } from '../services/listService.js';
import { statisticsService } from '../services/statisticsService.js';
import { authService } from '../services/authService.js';
import {
  paginationQuerySchema,
  movieIdParamSchema,
  listIdParamSchema,
  movieFrameParamsSchema,
  listMovieParamsSchema,
} from '../validators/commonSchemas.js';
import { createMovieSchema, createFrameSchema, updateMovieSchema } from '../validators/movieSchemas.js';
import { createListSchema, updateListSchema } from '../validators/listSchemas.js';
import { loginSchema, registerSchema } from '../validators/authSchemas.js';

const typeDefs = `#graphql
  type SavedFrame {
    id: ID!
    imageUrl: String!
    timestamp: String!
    caption: String!
  }

  type Movie {
    id: ID!
    movieName: String!
    watchDate: String!
    rating: Float
    review: String
    movieLink: String
    frames: [SavedFrame!]!
  }

  type CustomList {
    id: ID!
    name: String!
    description: String!
    movieIds: [ID!]!
  }

  type AuthUser {
    id: ID!
    name: String!
    email: String!
  }

  type TopRatedMovie {
    id: ID!
    movieName: String!
    rating: Float
  }

  type RatingDistribution {
    value0_5: Int!
    value1: Int!
    value1_5: Int!
    value2: Int!
    value2_5: Int!
    value3: Int!
    value3_5: Int!
    value4: Int!
    value4_5: Int!
    value5: Int!
  }

  type StatisticsOverview {
    totalMovies: Int!
    ratedMovies: Int!
    unratedMovies: Int!
    averageRating: Float
    totalFrames: Int!
    moviesWithFrames: Int!
    topRatedMovies: [TopRatedMovie!]!
    ratingDistribution: RatingDistribution!
  }

  type Pagination {
    page: Int!
    pageSize: Int!
    totalItems: Int!
    totalPages: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  type MoviePage {
    data: [Movie!]!
    pagination: Pagination!
  }

  type ListPage {
    data: [CustomList!]!
    pagination: Pagination!
  }

  input MovieInput {
    movieName: String!
    watchDate: String!
    rating: Float
    review: String
    movieLink: String
  }

  input FrameInput {
    imageUrl: String!
    timestamp: String!
    caption: String!
  }

  input ListInput {
    name: String!
    description: String
  }

  input RegisterInput {
    name: String!
    email: String!
    password: String!
    confirmPassword: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  type Query {
    health: String!
    movies(page: Int = 1, pageSize: Int = 10): MoviePage!
    movie(movieId: ID!): Movie!
    lists(page: Int = 1, pageSize: Int = 10): ListPage!
    list(listId: ID!): CustomList!
    statisticsOverview: StatisticsOverview!
  }

  type Mutation {
    createMovie(input: MovieInput!): Movie!
    updateMovie(movieId: ID!, input: MovieInput!): Movie!
    deleteMovie(movieId: ID!): Boolean!
    addFrame(movieId: ID!, input: FrameInput!): SavedFrame!
    deleteFrame(movieId: ID!, frameId: ID!): Boolean!

    createList(input: ListInput!): CustomList!
    updateList(listId: ID!, input: ListInput!): CustomList!
    deleteList(listId: ID!): Boolean!
    addMovieToList(listId: ID!, movieId: ID!): CustomList!
    removeMovieFromList(listId: ID!, movieId: ID!): CustomList!

    register(input: RegisterInput!): AuthUser!
    login(input: LoginInput!): AuthUser!
  }
`;

function toGraphQLError(error: unknown): GraphQLError {
  if (error instanceof GraphQLError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new GraphQLError('Validation failed', {
      extensions: {
        statusCode: 400,
        details: error.issues,
      },
    });
  }

  if (error instanceof HttpError) {
    return new GraphQLError(error.message, {
      extensions: {
        statusCode: error.statusCode,
      },
    });
  }

  if (error && typeof error === 'object') {
    const candidate = error as { statusCode?: unknown; message?: unknown; details?: unknown };
    if (typeof candidate.statusCode === 'number' && typeof candidate.message === 'string') {
      return new GraphQLError(candidate.message, {
        extensions: {
          statusCode: candidate.statusCode,
          details: candidate.details,
        },
      });
    }
  }

  return new GraphQLError('Internal server error', {
    extensions: {
      statusCode: 500,
    },
  });
}

async function resolveOrThrow<T>(resolver: () => Promise<T> | T): Promise<T> {
  try {
    return await resolver();
  } catch (error: unknown) {
    throw toGraphQLError(error);
  }
}

const resolvers = {
  RatingDistribution: {
    value0_5: (distribution: Record<string, number>) => distribution['0.5'] ?? 0,
    value1: (distribution: Record<string, number>) => distribution['1'] ?? 0,
    value1_5: (distribution: Record<string, number>) => distribution['1.5'] ?? 0,
    value2: (distribution: Record<string, number>) => distribution['2'] ?? 0,
    value2_5: (distribution: Record<string, number>) => distribution['2.5'] ?? 0,
    value3: (distribution: Record<string, number>) => distribution['3'] ?? 0,
    value3_5: (distribution: Record<string, number>) => distribution['3.5'] ?? 0,
    value4: (distribution: Record<string, number>) => distribution['4'] ?? 0,
    value4_5: (distribution: Record<string, number>) => distribution['4.5'] ?? 0,
    value5: (distribution: Record<string, number>) => distribution['5'] ?? 0,
  },
  Query: {
    health: () => 'ok',
    movies: (_root: unknown, args: { page?: number; pageSize?: number }) =>
      resolveOrThrow(() => {
        const pagination = paginationQuerySchema.parse({
          page: args.page,
          pageSize: args.pageSize,
        });

        return movieService.list(pagination.page, pagination.pageSize);
      }),
    movie: (_root: unknown, args: { movieId: string }) =>
      resolveOrThrow(() => {
        const { movieId } = movieIdParamSchema.parse({ movieId: args.movieId });
        return movieService.getById(movieId);
      }),
    lists: (_root: unknown, args: { page?: number; pageSize?: number }) =>
      resolveOrThrow(() => {
        const pagination = paginationQuerySchema.parse({
          page: args.page,
          pageSize: args.pageSize,
        });

        return listService.list(pagination.page, pagination.pageSize);
      }),
    list: (_root: unknown, args: { listId: string }) =>
      resolveOrThrow(() => {
        const { listId } = listIdParamSchema.parse({ listId: args.listId });
        return listService.getById(listId);
      }),
    statisticsOverview: () => resolveOrThrow(() => statisticsService.getOverview()),
  },
  Mutation: {
    createMovie: (_root: unknown, args: { input: unknown }) =>
      resolveOrThrow(() => {
        const payload = createMovieSchema.parse(args.input);
        return movieService.create(payload);
      }),
    updateMovie: (_root: unknown, args: { movieId: string; input: unknown }) =>
      resolveOrThrow(() => {
        const { movieId } = movieIdParamSchema.parse({ movieId: args.movieId });
        const payload = updateMovieSchema.parse(args.input);
        return movieService.update(movieId, payload);
      }),
    deleteMovie: (_root: unknown, args: { movieId: string }) =>
      resolveOrThrow(() => {
        const { movieId } = movieIdParamSchema.parse({ movieId: args.movieId });
        movieService.delete(movieId);
        return true;
      }),
    addFrame: (_root: unknown, args: { movieId: string; input: unknown }) =>
      resolveOrThrow(() => {
        const { movieId } = movieIdParamSchema.parse({ movieId: args.movieId });
        const payload = createFrameSchema.parse(args.input);
        return movieService.addFrame(movieId, payload);
      }),
    deleteFrame: (_root: unknown, args: { movieId: string; frameId: string }) =>
      resolveOrThrow(() => {
        const { movieId, frameId } = movieFrameParamsSchema.parse({
          movieId: args.movieId,
          frameId: args.frameId,
        });
        movieService.deleteFrame(movieId, frameId);
        return true;
      }),
    createList: (_root: unknown, args: { input: unknown }) =>
      resolveOrThrow(() => {
        const payload = createListSchema.parse(args.input);
        return listService.create(payload);
      }),
    updateList: (_root: unknown, args: { listId: string; input: unknown }) =>
      resolveOrThrow(() => {
        const { listId } = listIdParamSchema.parse({ listId: args.listId });
        const payload = updateListSchema.parse(args.input);
        return listService.update(listId, payload);
      }),
    deleteList: (_root: unknown, args: { listId: string }) =>
      resolveOrThrow(() => {
        const { listId } = listIdParamSchema.parse({ listId: args.listId });
        listService.delete(listId);
        return true;
      }),
    addMovieToList: (_root: unknown, args: { listId: string; movieId: string }) =>
      resolveOrThrow(() => {
        const { listId, movieId } = listMovieParamsSchema.parse({
          listId: args.listId,
          movieId: args.movieId,
        });
        return listService.addMovie(listId, movieId);
      }),
    removeMovieFromList: (_root: unknown, args: { listId: string; movieId: string }) =>
      resolveOrThrow(() => {
        const { listId, movieId } = listMovieParamsSchema.parse({
          listId: args.listId,
          movieId: args.movieId,
        });
        return listService.removeMovie(listId, movieId);
      }),
    register: (_root: unknown, args: { input: unknown }) =>
      resolveOrThrow(() => {
        const payload = registerSchema.parse(args.input);
        return authService.register(payload);
      }),
    login: (_root: unknown, args: { input: unknown }) =>
      resolveOrThrow(() => {
        const payload = loginSchema.parse(args.input);
        return authService.login(payload);
      }),
  },
};

export const graphQLSchema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

