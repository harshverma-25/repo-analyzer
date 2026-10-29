import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import type { ApiResponse } from '@repo-analyzer/shared';

export function errorHandler(
  err: any,
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
) {
  const requestId = (req.headers['x-request-id'] as string) || Math.random().toString(36).substring(7);

  console.error(`[Error] [Req: ${requestId}] ${req.method} ${req.url}:`, err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: err.errors,
      },
    });
  }

  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';

  return res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      code: err.code || (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR'),
      message: process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'An unexpected error occurred.'
        : message,
    },
  });
}
