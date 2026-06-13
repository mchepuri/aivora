import { type ComponentPropsWithoutRef } from 'react';

type InputProps = ComponentPropsWithoutRef<'input'>;

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`mt-1.5 w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[15px] text-ink shadow-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent ${className}`}
      {...props}
    />
  );
}
