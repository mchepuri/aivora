// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// Nebula — a secondary, violet-accented theme skinned after modern SaaS
// dashboards (fly.io's Usage dashboard was the reference screenshot):
// pale lavender-white page background, white cards, vivid violet CTAs
// and links, rounded-rect (not pill) buttons.
//
// Light-mode only for now — token values are plain strings, not the
// [light, dark] tuples apple.theme.ts uses. Easy to extend with a dark
// pairing later if wanted.
//
// Built via `npm run theme:build` into nebula.css / nebula.js — see
// apps/web/package.json predev/prebuild hooks. Those output files are
// generated and gitignored; do not hand-edit them.

import { defineTheme } from '@astryxdesign/core/theme';

export const nebulaTheme = defineTheme({
  name: 'nebula',

  typography: {
    // Same scale as apple.theme.ts — this is a color/shape reskin, not a
    // typography change.
    scale: { base: 15, ratio: 1.2 },
    body: {
      family: 'var(--font-inter)',
      fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    heading: {
      family: 'var(--font-inter)',
      fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      weight: 'semibold',
    },
  },

  tokens: {
    '--color-text-primary': '#1b1730',
    '--color-text-secondary': '#6b7280',
    '--color-icon-primary': '#1b1730',
    '--color-icon-secondary': '#6b7280',

    '--color-background-body': '#faf9ff',
    '--color-background-surface': '#ffffff',
    '--color-background-card': '#ffffff',
    '--color-background-popover': '#ffffff',
    '--color-background-muted': '#f3f0fb',
    '--color-background-inverted': '#7c3aed', // primary CTA fill — the fly.io violet

    '--color-accent': '#7c3aed',
    '--color-text-accent': '#7c3aed',
    '--color-icon-accent': '#7c3aed',

    '--color-error': '#ef4444',
    '--color-background-error-inverted': '#ef4444',

    '--color-border': 'rgba(124, 58, 237, 0.08)',
    '--color-border-emphasized': 'rgba(124, 58, 237, 0.16)',

    '--radius-container': '16px',
    '--radius-element': '12px',
  },

  components: {
    button: {
      // fly.io's CTAs are a rounded-rect, not a pill — the one deliberate
      // shape departure from Apple's chrome (see apple.theme.ts for its
      // rounded-full choice).
      base: { borderRadius: 'var(--radius-element)' },
      // Same primary/CTA remap apple.theme.ts uses — see the long comment
      // there for why this repurposes Astryx's 'secondary' variant instead
      // of adding a new variant name.
      'variant:secondary': {
        backgroundColor: 'var(--color-background-inverted)',
        color: 'var(--color-on-dark)',
      },
    },
  },
});
