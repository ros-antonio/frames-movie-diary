import { useState } from 'react';
import type { MovieLog } from '../types';

export function useMovieForm(
    onSave: (movie: { movieName: string; watchDate: string; rating?: number; review?: string }) => void,
    initialData?: MovieLog
) {
    const [formData, setFormData] = useState({
        title: initialData?.movieName || '',
        watchDate: initialData?.watchDate ? new Date(initialData.watchDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        rating: initialData?.rating || 0,
        review: initialData?.review || '',
    });

    const handleSubmit = (e: React.SyntheticEvent) => {
        e.preventDefault();

        if (!formData.title || !formData.watchDate) {
            return;
        }

        onSave({
            movieName: formData.title,
            watchDate: formData.watchDate,
            rating: Number(formData.rating),
            review: formData.review,
        });
    };

    return { formData, setFormData, handleSubmit };
}