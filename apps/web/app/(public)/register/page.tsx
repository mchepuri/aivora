import Link from 'next/link';

const fieldClass =
  'mt-1.5 w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[15px] text-ink shadow-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent';

export default function RegisterPage() {
  return (
    <section className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
      <h1 className="text-center text-[28px] font-semibold tracking-tight text-ink">
        Create your account
      </h1>
      <p className="mt-2 text-center text-[15px] text-muted">
        Start your free trial. No credit card required.
      </p>

      <form className="mt-8 space-y-4">
        <div>
          <label htmlFor="name" className="block text-[13px] font-medium text-ink">
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Jane Cooper"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-[13px] font-medium text-ink">
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-[13px] font-medium text-ink">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className={fieldClass}
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-full bg-ink px-4 py-2.5 text-[15px] font-medium text-white transition hover:bg-ink/85"
        >
          Create account
        </button>
      </form>

      <p className="mt-6 text-center text-[14px] text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </section>
  );
}
