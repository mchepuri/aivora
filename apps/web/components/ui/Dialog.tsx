'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { type ComponentPropsWithoutRef } from 'react';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

type OverlayProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>;
type ContentProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Content>;
type TitleProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Title>;
type DescriptionProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Description>;

export function DialogOverlay({ className = '', ...props }: OverlayProps) {
  return (
    <DialogPrimitive.Overlay
      className={`fixed inset-0 z-50 bg-black/20 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className}`}
      {...props}
    />
  );
}

export function DialogContent({ className = '', children, ...props }: ContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={`fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-black/5 bg-white p-6 shadow-2xl ${className}`}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({ className = '', ...props }: TitleProps) {
  return (
    <DialogPrimitive.Title
      className={`text-[19px] font-semibold tracking-tight text-ink ${className}`}
      {...props}
    />
  );
}

export function DialogDescription({ className = '', ...props }: DescriptionProps) {
  return (
    <DialogPrimitive.Description
      className={`mt-1.5 text-[14px] text-muted ${className}`}
      {...props}
    />
  );
}
