import { useNavigate } from 'react-router-dom';
import type { MovieLog } from '../types';
import { useMovieDiary } from './useMovieDiary';

export function useMovieDiaryPage(movieLogs: MovieLog[]) {
  const navigate = useNavigate();
  const movieDiary = useMovieDiary(movieLogs);

  const getSortDirection = (field: 'movieName' | 'watchDate') => {
    if (movieDiary.sortConfig?.field !== field) return 'none';
    return movieDiary.sortConfig.order;
  };

  return {
    ...movieDiary,
    getSortDirection,
    goToStatistics: () => navigate('/statistics'),
    goToCustomLists: () => navigate('/custom-lists'),
  };
}

