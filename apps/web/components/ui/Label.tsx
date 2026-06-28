'use client';

import * as LabelPrimitive from '@radix-ui/react-label';
import { type ComponentPropsWithoutRef } from 'react';

type LabelProps = ComponentPropsWithoutRef<typeof LabelPrimitive.Root>;

export function Label({ className = '', ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root
      className={`block text-[13px] font-medium text-ink ${className}`}
      {...props}
    />
  );
}
