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
