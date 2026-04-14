import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/httpError.js';

interface ErrorWithStatus {
  statusCode: number;
  message: string;
  details?: unknown;
}

function isErrorWithStatus(error: unknown): error is ErrorWithStatus {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as Record<string, unknown>;
  return (
    typeof candidate.statusCode === 'number'
    && typeof candidate.message === 'string'
  );
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ message: 'Route not found' });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  if (isErrorWithStatus(error)) {
    res.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
    return;
  }

  res.status(500).json({
    message: 'Internal server error',
  });
}

