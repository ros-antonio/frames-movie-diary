import { Prisma } from '@prisma/client';
import { prisma } from '../repositories/prismaClient.js';
import type { ListOverlapStatistic } from '../types.js';

class StatisticsService {
  private overlapOrderingSql = Prisma.sql`
    ORDER BY
      "sharedMovieCount" DESC,
      "similarityScore" DESC,
      "userEmail" ASC,
      "listAName" ASC,
      "listBName" ASC
  `;

  private canonicalListOrderingSql = Prisma.sql`
    (
      "listA"."name" < "listB"."name"
      OR ("listA"."name" = "listB"."name" AND "listA".id < "listB".id)
    )
  `;

  async getOverview(userId: string, role: string) {
    const whereClause = role === 'ADMIN' ? {} : { userId };

    const [totalMovies, ratedMovies, totalFrames, moviesWithFrames, ratingAggregate, groupedRatings] = await Promise.all([
      prisma.movie.count({ where: whereClause }),
      prisma.movie.count({
        where: {
          ...whereClause,
          rating: {
            not: null,
          },
        },
      }),
      prisma.frame.count({
        where: {
          movie: whereClause,
        },
      }),
      prisma.movie.count({
        where: {
          ...whereClause,
          frames: {
            some: {},
          },
        },
      }),
      prisma.movie.aggregate({
        where: whereClause,
        _avg: {
          rating: true,
        },
      }),
      prisma.movie.groupBy({
        by: ['rating'],
        where: {
          ...whereClause,
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

  async getTopListOverlaps(limit = 20): Promise<ListOverlapStatistic[]> {
    const safeLimit = Math.max(1, Math.min(limit, 100));

    return prisma.$queryRaw<ListOverlapStatistic[]>(Prisma.sql`
      WITH "list_sizes" AS (
        SELECT
          "listId",
          COUNT(*)::int AS "movieCount"
        FROM "ListMovie"
        GROUP BY "listId"
      ),
      "list_overlaps" AS (
        SELECT
          "listA"."userId" AS "userId",
          "leftEntry"."listId" AS "listAId",
          "rightEntry"."listId" AS "listBId",
          COUNT(*)::int AS "sharedMovieCount"
        FROM "ListMovie" AS "leftEntry"
        INNER JOIN "CustomList" AS "listA"
          ON "listA".id = "leftEntry"."listId"
        INNER JOIN "ListMovie" AS "rightEntry"
          ON "rightEntry"."movieId" = "leftEntry"."movieId"
         AND "rightEntry"."listId" > "leftEntry"."listId"
        INNER JOIN "CustomList" AS "listB"
          ON "listB".id = "rightEntry"."listId"
         AND "listB"."userId" = "listA"."userId"
        GROUP BY "listA"."userId", "leftEntry"."listId", "rightEntry"."listId"
      )
      SELECT
        "list_overlaps"."userId" AS "userId",
        "owner"."name" AS "userName",
        "owner"."email" AS "userEmail",
        CASE
          WHEN ${this.canonicalListOrderingSql} THEN "listA".id
          ELSE "listB".id
        END AS "listAId",
        CASE
          WHEN ${this.canonicalListOrderingSql} THEN "listA"."name"
          ELSE "listB"."name"
        END AS "listAName",
        CASE
          WHEN ${this.canonicalListOrderingSql} THEN "list_size_a"."movieCount"
          ELSE "list_size_b"."movieCount"
        END AS "listAMovieCount",
        CASE
          WHEN ${this.canonicalListOrderingSql} THEN "listB".id
          ELSE "listA".id
        END AS "listBId",
        CASE
          WHEN ${this.canonicalListOrderingSql} THEN "listB"."name"
          ELSE "listA"."name"
        END AS "listBName",
        CASE
          WHEN ${this.canonicalListOrderingSql} THEN "list_size_b"."movieCount"
          ELSE "list_size_a"."movieCount"
        END AS "listBMovieCount",
        "list_overlaps"."sharedMovieCount" AS "sharedMovieCount",
        ROUND(
          (
            "list_overlaps"."sharedMovieCount"::numeric
            / NULLIF(
              ("list_size_a"."movieCount" + "list_size_b"."movieCount" - "list_overlaps"."sharedMovieCount")::numeric,
              0
            )
          ),
          4
        )::float AS "similarityScore"
      FROM "list_overlaps"
      INNER JOIN "CustomList" AS "listA"
        ON "listA".id = "list_overlaps"."listAId"
      INNER JOIN "CustomList" AS "listB"
        ON "listB".id = "list_overlaps"."listBId"
      INNER JOIN "list_sizes" AS "list_size_a"
        ON "list_size_a"."listId" = "listA".id
      INNER JOIN "list_sizes" AS "list_size_b"
        ON "list_size_b"."listId" = "listB".id
      INNER JOIN "User" AS "owner"
        ON "owner".id = "list_overlaps"."userId"
      ${this.overlapOrderingSql}
      LIMIT ${safeLimit}
    `);
  }

  async getTopListOverlapsNaive(limit = 20): Promise<ListOverlapStatistic[]> {
    const safeLimit = Math.max(1, Math.min(limit, 100));

    return prisma.$queryRaw<ListOverlapStatistic[]>(Prisma.sql`
      SELECT
        "listA"."userId" AS "userId",
        "owner"."name" AS "userName",
        "owner"."email" AS "userEmail",
        CASE
          WHEN ${this.canonicalListOrderingSql} THEN "listA".id
          ELSE "listB".id
        END AS "listAId",
        CASE
          WHEN ${this.canonicalListOrderingSql} THEN "listA"."name"
          ELSE "listB"."name"
        END AS "listAName",
        CASE
          WHEN ${this.canonicalListOrderingSql} THEN (
            SELECT COUNT(*)::int
            FROM "ListMovie" AS "listACount"
            WHERE "listACount"."listId" = "listA".id
          )
          ELSE (
            SELECT COUNT(*)::int
            FROM "ListMovie" AS "listBCount"
            WHERE "listBCount"."listId" = "listB".id
          )
        END AS "listAMovieCount",
        CASE
          WHEN ${this.canonicalListOrderingSql} THEN "listB".id
          ELSE "listA".id
        END AS "listBId",
        CASE
          WHEN ${this.canonicalListOrderingSql} THEN "listB"."name"
          ELSE "listA"."name"
        END AS "listBName",
        CASE
          WHEN ${this.canonicalListOrderingSql} THEN (
            SELECT COUNT(*)::int
            FROM "ListMovie" AS "listBCount"
            WHERE "listBCount"."listId" = "listB".id
          )
          ELSE (
            SELECT COUNT(*)::int
            FROM "ListMovie" AS "listACount"
            WHERE "listACount"."listId" = "listA".id
          )
        END AS "listBMovieCount",
        COUNT(*)::int AS "sharedMovieCount",
        ROUND(
          (
            COUNT(*)::numeric /
            NULLIF(
              (
                (
                  SELECT COUNT(*)::int
                  FROM "ListMovie" AS "listAUnionCount"
                  WHERE "listAUnionCount"."listId" = "listA".id
                ) +
                (
                  SELECT COUNT(*)::int
                  FROM "ListMovie" AS "listBUnionCount"
                  WHERE "listBUnionCount"."listId" = "listB".id
                ) -
                COUNT(*)
              )::numeric,
              0
            )
          ),
          4
        )::float AS "similarityScore"
      FROM "ListMovie" AS "leftEntry"
      INNER JOIN "ListMovie" AS "rightEntry"
        ON "rightEntry"."movieId" = "leftEntry"."movieId"
       AND "rightEntry"."listId" > "leftEntry"."listId"
      INNER JOIN "CustomList" AS "listA"
        ON "listA".id = "leftEntry"."listId"
      INNER JOIN "CustomList" AS "listB"
        ON "listB".id = "rightEntry"."listId"
       AND "listB"."userId" = "listA"."userId"
      INNER JOIN "User" AS "owner"
        ON "owner".id = "listA"."userId"
      GROUP BY
        "listA"."userId",
        "owner"."name",
        "owner"."email",
        "listA".id,
        "listA"."name",
        "listB".id,
        "listB"."name"
      ${this.overlapOrderingSql}
      LIMIT ${safeLimit}
    `);
  }
}

export const statisticsService = new StatisticsService();
