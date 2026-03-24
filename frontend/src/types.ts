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
    frames: SavedFrame[];
}