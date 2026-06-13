'use client';

import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { type ComponentPropsWithoutRef } from 'react';

type SeparatorProps = ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>;

export function Separator({ className = '', ...props }: SeparatorProps) {
  return (
    <SeparatorPrimitive.Root
      className={`shrink-0 bg-black/5 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px ${className}`}
      {...props}
    />
  );
}
