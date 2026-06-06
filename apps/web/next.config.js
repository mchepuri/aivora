/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@aivora/shared'],

  // In production on Vercel, NEXT_PUBLIC_API_URL is set to "/api" (relative).
  // Next.js rewrites proxy /api/* to the NestJS API deployment so the browser
  // never makes cross-origin requests.
  async rewrites() {
    const apiOrigin = process.env.API_ORIGIN;
    if (!apiOrigin) return [];
    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
