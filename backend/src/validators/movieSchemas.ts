import { z } from 'zod';

const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^(?:\d{1,2}:)?[0-5]\d:[0-5]\d$/;
const pngDataUrlRegex = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
const maxFrameImageUrlLength = 9_000_000;

function isDateNotInFuture(value: string): boolean {
  if (!dateOnlyRegex.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  return value <= todayIso;
}

const movieLinkSchema = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => /^(https?:\/\/|magnet:)/.test(value), {
    message: 'movieLink must start with https://, http://, or magnet:',
  });

export const createMovieSchema = z.object({
  movieName: z.string().trim().min(1).max(255),
  watchDate: z.string().refine(isDateNotInFuture, {
    message: 'watchDate must be in YYYY-MM-DD format and not in the future',
  }),
  rating: z.number().min(0.5).max(5).optional(),
  review: z.string().trim().max(1000).optional(),
  movieLink: movieLinkSchema.optional(),
});

export const updateMovieSchema = createMovieSchema;

export const createFrameSchema = z.object({
  imageUrl: z.string().trim().min(1).max(maxFrameImageUrlLength).regex(pngDataUrlRegex, {
    message: 'imageUrl must be a PNG data URL',
  }),
  timestamp: z.string().trim().regex(timeRegex, {
    message: 'timestamp must be MM:SS or HH:MM:SS',
  }),
  caption: z.string().trim().min(1).max(200),
});

