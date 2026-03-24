import type { MovieLog } from '../types';

export function useMovieDetail(movie: MovieLog, onDelete: (id: string) => void) {
    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete "${movie.movieName}"?`)) {
            onDelete(movie.id);
        }
    };

    return { handleDelete };
}