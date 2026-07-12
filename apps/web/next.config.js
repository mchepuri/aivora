const stylexPlugin = require('@stylexswc/nextjs-plugin');

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

// Compiles our own stylex.create() calls (e.g. Astryx `xstyle` prop overrides)
// via the SWC pipeline, so `next dev`/`next build` never fall back to Babel.
// Astryx's own pre-built components already ship compiled CSS (imported in
// globals.css) and don't need this — this only covers StyleX we author.
module.exports = stylexPlugin({
  rsOptions: {
    dev: process.env.NODE_ENV !== 'production',
    include: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'theme/**/*.{ts,tsx}'],
    exclude: ['**/*.test.*', '**/*.spec.*', 'app/api/**'],
  },
})(nextConfig);
