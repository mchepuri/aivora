'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';
import { logoutAction } from '@/app/(public)/login/actions';

const navLinks = [{ href: '/users', label: 'Users' }];

export function AppNav() {
  return (
    <header className="border-b border-black/5 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-[17px] font-semibold tracking-tight text-ink">
            Aivora
          </Link>
          <nav className="flex items-center gap-6 text-[13px] text-ink/80">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-ink">
                {link.href === '/users' ? 'Users' : link.label}
              </Link>
            ))}
          </nav>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2">
              <Avatar>
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1 h-px bg-black/5" />
            <DropdownMenuItem asChild>
              <Link href="/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 h-px bg-black/5" />
            <DropdownMenuItem
              className="cursor-pointer text-red-500 focus:bg-red-50 focus:text-red-500"
              onSelect={() => logoutAction()}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
