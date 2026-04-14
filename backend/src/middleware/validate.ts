import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodType } from 'zod';

export function validate<T>(schema: ZodType<T>, source: 'body' | 'query' | 'params'): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed as Request[typeof source];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next({
          statusCode: 400,
          message: 'Validation failed',
          details: error.issues,
        });
        return;
      }

      next(error);
    }
  };
}

