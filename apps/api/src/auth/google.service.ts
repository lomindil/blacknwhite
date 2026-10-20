import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AppError } from '../common/errors';
import { env } from '../config/env';
import { RedisService } from '../core/redis.service';

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
}

export const googleRedirectUri = () => `${env().WEB_ORIGIN}/auth/google/callback`;

/** OAuth 2.0 Authorization Code flow with PKCE (docs/architecture.md §4). */
@Injectable()
export class GoogleAuthService {
  constructor(private readonly redis: RedisService) {}

  async authorizationUrl(): Promise<string> {
    const state = randomBytes(24).toString('base64url');
    const verifier = randomBytes(48).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    await this.redis.client.set(`oauth:${state}`, verifier, 'EX', 600);

    const params = new URLSearchParams({
      client_id: env().GOOGLE_CLIENT_ID!,
      redirect_uri: googleRedirectUri(),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async handleCallback(code: string, state: string): Promise<GoogleProfile> {
    const verifier = await this.redis.client.getdel(`oauth:${state}`);
    if (!verifier) throw new AppError(400, 'OAUTH_STATE', 'Sign-in expired. Please try again.');

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env().GOOGLE_CLIENT_ID!,
        client_secret: env().GOOGLE_CLIENT_SECRET!,
        redirect_uri: googleRedirectUri(),
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!tokenRes.ok) throw new AppError(400, 'OAUTH_EXCHANGE', 'Google sign-in failed. Please try again.');
    const { id_token } = (await tokenRes.json()) as { id_token?: string };
    if (!id_token) throw new AppError(400, 'OAUTH_EXCHANGE', 'Google did not return an ID token');

    // We keep only identity; Google access/refresh tokens are discarded.
    const { payload } = await jwtVerify(id_token, GOOGLE_JWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: env().GOOGLE_CLIENT_ID!,
    });
    if (!payload.sub || typeof payload.email !== 'string' || payload.email_verified !== true) {
      throw new AppError(400, 'OAUTH_EMAIL', 'Your Google account email is not verified');
    }
    return {
      sub: payload.sub,
      email: payload.email.toLowerCase(),
      name: typeof payload.name === 'string' ? payload.name : payload.email.split('@')[0],
      picture: typeof payload.picture === 'string' ? payload.picture : null,
    };
  }
}
