import { devLoginSchema } from '@bnw/shared';
import { Controller, Get, HttpCode, Injectable, Logger, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError, notFound } from '../common/errors';
import { AuthUser, CurrentUser, Public, ZBody } from '../common/http';
import { devLoginEnabled, env, googleConfigured } from '../config/env';
import { PrismaService } from '../core/prisma.service';
import { RedisService } from '../core/redis.service';
import { GoogleAuthService } from './google.service';
import { SessionService } from './session.service';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find the user by provider id (Google `sub`, not email — email can change), or create one.
   * A Google sign-in links to an existing account with the same verified email.
   */
  async findOrCreate(provider: string, providerUserId: string, profile: { email: string; name: string; picture: string | null }) {
    const identity = await this.prisma.userIdentity.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
      include: { user: true },
    });
    const isAdmin = env().ADMIN_EMAILS.includes(profile.email);

    if (identity?.user.suspendedAt) throw new AppError(403, 'ACCOUNT_SUSPENDED', 'This account has been deactivated. Contact support if you think this is a mistake.');
    if (identity && !identity.user.deletedAt) {
      if (isAdmin && !identity.user.isAdmin) {
        return this.prisma.user.update({ where: { id: identity.user.id }, data: { isAdmin: true } });
      }
      return identity.user;
    }

    const existing = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (existing?.suspendedAt) throw new AppError(403, 'ACCOUNT_SUSPENDED', 'This account has been deactivated. Contact support if you think this is a mistake.');
    if (existing && !existing.deletedAt) {
      await this.prisma.userIdentity.create({ data: { userId: existing.id, provider, providerUserId } });
      return existing;
    }

    return this.prisma.user.create({
      data: {
        email: profile.email,
        displayName: profile.name.slice(0, 60),
        avatarUrl: profile.picture,
        isAdmin,
        identities: { create: { provider, providerUserId } },
        settings: { create: {} },
      },
    });
  }
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger('Auth');

  constructor(
    private readonly google: GoogleAuthService,
    private readonly sessions: SessionService,
    private readonly accounts: AccountService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get('config')
  config() {
    return { google: googleConfigured(), devLogin: devLoginEnabled() };
  }

  @Public()
  @Get('google')
  async start(@Req() req: Request, @Res() res: Response) {
    if (!googleConfigured()) {
      res.redirect(`${env().WEB_ORIGIN}/login?error=google_not_configured`);
      return;
    }
    await this.redis.rateLimit(`signin:${req.ip}`, 30, 60);
    res.redirect(await this.google.authorizationUrl());
  }

  @Public()
  @Get('google/callback')
  async callback(@Query() query: Record<string, string>, @Req() req: Request, @Res() res: Response) {
    const web = env().WEB_ORIGIN;
    try {
      await this.redis.rateLimit(`signin:${req.ip}`, 30, 60);
      if (query.error || !query.code || !query.state) throw new AppError(400, 'OAUTH_DENIED', 'Sign-in was cancelled');
      const profile = await this.google.handleCallback(query.code, query.state);
      const user = await this.accounts.findOrCreate('google', profile.sub, profile);
      this.sessions.setCookies(res, await this.sessions.create(user.id));
      res.redirect(`${web}${user.onboardedAt ? '/home' : '/onboarding'}`);
    } catch (e) {
      const code = e instanceof AppError ? e.code.toLowerCase() : 'signin_failed';
      if (!(e instanceof AppError)) this.logger.error(e instanceof Error ? e.stack : String(e));
      res.redirect(`${web}/login?error=${code}`);
    }
  }

  /** Dev-only email sign-in for local work without Google credentials. Disabled in production. */
  @Public()
  @Post('dev-login')
  @HttpCode(200)
  async devLogin(@ZBody(devLoginSchema) body: z.infer<typeof devLoginSchema>, @Res({ passthrough: true }) res: Response) {
    if (!devLoginEnabled()) throw notFound('Route');
    const email = body.email.toLowerCase();
    const user = await this.accounts.findOrCreate('dev', email, {
      email,
      name: body.displayName ?? email.split('@')[0],
      picture: null,
    });
    this.sessions.setCookies(res, await this.sessions.create(user.id));
    return { ok: true, onboarded: Boolean(user.onboardedAt) };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    await this.sessions.destroy(user.sessionId, user.id);
    this.sessions.clearCookies(res);
    return { ok: true };
  }

  @Post('logout-all')
  @HttpCode(200)
  async logoutAll(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    await this.sessions.destroyAll(user.id);
    this.sessions.clearCookies(res);
    return { ok: true };
  }
}
