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
