import { type ComponentPropsWithoutRef } from 'react';

type Variant = 'primary' | 'accent' | 'ghost';

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: Variant;
};

const variantClasses: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-ink/85',
  accent: 'bg-accent text-white hover:bg-accent/90',
  ghost: 'text-ink/80 hover:bg-black/5 hover:text-ink',
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full px-4 py-2.5 text-[15px] font-medium transition ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
