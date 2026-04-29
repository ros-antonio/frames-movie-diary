import { prisma } from '../repositories/prismaClient.js';

class StatisticsService {
  async getOverview() {
    const [totalMovies, ratedMovies, totalFrames, moviesWithFrames, ratingAggregate, groupedRatings] = await Promise.all([
      prisma.movie.count(),
      prisma.movie.count({
        where: {
          rating: {
            not: null,
          },
        },
      }),
      prisma.frame.count(),
      prisma.movie.count({
        where: {
          frames: {
            some: {},
          },
        },
      }),
      prisma.movie.aggregate({
        _avg: {
          rating: true,
        },
      }),
      prisma.movie.groupBy({
        by: ['rating'],
        where: {
          rating: {
            not: null,
          },
        },
        _count: {
          _all: true,
        },
      }),
    ]);

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

    for (const row of groupedRatings) {
      if (row.rating === null) {
        continue;
      }

      const normalized = Math.round(row.rating * 2) / 2;
      const key = String(normalized);
      if (ratingDistribution[key] !== undefined) {
        ratingDistribution[key] = row._count._all;
      }
    }

    const average = ratingAggregate._avg.rating;

    return {
      totalMovies,
      ratedMovies,
      unratedMovies: totalMovies - ratedMovies,
      averageRating: average === null ? null : Number(average.toFixed(2)),
      totalFrames,
      moviesWithFrames,
      ratingDistribution,
    };
  }
}

export const statisticsService = new StatisticsService();

