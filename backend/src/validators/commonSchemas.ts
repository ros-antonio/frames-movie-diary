import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const uuidParamSchema = z.object({
  id: z.uuid(),
});

export const movieIdParamSchema = z.object({
  movieId: z.uuid(),
});

export const listIdParamSchema = z.object({
  listId: z.uuid(),
});

export const frameIdParamSchema = z.object({
  frameId: z.uuid(),
});

export const movieFrameParamsSchema = z.object({
  movieId: z.uuid(),
  frameId: z.uuid(),
});

export const listMovieParamsSchema = z.object({
  listId: z.uuid(),
  movieId: z.uuid(),
});

