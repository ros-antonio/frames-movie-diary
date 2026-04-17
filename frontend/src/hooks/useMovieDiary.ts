import { useMemo, useState } from 'react';
import type { MovieLog } from '../types';
import { getPreferences } from './useUserActivity';

type ViewMode = 'table' | 'card';
type SortField = 'movieName' | 'watchDate';
type SortOrder = 'asc' | 'desc';

export function useMovieDiary(movieLogs: MovieLog[], itemsPerBatch: number = 12) {
  const [visibleCount, setVisibleCount] = useState(itemsPerBatch);
  const [viewMode, setViewMode] = useState<ViewMode>(() => getPreferences().viewMode);
  const [sortConfig, setSortConfig] = useState<{ field: SortField; order: SortOrder } | null>(() => {
    const savedPreferences = getPreferences();
    return savedPreferences.sortBy === 'none' || savedPreferences.sortOrder === 'none'
      ? null
      : { field: savedPreferences.sortBy, order: savedPreferences.sortOrder };
  });

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

  const boundedVisibleCount = Math.min(Math.max(visibleCount, itemsPerBatch), Math.max(sortedMovies.length, itemsPerBatch));
  const currentMovies = sortedMovies.slice(0, boundedVisibleCount);
  const hasMore = currentMovies.length < sortedMovies.length;

  const loadMore = () => {
    setVisibleCount((current) => Math.min(current + itemsPerBatch, sortedMovies.length));
  };

  const resetVisible = () => {
    setVisibleCount(itemsPerBatch);
  };

  const requestSort = (field: SortField) => {
    let order: SortOrder = 'asc';
    if (sortConfig && sortConfig.field === field && sortConfig.order === 'asc') {
      order = 'desc';
    }
    setSortConfig({ field, order });
    resetVisible();
  };

  return {
    viewMode,
    setViewMode,
    currentMovies,
    hasMore,
    loadMore,
    visibleCount: currentMovies.length,
    totalMovies: sortedMovies.length,
    requestSort,
    sortConfig,
  };
}