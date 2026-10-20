import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { ZodError } from 'zod';

/** All API errors use the shape { code, message, details }. */
export class AppError extends HttpException {
  constructor(
    status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super({ code, message, details }, status);
  }
}

export const notFound = (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found`);
export const forbidden = (message = "You don't have access to this") => new AppError(403, 'FORBIDDEN', message);
export const badRequest = (message: string, details?: unknown) => new AppError(400, 'BAD_REQUEST', message, details);
export const conflict = (message: string, details?: unknown) => new AppError(409, 'CONFLICT', message, details);
export const unauthenticated = () => new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue');
export const tooManyRequests = (message = 'Too many requests. Please slow down.') =>
  new AppError(429, 'RATE_LIMITED', message);

const codeForStatus: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'RATE_LIMITED',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errors');

  catch(ex: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') return;
    const res = host.switchToHttp().getResponse<Response>();

    if (ex instanceof AppError) {
      res.status(ex.getStatus()).json(ex.getResponse());
      return;
    }
    if (ex instanceof ZodError) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Some fields are invalid', details: ex.flatten() });
      return;
    }
    if (ex instanceof HttpException) {
      const status = ex.getStatus();
      const body = ex.getResponse();
      const message =
        typeof body === 'string' ? body : Array.isArray((body as any).message) ? (body as any).message.join(', ') : (body as any).message;
      res.status(status).json({ code: codeForStatus[status] ?? 'ERROR', message: message ?? ex.message });
      return;
    }
    if (ex instanceof Prisma.PrismaClientKnownRequestError) {
      if (ex.code === 'P2025') {
        res.status(404).json({ code: 'NOT_FOUND', message: 'Not found' });
        return;
      }
      if (ex.code === 'P2002') {
        res.status(409).json({ code: 'CONFLICT', message: 'That already exists', details: ex.meta });
        return;
      }
    }
    this.logger.error(ex instanceof Error ? ex.stack : String(ex));
    res.status(500).json({ code: 'INTERNAL', message: 'Something went wrong on our side' });
  }
}
