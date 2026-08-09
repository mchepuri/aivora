import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = new Set(['/', '/login', '/register']);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('aivora_token')?.value;
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Excludes Next.js internals and `api/` paths. The `api/` exclusion is
  // intentional: those paths are server-side proxy handlers that authenticate
  // via the NestJS JWT guard, not this middleware cookie check.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
