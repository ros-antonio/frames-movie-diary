import { useState } from 'react';
import type { MovieInput, MovieLog } from '../types';

interface MovieFormData {
    title: string;
    watchDate: string;
    rating: string;
    review: string;
    movieLink: string;
}

interface FormErrors {
    title?: string;
    watchDate?: string;
    rating?: string;
    review?: string;
    movieLink?: string;
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

function validateMovieForm(data: MovieFormData): FormErrors {
    const errors: FormErrors = {};

    const trimmedTitle = data.title.trim();
    if (!trimmedTitle) {
        errors.title = 'Movie title is required';
    } else if (trimmedTitle.length > 255) {
        errors.title = 'Movie title must be less than 255 characters';
    }

    if (!data.watchDate) {
        errors.watchDate = 'Watch date is required';
    } else {
        const dateObj = new Date(data.watchDate);
        if (Number.isNaN(dateObj.getTime())) {
            errors.watchDate = 'Invalid date format';
        } else if (dateObj > new Date()) {
            errors.watchDate = 'Watch date cannot be in the future';
        }
    }

    if (data.rating) {
        const rating = Number(data.rating);
        if (!Number.isFinite(rating)) {
            errors.rating = 'Rating must be a valid number';
        } else if (rating < 0.5) {
            errors.rating = 'Rating must be at least 0.5 stars';
        } else if (rating > 5) {
            errors.rating = 'Rating cannot exceed 5 stars';
        }
    }

    if (data.review && data.review.length > 1000) {
        errors.review = 'Review must be less than 1000 characters';
    }

    if (data.movieLink) {
        const trimmedLink = data.movieLink.trim();
        if (trimmedLink && !/^(https?:\/\/|magnet:)/.test(trimmedLink)) {
            errors.movieLink = 'Movie link must start with https://, http://, or magnet:';
        } else if (trimmedLink && trimmedLink.length > 2000) {
            errors.movieLink = 'Movie link must be less than 2000 characters';
        }
    }

    return errors;
}

export function useMovieForm(onSave: (movie: MovieInput) => void, initialData?: MovieLog) {
    const [formData, setFormData] = useState<MovieFormData>({
        title: initialData?.movieName || '',
        watchDate: toDateInputValue(initialData?.watchDate),
        rating: initialData?.rating !== undefined ? String(initialData.rating) : '',
        review: initialData?.review || '',
        movieLink: initialData?.movieLink || '',
    });
    const [errors, setErrors] = useState<FormErrors>({});

    const handleSubmit = (e: React.SyntheticEvent) => {
        e.preventDefault();

        const newErrors = validateMovieForm(formData);
        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            return;
        }

        const parsedRating = formData.rating === '' ? undefined : Number(formData.rating);

        onSave({
            movieName: formData.title.trim(),
            watchDate: formData.watchDate,
            rating: parsedRating,
            review: formData.review.trim() || undefined,
            movieLink: formData.movieLink.trim() || undefined,
        });
    };

    return { formData, setFormData, handleSubmit, errors };
}