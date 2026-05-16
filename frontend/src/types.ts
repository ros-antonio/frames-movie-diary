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
    role: string;
    permissions: string[];
    mfaEnabled: boolean;
}

export interface AuthChallengeResponse {
    challengeRequired: true;
    challengeToken: string;
    availableMethods: Array<'totp' | 'recovery_code'>;
    user: AuthUser;
}

export interface AuthSuccessResponse {
    user: AuthUser;
    token: string;
}

export type LoginResult = AuthSuccessResponse | AuthChallengeResponse;

export interface SecurityState {
    mfaEnabled: boolean;
    recoveryCodesRemaining: number;
    role: string;
    permissions: string[];
}

export interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions: string[];
    movieCount: number;
    listCount: number;
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
    ratingDistribution: Record<string, number>;
}
