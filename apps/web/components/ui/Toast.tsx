'use client';

import * as ToastPrimitive from '@radix-ui/react-toast';
import { type ComponentPropsWithoutRef } from 'react';

export const ToastProvider = ToastPrimitive.Provider;
export const ToastViewport = ({ className = '', ...props }: ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>) => (
  <ToastPrimitive.Viewport
    className={`fixed bottom-6 right-6 z-[100] flex max-h-screen w-full max-w-sm flex-col gap-2 ${className}`}
    {...props}
  />
);

type ToastRootProps = ComponentPropsWithoutRef<typeof ToastPrimitive.Root>;
type ToastTitleProps = ComponentPropsWithoutRef<typeof ToastPrimitive.Title>;
type ToastDescriptionProps = ComponentPropsWithoutRef<typeof ToastPrimitive.Description>;

export function Toast({ className = '', ...props }: ToastRootProps) {
  return (
    <ToastPrimitive.Root
      className={`group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border border-black/5 bg-white p-4 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-bottom-full ${className}`}
      {...props}
    />
  );
}

export function ToastTitle({ className = '', ...props }: ToastTitleProps) {
  return (
    <ToastPrimitive.Title
      className={`text-[14px] font-semibold text-ink ${className}`}
      {...props}
    />
  );
}

export function ToastDescription({ className = '', ...props }: ToastDescriptionProps) {
  return (
    <ToastPrimitive.Description
      className={`text-[13px] text-muted ${className}`}
      {...props}
    />
  );
}

export const ToastClose = ({ className = '', ...props }: ComponentPropsWithoutRef<typeof ToastPrimitive.Close>) => (
  <ToastPrimitive.Close
    className={`ml-auto shrink-0 rounded-full p-1 text-muted transition hover:bg-black/5 hover:text-ink ${className}`}
    toast-close=""
    {...props}
  >
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <path d="M2.22 2.22a.75.75 0 0 1 1.06 0L6 4.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L7.06 6l2.72 2.72a.75.75 0 1 1-1.06 1.06L6 7.06 3.28 9.78a.75.75 0 0 1-1.06-1.06L4.94 6 2.22 3.28a.75.75 0 0 1 0-1.06Z" />
    </svg>
  </ToastPrimitive.Close>
);
