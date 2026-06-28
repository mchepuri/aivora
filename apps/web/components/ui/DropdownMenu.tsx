'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { type ComponentPropsWithoutRef } from 'react';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuSeparator = DropdownMenuPrimitive.Separator;

type ContentProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>;
type ItemProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>;
type LabelProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>;

export function DropdownMenuContent({
  className = '',
  sideOffset = 6,
  ...props
}: ContentProps) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={`z-50 min-w-[180px] overflow-hidden rounded-xl border border-black/5 bg-white p-1 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ${className}`}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({ className = '', ...props }: ItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      className={`relative flex cursor-default select-none items-center rounded-lg px-3 py-2 text-[13px] text-ink outline-none transition-colors hover:bg-black/5 focus:bg-black/5 data-[disabled]:pointer-events-none data-[disabled]:opacity-40 ${className}`}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className = '', ...props }: LabelProps) {
  return (
    <DropdownMenuPrimitive.Label
      className={`px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted ${className}`}
      {...props}
    />
  );
}
