const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@bnw/shared'],
  poweredByHeader: false,
  images: { unoptimized: true },
  // The browser talks to one origin: /api/* and /auth/* are proxied to the NestJS API,
  // so the session cookie is first-party. WebSockets connect to the API directly.
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_URL}/:path*` },
      { source: '/auth/:path*', destination: `${API_URL}/auth/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
