import Link from 'next/link';
import { RegisterForm } from './RegisterForm';

export default function RegisterPage() {
  return (
    <section className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
      <h1 className="text-center text-[28px] font-semibold tracking-tight text-ink">
        Create your account
      </h1>
      <p className="mt-2 text-center text-[15px] text-muted">
        Start your free trial. No credit card required.
      </p>

      <RegisterForm />

      <p className="mt-6 text-center text-[14px] text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </section>
  );
}
