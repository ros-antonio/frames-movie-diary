import { store } from '../repositories/inMemoryStore.js';

class StatisticsService {
  getOverview() {
    const movies = Array.from(store.movies.values());
    const ratedMovies = movies.filter((movie) => typeof movie.rating === 'number');
    const ratings = ratedMovies
      .map((movie) => movie.rating)
      .filter((rating): rating is number => typeof rating === 'number');

    const totalFrames = movies.reduce((acc, movie) => acc + movie.frames.length, 0);
    const ratingDistribution: Record<string, number> = {
      '0.5': 0,
      '1': 0,
      '1.5': 0,
      '2': 0,
      '2.5': 0,
      '3': 0,
      '3.5': 0,
      '4': 0,
      '4.5': 0,
      '5': 0,
    };

    for (const value of ratings) {
      const normalized = Math.round(value * 2) / 2;
      const key = String(normalized);
      if (ratingDistribution[key] !== undefined) {
        ratingDistribution[key] += 1;
      }
    }

    return {
      totalMovies: movies.length,
      ratedMovies: ratedMovies.length,
      unratedMovies: movies.length - ratedMovies.length,
      averageRating: ratings.length > 0 ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)) : null,
      totalFrames,
      moviesWithFrames: movies.filter((movie) => movie.frames.length > 0).length,
      topRatedMovies: ratedMovies
        .slice()
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        .slice(0, 5)
        .map((movie) => ({
          id: movie.id,
          movieName: movie.movieName,
          rating: movie.rating,
        })),
      ratingDistribution,
    };
  }
}

export const statisticsService = new StatisticsService();

