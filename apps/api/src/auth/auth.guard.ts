import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppError, forbidden, unauthenticated } from '../common/errors';
import { AuthUser, IS_ADMIN, IS_PUBLIC } from '../common/http';
import { PrismaService } from '../core/prisma.service';
import { SessionService } from './session.service';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Global guard: attaches the signed-in user from the session cookie, requires a session on
 * non-public routes, and requires the CSRF header on every state-changing request.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'http') return true;
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser; csrf?: string }>();
    const targets = [ctx.getHandler(), ctx.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets);
    const adminOnly = this.reflector.getAllAndOverride<boolean>(IS_ADMIN, targets);

    const sid: string | undefined = req.cookies?.sid;
    if (sid) {
      const session = await this.sessions.get(sid);
      if (session) {
        const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
        if (user && !user.deletedAt) {
          req.user = {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            isAdmin: user.isAdmin,
            city: user.city,
            createdAt: user.createdAt,
            sessionId: sid,
          };
          req.csrf = session.csrf;
          void this.sessions.touch(sid, user.id);
        }
      }
    }

    if (!req.user) {
      if (isPublic) return true;
      throw unauthenticated();
    }
    if (!SAFE_METHODS.has(req.method) && req.header('x-csrf-token') !== req.csrf) {
      throw new AppError(403, 'CSRF', 'Missing or invalid CSRF token. Refresh the page and try again.');
    }
    if (adminOnly && !req.user.isAdmin) throw forbidden('Admins only');
    return true;
  }
}
