import {
  Button as AstryxButton,
  type ButtonProps as AstryxButtonProps,
  type ButtonVariant as AstryxButtonVariant,
} from '@astryxdesign/core/Button';
import { type ReactNode } from 'react';

type Variant = 'primary' | 'accent' | 'ghost';

// Astryx's own 'primary' variant is accent-colored; this app's 'primary' is
// the ink/inverted CTA style (CLAUDE.md), so the names don't line up 1:1.
// 'secondary' is restyled to ink/inverted in theme/apple.theme.ts — see the
// comment there for why this repurposes an existing variant instead of
// adding a new one.
const variantMap: Record<Variant, AstryxButtonVariant> = {
  primary: 'secondary',
  accent: 'primary',
  ghost: 'ghost',
};

type ButtonProps = Omit<AstryxButtonProps, 'variant' | 'label' | 'children' | 'isDisabled'> & {
  variant?: Variant;
  children: ReactNode;
  /** Native `disabled` — translated to Astryx's `isDisabled`. */
  disabled?: boolean;
};

export function Button({ variant = 'primary', children, disabled, ...props }: ButtonProps) {
  return (
    <AstryxButton
      variant={variantMap[variant]}
      label={typeof children === 'string' ? children : ''}
      isDisabled={disabled}
      {...props}
    >
      {children}
    </AstryxButton>
  );
}
