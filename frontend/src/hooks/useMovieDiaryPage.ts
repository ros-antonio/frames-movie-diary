import { useNavigate } from 'react-router-dom';
import type { MovieLog } from '../types';
import { useMovieDiary } from './useMovieDiary';
import { useUserActivity } from './useUserActivity';

export function useMovieDiaryPage(movieLogs: MovieLog[]) {
  const navigate = useNavigate();
  const movieDiary = useMovieDiary(movieLogs);
  const { trackPreference } = useUserActivity();

  const handleViewModeChange = (mode: 'table' | 'card') => {
    movieDiary.setViewMode(mode);
    trackPreference({ viewMode: mode });
  };

  const handleSortChange = (field: 'movieName' | 'watchDate') => {
    const nextOrder = movieDiary.sortConfig?.field === field && movieDiary.sortConfig.order === 'asc' ? 'desc' : 'asc';
    movieDiary.requestSort(field);
    trackPreference({ sortBy: field, sortOrder: nextOrder });
  };

  const getSortDirection = (field: 'movieName' | 'watchDate') => {
    if (movieDiary.sortConfig?.field !== field) return 'none';
    return movieDiary.sortConfig.order;
  };

  return {
    ...movieDiary,
    handleViewModeChange,
    handleSortChange,
    getSortDirection,
    goToStatistics: () => navigate('/statistics'),
    goToCustomLists: () => navigate('/custom-lists'),
  };
}

