// Browser calls use a relative "/api" (NEXT_PUBLIC_API_URL) so the request stays same-origin —
// next.config.js rewrites it to the real API, which is what lets the httpOnly aivora_token
// cookie ride along automatically via credentials: 'include'.
// Server calls (Server Components/Actions) have no page origin, so fetch needs an absolute
// URL — built from API_ORIGIN — and the cookie has to be attached to the request manually.
const BROWSER_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const SERVER_BASE_URL = `${process.env.API_ORIGIN ?? 'http://localhost:3001'}/api`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const token = cookieStore.get('aivora_token')?.value;
  return token ? { Cookie: `aivora_token=${token}` } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isBrowser = typeof window !== 'undefined';
  const baseUrl = isBrowser ? BROWSER_BASE_URL : SERVER_BASE_URL;
  const authHeaders = isBrowser ? {} : await getAuthHeaders();

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
