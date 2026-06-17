import Link from 'next/link';
import { LoginForm } from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl = '/dashboard' } = await searchParams;

  return (
    <section className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
      <h1 className="text-center text-[28px] font-semibold tracking-tight text-ink">
        Sign in to Aivora
      </h1>
      <p className="mt-2 text-center text-[15px] text-muted">
        Welcome back. Enter your details to continue.
      </p>

      <LoginForm callbackUrl={callbackUrl} />

      <p className="mt-6 text-center text-[14px] text-muted">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Sign up
        </Link>
      </p>
    </section>
  );
}
