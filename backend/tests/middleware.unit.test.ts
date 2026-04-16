import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler.js';
import { validate } from '../src/middleware/validate.js';
import { HttpError } from '../src/utils/httpError.js';

function createMockResponse() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { status, json };
}

describe('middleware', () => {
  it('returns not found payload for unknown routes', () => {
    const res = createMockResponse();

    notFoundHandler({} as never, res as never);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Route not found' });
  });

  it('formats HttpError responses', () => {
    const res = createMockResponse();

    errorHandler(new HttpError(418, 'teapot'), {} as never, res as never, vi.fn());

    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith({ message: 'teapot' });
  });

  it('formats generic status errors with details', () => {
    const res = createMockResponse();

    errorHandler(
      { statusCode: 400, message: 'Validation failed', details: [{ field: 'name' }] },
      {} as never,
      res as never,
      vi.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Validation failed',
      details: [{ field: 'name' }],
    });
  });

  it('falls back to 500 for unknown errors', () => {
    const res = createMockResponse();

    errorHandler('boom', {} as never, res as never, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
  });

  it('passes through non-Zod exceptions from validate middleware', () => {
    const schema = {
      parse: () => {
        throw new Error('schema crashed');
      },
    };

    const next = vi.fn();
    const middleware = validate(schema as unknown as z.ZodType<unknown>, 'body');

    middleware({ body: {} } as never, {} as never, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect((next.mock.calls[0][0] as Error).message).toBe('schema crashed');
  });
});

