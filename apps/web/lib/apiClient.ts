const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const token = cookieStore.get('aivora_token')?.value;
    if (token) return { Cookie: `aivora_token=${token}` };
  } catch {
    // Not a server context — the browser will send aivora_token via credentials: 'include' below.
  }
  return {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    // Auth is httpOnly-cookie-based (aivora_token). NEXT_PUBLIC_API_URL is a relative "/api" in
    // production, so this resolves same-origin and is handled by the rewrite in next.config.js,
    // which proxies to the real API — this is what keeps the cookie same-origin end to end.
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
