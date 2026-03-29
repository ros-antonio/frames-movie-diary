import { useMemo } from 'react';
import type { MovieLog } from '../types';

export interface RatingDataEntry {
  rating: string;
  count: number;
}

const RATING_BUCKETS = ['0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5'];

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

export function useStatistics(movieLogs: MovieLog[]) {
  const ratingData = useMemo<RatingDataEntry[]>(() => {
    const buckets = RATING_BUCKETS.map((rating) => ({ rating, count: 0 }));

    movieLogs.forEach((movie) => {
      if (movie.rating === undefined) return;
      const key = String(movie.rating);
      const bucket = buckets.find((entry) => entry.rating === key);
      if (bucket) {
        bucket.count += 1;
      }
    });

    return buckets;
  }, [movieLogs]);

  const ratedMovies = useMemo(() => movieLogs.filter((movie) => movie.rating !== undefined), [movieLogs]);

  const averageRating = useMemo(() => {
    if (ratedMovies.length === 0) return 0;
    return ratedMovies.reduce((sum, movie) => sum + (movie.rating || 0), 0) / ratedMovies.length;
  }, [ratedMovies]);

  const mostCommonRating = useMemo(() => {
    if (ratedMovies.length === 0) return '-';
    return ratingData.reduce((prev, current) => (prev.count > current.count ? prev : current)).rating;
  }, [ratedMovies, ratingData]);

  return {
    totalMovies: movieLogs.length,
    averageRating,
    mostCommonRating,
    ratingData,
  };
}

