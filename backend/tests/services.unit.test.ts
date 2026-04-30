import { describe, expect, it, vi } from 'vitest';
import { movieService } from '../src/services/movieService.js';
import { prisma } from '../src/repositories/prismaClient.js';
import { HttpError } from '../src/utils/httpError.js';

// Mock the Prisma Client
vi.mock('../src/repositories/prismaClient.js', () => ({
  prisma: {
    movie: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Service Race Conditions', () => {
  it('throws 404 if Prisma throws P2025 during update', async () => {
    // 1. Trick the service into thinking the movie exists during the first check
    vi.mocked(prisma.movie.findUnique).mockResolvedValueOnce({ userId: 'user-1' } as any);

    // 2. Force Prisma to throw a P2025 error during the actual update
    vi.mocked(prisma.movie.update).mockRejectedValueOnce({ code: 'P2025' });

    // 3. Verify the service catches it and transforms it to an HttpError
    await expect(
      movieService.update('movie-1', { movieName: 'Test', watchDate: '2025-01-01' }, 'user-1')
    ).rejects.toThrowError(new HttpError(404, 'Movie not found'));
  });
});