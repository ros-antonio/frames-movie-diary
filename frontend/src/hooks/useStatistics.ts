import { useEffect, useMemo, useState } from 'react';
import type { MovieLog, StatisticsOverview } from '../types';
import { movieDiaryApi } from '../api/movieDiaryApi';

export interface RatingDataEntry {
  rating: string;
  count: number;
}

interface UseStatisticsOptions {
  forceBackend?: boolean;
}

const RATING_BUCKETS = ['0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5'];

function computeLocalStats(movieLogs: MovieLog[]) {
  const ratingData = RATING_BUCKETS.map((rating) => ({ rating, count: 0 }));

  movieLogs.forEach((movie) => {
    if (movie.rating === undefined) return;
    const key = String(movie.rating);
    const bucket = ratingData.find((entry) => entry.rating === key);
    if (bucket) {
      bucket.count += 1;
    }
  });

  const ratedMovies = movieLogs.filter((movie) => movie.rating !== undefined);
  const averageRating =
    ratedMovies.length === 0
      ? 0
      : ratedMovies.reduce((sum, movie) => sum + (movie.rating || 0), 0) / ratedMovies.length;
  const mostCommonRating =
    ratedMovies.length === 0
      ? '-'
      : ratingData.reduce((prev, current) => (prev.count > current.count ? prev : current)).rating;

  return {
    totalMovies: movieLogs.length,
    averageRating,
    mostCommonRating,
    ratingData,
  };
}

function toRatingData(distribution: Record<string, number>): RatingDataEntry[] {
  return RATING_BUCKETS.map((rating) => ({
    rating,
    count: distribution[rating] ?? 0,
  }));
}

export function getBarColor(rating: string, count: number) {
  if (count === 0) return 'rgba(74, 144, 226, 0.2)';

  const colorMap: Record<string, string> = {
    '0.5': '#4A9EE2',
    '1': '#4A90E2',
    '1.5': '#4AA8D8',
    '2': '#4BC0C0',
    '2.5': '#5FD3BC',
    '3': '#7FD8A0',
    '3.5': '#A8DB7A',
    '4': '#D4D85A',
    '4.5': '#EFC842',
    '5': '#FFD700',
  };

  return colorMap[rating] || '#E0BAAA';
}

export function useStatistics(movieLogs: MovieLog[], options?: UseStatisticsOptions) {
  const useBackend = options?.forceBackend ?? import.meta.env.MODE !== 'test';
  const localStats = useMemo(() => computeLocalStats(movieLogs), [movieLogs]);
  const [backendOverview, setBackendOverview] = useState<StatisticsOverview | null>(null);

  useEffect(() => {
    if (!useBackend) {
      return;
    }

    movieDiaryApi
      .getStatisticsOverview()
      .then((overview) => {
        setBackendOverview(overview);
      })
      .catch(() => {
        // Fall back to local derived statistics when backend stats cannot be loaded.
        setBackendOverview(null);
      });
  }, [useBackend, movieLogs]);

  if (!backendOverview) {
    return localStats;
  }

  const mostCommonRating = (() => {
    const ratingData = toRatingData(backendOverview.ratingDistribution);
    const max = ratingData.reduce((prev, current) => (prev.count > current.count ? prev : current));
    return max.count > 0 ? max.rating : '-';
  })();

  return {
    totalMovies: backendOverview.totalMovies,
    averageRating: backendOverview.averageRating ?? 0,
    mostCommonRating,
    ratingData: toRatingData(backendOverview.ratingDistribution),
  };
}

