'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import * as stylex from '@stylexjs/stylex';
import { TopNav, TopNavHeading, TopNavItem } from '@astryxdesign/core/TopNav';
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';
import { DropdownMenuItem } from '@astryxdesign/core/DropdownMenu';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Divider } from '@astryxdesign/core/Divider';
import { Text } from '@astryxdesign/core/Text';
import { logoutAction } from '@/app/(public)/login/actions';

const navLinks = [{ href: '/users', label: 'Users' }];

// The avatar trigger button is icon-only + ghost, but should stay a full
// circle (matching the round Avatar inside it) rather than the theme's
// default 12px element radius.
const styles = stylex.create({
  round: { borderRadius: 'var(--radius-full)' },
  sectionLabel: { paddingInline: 'var(--spacing-3)', paddingBlock: 'var(--spacing-1)' },
});

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <TopNav
      label="Main navigation"
      heading={<TopNavHeading heading="Aivora" headingHref="/dashboard" />}
      startContent={navLinks.map((link) => (
        <TopNavItem
          key={link.href}
          label={link.label}
          href={link.href}
          isSelected={pathname === link.href}
        />
      ))}
      endContent={
        <DropdownMenu
          button={{
            label: 'My account',
            isIconOnly: true,
            variant: 'ghost',
            icon: <Avatar name="U" size="small" />,
            xstyle: styles.round,
          }}
        >
          <Text type="supporting" color="secondary" xstyle={styles.sectionLabel}>
            My Account
          </Text>
          <DropdownMenuItem label="Profile" onClick={() => router.push('/profile')} />
          <DropdownMenuItem label="Settings" onClick={() => router.push('/settings')} />
          <Divider />
          <DropdownMenuItem
            label="Log out"
            className="text-danger"
            onClick={() => startTransition(() => { void logoutAction(); })}
          />
        </DropdownMenu>
      }
    />
  );
}
