'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Server Actions always run server-side, so this needs the absolute API_ORIGIN — a relative
// NEXT_PUBLIC_API_URL (used by browser-side calls) has no page origin to resolve against here.
const API_BASE_URL = `${process.env.API_ORIGIN ?? 'http://localhost:3001'}/api`;

export async function loginAction(
  email: string,
  password: string,
  callbackUrl: string,
): Promise<{ error: string } | void> {
  let data: { accessToken: string } | undefined;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { error: (body as { message?: string }).message ?? 'Invalid email or password' };
    }

    data = await res.json();
  } catch {
    return { error: 'Unable to reach the server. Please try again.' };
  }

  if (!data?.accessToken) {
    return { error: 'Unexpected response from server. Please try again.' };
  }

  const cookieStore = await cookies();
  cookieStore.set('aivora_token', data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  const safeUrl = callbackUrl?.startsWith('/') ? callbackUrl : '/dashboard';
  redirect(safeUrl);
}

export async function logoutAction(): Promise<never> {
  const cookieStore = await cookies();
  cookieStore.delete('aivora_token');
  redirect('/login');
}
