import Link from 'next/link';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  return (
    <section className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
      <h1 className="text-center text-[28px] font-semibold tracking-tight text-ink">
        Sign in to Aivora
      </h1>
      <p className="mt-2 text-center text-[15px] text-muted">
        Welcome back. Enter your details to continue.
      </p>

      <form className="mt-8 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-[14px] text-muted">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Sign up
        </Link>
      </p>
    </section>
  );
}
