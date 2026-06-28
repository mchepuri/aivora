'use client';

import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { type ComponentPropsWithoutRef } from 'react';

type AvatarRootProps = ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>;
type AvatarImageProps = ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>;
type AvatarFallbackProps = ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>;

export function Avatar({ className = '', ...props }: AvatarRootProps) {
  return (
    <AvatarPrimitive.Root
      className={`relative flex size-9 shrink-0 overflow-hidden rounded-full ${className}`}
      {...props}
    />
  );
}

export function AvatarImage({ className = '', ...props }: AvatarImageProps) {
  return (
    <AvatarPrimitive.Image
      className={`aspect-square size-full object-cover ${className}`}
      {...props}
    />
  );
}

export function AvatarFallback({ className = '', ...props }: AvatarFallbackProps) {
  return (
    <AvatarPrimitive.Fallback
      className={`flex size-full items-center justify-center rounded-full bg-black/5 text-[13px] font-medium text-muted ${className}`}
      {...props}
    />
  );
}
