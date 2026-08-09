'use client';

import { useState, useTransition } from 'react';
import { TextInput } from '@/lib/astryxCompat';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@/components/ui/Button';
import { registerAction } from './actions';

export function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await registerAction(name, email, password);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      {error && <Banner status="error" title={error} />}
      <TextInput
        label="Full name"
        htmlName="name"
        autoComplete="name"
        placeholder="Jane Cooper"
        value={name}
        onChange={setName}
        isRequired
        isDisabled={isPending}
      />
      <TextInput
        label="Work email"
        type="email"
        htmlName="email"
        autoComplete="email"
        placeholder="you@company.com"
        value={email}
        onChange={setEmail}
        isRequired
        isDisabled={isPending}
      />
      <TextInput
        label="Password"
        type="password"
        htmlName="password"
        autoComplete="new-password"
        placeholder="••••••••"
        value={password}
        onChange={setPassword}
        isRequired
        isDisabled={isPending}
      />
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
