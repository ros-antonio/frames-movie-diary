export interface SavedFrame {
    id: string;
    imageUrl: string;
    timestamp: string;
    caption: string;
}

export interface MovieLog {
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

export interface MovieInput {
    movieName: string;
    watchDate: string;
    rating?: number;
    review?: string;
    movieLink?: string;
}

export interface AuthUser {
    id: string;
    name: string;
    email: string;
}

export interface UserPreference {
    viewMode: 'table' | 'card';
    sortBy: 'movieName' | 'watchDate' | 'none';
    sortOrder: 'asc' | 'desc' | 'none';
    itemsPerPage: number;
}

export interface ActivityEvent {
    eventType: 'view' | 'add' | 'edit' | 'delete' | 'page_visit' | 'preference_change';
    movieId?: string;
    timestamp: string;
    pageRoute: string;
    details?: Record<string, unknown>;
}

export interface UserActivityLog {
    sessionId: string;
    preferences: UserPreference;
    activities: ActivityEvent[];
    lastActive: string;
    createdAt: string;
}

export interface StatisticsOverview {
    totalMovies: number;
    ratedMovies: number;
    unratedMovies: number;
    averageRating: number | null;
    totalFrames: number;
    moviesWithFrames: number;
    topRatedMovies: Array<{
        id: string;
        movieName: string;
        rating?: number;
    }>;
    ratingDistribution: Record<string, number>;
}

export interface GeneratorStatus {
    running: boolean;
    batchSize: number;
    intervalMs: number;
}

export interface GeneratorStartResponse {
    started: boolean;
    status: GeneratorStatus;
}

export interface GeneratorStopResponse {
    stopped: boolean;
    status: GeneratorStatus;
}

