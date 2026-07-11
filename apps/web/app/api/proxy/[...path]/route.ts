import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const BODYLESS_METHODS = new Set(['GET', 'HEAD']);

// Same-origin proxy for client components. The browser calls this route directly (no
// cross-domain request involved), and this server-side handler attaches the httpOnly
// aivora_token cookie before forwarding to the real API. See apiClient.ts for why this
// exists: that cookie is scoped to this app's own domain and is never sent cross-domain.
async function forward(req: NextRequest, path: string[]): Promise<NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get('aivora_token')?.value;

  const targetUrl = `${API_BASE_URL}/${path.join('/')}${req.nextUrl.search}`;

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Cookie: `aivora_token=${token}` } : {}),
      },
      body: BODYLESS_METHODS.has(req.method) ? undefined : await req.text(),
    });
  } catch {
    return NextResponse.json(
      { message: 'Could not reach the API. Check your connection and try again.' },
      { status: 502 },
    );
  }

  if (upstream.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
  });
}

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  return forward(req, (await params).path);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return forward(req, (await params).path);
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return forward(req, (await params).path);
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  return forward(req, (await params).path);
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return forward(req, (await params).path);
}
