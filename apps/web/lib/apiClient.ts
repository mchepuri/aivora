const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// aivora_token is an httpOnly cookie scoped to this web app's own domain. In production the API
// lives on a different domain (e.g. aivora-web.vercel.app vs aivora-api.vercel.app), so a browser
// request straight to the API would never carry it. Client components therefore go through the
// same-origin proxy at app/api/proxy/[...path]/route.ts, which runs server-side, reads the cookie,
// and forwards it to the real API. Server Components/Actions/Route Handlers call the API directly
// and forward the cookie themselves via getAuthHeaders() below.
const BROWSER_PROXY_BASE_URL = '/api/proxy';

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const token = cookieStore.get('aivora_token')?.value;
    if (token) return { Cookie: `aivora_token=${token}` };
  } catch {
    // Not a server context — the proxy route (same origin) will read the cookie itself.
  }
  return {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isBrowser = typeof window !== 'undefined';
  const authHeaders = isBrowser ? {} : await getAuthHeaders();
  const baseUrl = isBrowser ? BROWSER_PROXY_BASE_URL : API_BASE_URL;

  const res = await fetch(`${baseUrl}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: 'DELETE' }),
};
