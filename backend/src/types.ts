export interface SavedFrame {
  id: string;
  imageUrl: string;
  timestamp: string;
  caption: string;
}

export interface Movie {
  id: string;
  movieName: string;
  watchDate: string;
  rating?: number;
  review?: string;
  movieLink?: string;
  frames: SavedFrame[];
}

export interface CustomList {
  id: string;
  name: string;
  description: string;
  movieIds: string[];
}

export interface PaginationQuery {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
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

export interface SuspiciousObservation {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  reason: string;
  score: number;
  status: 'OBSERVED' | 'REVIEWED' | 'CLEARED';
  firstDetectedAt: string;
  lastDetectedAt: string;
  reviewedAt?: string;
}

export interface ListOverlapStatistic {
  userId: string;
  userName: string;
  userEmail: string;
  listAId: string;
  listAName: string;
  listAMovieCount: number;
  listBId: string;
  listBName: string;
  listBMovieCount: number;
  sharedMovieCount: number;
  similarityScore: number;
}

