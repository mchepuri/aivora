'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function registerAction(
  name: string,
  email: string,
  password: string,
): Promise<{ error: string } | void> {
  // Server Actions always run server-side, so this needs the absolute API_ORIGIN — a relative
  // NEXT_PUBLIC_API_URL (used by browser-side calls) has no page origin to resolve against here.
  const API_BASE_URL = `${process.env.API_ORIGIN ?? 'http://localhost:3001'}/api`;
  let data: { accessToken: string };
  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const body = (await res.json()) as { message?: string | string[] };
      const msg = Array.isArray(body.message)
        ? body.message.join('; ')
        : (body.message ?? 'Registration failed. Please try again.');
      return { error: msg };
    }

    data = (await res.json()) as { accessToken: string };
  } catch {
    return { error: 'Could not reach the server. Check your connection and try again.' };
  }

  const cookieStore = await cookies();
  cookieStore.set('aivora_token', data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect('/dashboard');
}
