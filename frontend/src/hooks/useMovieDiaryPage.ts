import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MovieLog } from '../types';
import { isOfflineLikeError, movieDiaryApi } from '../api/movieDiaryApi';
import type { MovieDiaryApi } from '../api/movieDiaryApi';
import { useMovieDiary } from './useMovieDiary';
import { useUserActivity } from './useUserActivity';

const serverDiaryPageSize = 12;
type MoviesPagePayload = Awaited<ReturnType<MovieDiaryApi['getMoviesPage']>>;

interface UseMovieDiaryPageOptions {
  forceServerPaging?: boolean;
  api?: Pick<MovieDiaryApi, 'getMoviesPage'>;
}

function mergeMoviesById(existing: MovieLog[], incoming: MovieLog[]): MovieLog[] {
  const merged = [...existing];
  const seenIds = new Set(existing.map((movie) => movie.id));

  for (const movie of incoming) {
    if (!seenIds.has(movie.id)) {
      merged.push(movie);
      seenIds.add(movie.id);
    }
  }

  return merged;
}

export function useMovieDiaryPage(movieLogs: MovieLog[], options?: UseMovieDiaryPageOptions) {
  const navigate = useNavigate();
  const { trackPreference } = useUserActivity();
  const useServerPaging = options?.forceServerPaging ?? import.meta.env.MODE !== 'test';
  const getMoviesPage = options?.api?.getMoviesPage ?? movieDiaryApi.getMoviesPage;

  const [serverMovies, setServerMovies] = useState<MovieLog[]>([]);
  const [serverMode, setServerMode] = useState(false);
  const [serverHasMore, setServerHasMore] = useState(false);
  const [nextPage, setNextPage] = useState(1);
  const prefetchedPageRef = useRef<MoviesPagePayload | null>(null);

  const localDiary = useMovieDiary(movieLogs);
  const serverDiary = useMovieDiary(serverMovies, Number.MAX_SAFE_INTEGER);

  const activeDiary = serverMode ? serverDiary : localDiary;

  const prefetchNextPage = useCallback(async (page: number) => {
    if (!useServerPaging || page < 1) {
      return;
    }

    try {
      prefetchedPageRef.current = await getMoviesPage(page, serverDiaryPageSize);
    } catch {
      prefetchedPageRef.current = null;
    }
  }, [getMoviesPage, useServerPaging]);

  const applyServerPage = useCallback((payload: MoviesPagePayload, append: boolean) => {
    setServerMovies((current) => (append ? mergeMoviesById(current, payload.data) : payload.data));
    setServerHasMore(payload.pagination.hasNextPage);
    setNextPage(payload.pagination.page + 1);

    if (payload.pagination.hasNextPage) {
      void prefetchNextPage(payload.pagination.page + 1);
    } else {
      prefetchedPageRef.current = null;
    }
  }, [prefetchNextPage]);

  useEffect(() => {
    if (!useServerPaging) {
      return;
    }

    let cancelled = false;

    const loadFirstPage = async () => {
      try {
        const pagePayload = await getMoviesPage(1, serverDiaryPageSize);
        if (cancelled) {
          return;
        }

        setServerMode(true);
        applyServerPage(pagePayload, false);
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        if (isOfflineLikeError(error)) {
          setServerMode(false);
        }
      }
    };

    void loadFirstPage();

    return () => {
      cancelled = true;
    };
  }, [applyServerPage, getMoviesPage, useServerPaging, movieLogs.length]);

  const loadMore = useCallback(async () => {
    if (!serverMode || !useServerPaging) {
      activeDiary.loadMore();
      return;
    }

    if (!serverHasMore) {
      return;
    }

    const prefetchedPayload = prefetchedPageRef.current;
    if (prefetchedPayload && prefetchedPayload.pagination.page === nextPage) {
      prefetchedPageRef.current = null;
      applyServerPage(prefetchedPayload, true);
      return;
    }

    try {
      const payload = await getMoviesPage(nextPage, serverDiaryPageSize);
      applyServerPage(payload, true);
    } catch (error: unknown) {
      if (isOfflineLikeError(error)) {
        setServerMode(false);
      }
    }
  }, [activeDiary, applyServerPage, getMoviesPage, nextPage, serverHasMore, serverMode, useServerPaging]);

  const handleViewModeChange = (mode: 'table' | 'card') => {
    activeDiary.setViewMode(mode);
    trackPreference({ viewMode: mode });
  };

  const handleSortChange = (field: 'movieName' | 'watchDate') => {
    const nextOrder = activeDiary.sortConfig?.field === field && activeDiary.sortConfig.order === 'asc' ? 'desc' : 'asc';
    activeDiary.requestSort(field);
    trackPreference({ sortBy: field, sortOrder: nextOrder });
  };

  const getSortDirection = (field: 'movieName' | 'watchDate') => {
    if (activeDiary.sortConfig?.field !== field) return 'none';
    return activeDiary.sortConfig.order;
  };

  return {
    ...activeDiary,
    hasMore: serverMode ? serverHasMore : activeDiary.hasMore,
    loadMore,
    totalMovies: serverMode ? serverMovies.length : activeDiary.totalMovies,
    handleViewModeChange,
    handleSortChange,
    getSortDirection,
    goToStatistics: () => navigate('/statistics'),
    goToCustomLists: () => navigate('/custom-lists'),
  };
}
