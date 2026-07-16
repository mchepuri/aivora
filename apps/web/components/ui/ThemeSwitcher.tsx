'use client';

import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { DropdownMenu, DropdownMenuItem } from '@astryxdesign/core/DropdownMenu';
import { Text } from '@astryxdesign/core/Text';
import { useThemeMode } from '@/components/theme/ThemeModeProvider';
import { SunIcon, MoonIcon, SystemIcon, SparkleIcon, CheckIcon } from './icons/ThemeIcons';
import type { ThemeMode } from '@/lib/theme-mode';

interface ModeOption {
  mode: ThemeMode;
  label: string;
  icon: ReactNode;
}

// Data-driven list rather than a hardcoded toggle: a future theme is a
// one-line addition here, not a restructure.
const MODE_OPTIONS: ModeOption[] = [
  { mode: 'light', label: 'Light', icon: <SunIcon /> },
  { mode: 'dark', label: 'Dark', icon: <MoonIcon /> },
  { mode: 'system', label: 'System', icon: <SystemIcon /> },
  { mode: 'nebula', label: 'Nebula', icon: <SparkleIcon /> },
];

const styles = stylex.create({
  round: { borderRadius: 'var(--radius-full)' },
  sectionLabel: { paddingInline: 'var(--spacing-3)', paddingBlock: 'var(--spacing-1)' },
});

export function ThemeSwitcher() {
  const { mode, setMode } = useThemeMode();
  const current = MODE_OPTIONS.find((option) => option.mode === mode) ?? MODE_OPTIONS[2];

  return (
    <DropdownMenu
      button={{
        label: 'Change theme',
        isIconOnly: true,
        variant: 'ghost',
        icon: current.icon,
        xstyle: styles.round,
      }}
    >
      <Text type="supporting" color="secondary" xstyle={styles.sectionLabel}>
        Theme
      </Text>
      {MODE_OPTIONS.map((option) => (
        <DropdownMenuItem
          key={option.mode}
          icon={option.icon}
          label={option.label}
          onClick={() => setMode(option.mode)}
          endContent={option.mode === mode ? <CheckIcon /> : undefined}
        />
      ))}
    </DropdownMenu>
  );
}
