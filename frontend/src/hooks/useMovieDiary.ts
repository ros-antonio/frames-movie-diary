import { useState, useMemo } from 'react';
import type { MovieLog } from '../types';

type ViewMode = 'table' | 'card' | 'side-by-side';
type SortField = 'movieName' | 'watchDate';
type SortOrder = 'asc' | 'desc';

export function useMovieDiary(movieLogs: MovieLog[], itemsPerPage: number = 6) {
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
    const [sortConfig, setSortConfig] = useState<{ field: SortField; order: SortOrder } | null>(null);

    const sortedMovies = useMemo(() => {
        const items = [...movieLogs];
        if (sortConfig) {
            items.sort((a, b) => {
                const aValue = a[sortConfig.field].toLowerCase();
                const bValue = b[sortConfig.field].toLowerCase();
                if (aValue < bValue) return sortConfig.order === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.order === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [movieLogs, sortConfig]);

    const totalPages = Math.max(1, Math.ceil(sortedMovies.length / itemsPerPage));
    const clampedCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
    const setCurrentPageClamped = (page: number) => {
        setCurrentPage(Math.min(Math.max(page, 1), totalPages));
    };

    const startIndex = (clampedCurrentPage - 1) * itemsPerPage;
    const currentMovies = sortedMovies.slice(startIndex, startIndex + itemsPerPage);

    const requestSort = (field: SortField) => {
        let order: SortOrder = 'asc';
        if (sortConfig && sortConfig.field === field && sortConfig.order === 'asc') {
            order = 'desc';
        }
        setSortConfig({ field, order });
    };

    return {
        currentPage: clampedCurrentPage,
        setCurrentPage: setCurrentPageClamped,
        viewMode,
        setViewMode,
        totalPages,
        currentMovies,
        requestSort,
        sortConfig
    };
}