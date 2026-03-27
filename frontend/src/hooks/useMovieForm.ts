import { useState } from 'react';
import type { MovieLog } from '../types';

interface MovieFormData {
    title: string;
    watchDate: string;
    rating: string;
    review: string;
    movieLink: string;
}

function formatDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function toDateInputValue(rawDate?: string): string {
    if (!rawDate) {
        return formatDateInputValue(new Date());
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        return rawDate;
    }

    const parsedDate = new Date(rawDate);
    if (Number.isNaN(parsedDate.getTime())) {
        return formatDateInputValue(new Date());
    }

    return formatDateInputValue(parsedDate);
}

export function useMovieForm(
    onSave: (movie: { movieName: string; watchDate: string; rating?: number; review?: string; movieLink?: string }) => void,
    initialData?: MovieLog
) {
    const [formData, setFormData] = useState<MovieFormData>({
        title: initialData?.movieName || '',
        watchDate: toDateInputValue(initialData?.watchDate),
        rating: initialData?.rating !== undefined ? String(initialData.rating) : '',
        review: initialData?.review || '',
        movieLink: initialData?.movieLink || '',
    });

    const handleSubmit = (e: React.SyntheticEvent) => {
        e.preventDefault();

        if (!formData.title || !formData.watchDate) {
            return;
        }

        const parsedRating = formData.rating === '' ? undefined : Number(formData.rating);
        if (parsedRating !== undefined && (!Number.isFinite(parsedRating) || parsedRating < 0.5 || parsedRating > 5)) {
            return;
        }

        onSave({
            movieName: formData.title,
            watchDate: formData.watchDate,
            rating: parsedRating,
            review: formData.review,
            movieLink: formData.movieLink.trim() || undefined,
        });
    };

    return { formData, setFormData, handleSubmit };
}