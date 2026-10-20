import { Body, createParamDecorator, ExecutionContext, PipeTransform, Query, SetMetadata } from '@nestjs/common';
import type { ZodTypeAny } from 'zod';
import { AppError } from './errors';

export class ZodPipe implements PipeTransform {
  constructor(private readonly schema: ZodTypeAny) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value ?? {});
    if (!result.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid', result.error.flatten());
    }
    return result.data;
  }
}

/** Validated request body. */
export const ZBody = (schema: ZodTypeAny) => Body(new ZodPipe(schema));
/** Validated query string. */
export const ZQuery = (schema: ZodTypeAny) => Query(new ZodPipe(schema));

export const IS_PUBLIC = 'isPublic';
/** Route works without a session; the user is still attached if signed in. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const IS_ADMIN = 'isAdmin';
/** Route requires a site admin (moderation). */
export const AdminOnly = () => SetMetadata(IS_ADMIN, true);

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  city: string | null;
  createdAt: Date;
  sessionId: string;
}

/** The signed-in user. On @Public() routes this may be undefined. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser | undefined => ctx.switchToHttp().getRequest().user,
);

export interface Paged<T> {
  items: T[];
  nextCursor: string | null;
}

/** Callers fetch limit + 1 rows; this trims the extra row and returns the next cursor. */
export function toPage<T extends { id: string }, R>(rows: T[], limit: number, map: (row: T) => R): Paged<R> {
  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  return { items: slice.map(map), nextCursor: hasMore ? slice[slice.length - 1].id : null };
}

export const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
