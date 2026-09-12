export interface DateRange {
  /** Inclusive, ISO date string (YYYY-MM-DD). */
  from: string;
  /** Inclusive, ISO date string (YYYY-MM-DD). */
  to: string;
}

export const DATE_RANGE_PRESETS = [
  'today',
  'yesterday',
  'last7',
  'last30',
  'thisMonth',
  'lastMonth',
  'thisYear',
  'lastYear',
] as const;
export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number] | 'custom';

export const DATE_RANGE_PRESET_LABEL: Record<DateRangePreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  last7: 'Last 7 Days',
  last30: 'Last 30 Days',
  thisMonth: 'This Month',
  lastMonth: 'Last Month',
  thisYear: 'This Year',
  lastYear: 'Last Year',
  custom: 'Custom',
};

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Computes the [from, to] range for a preset — both ends inclusive, in UTC calendar days. */
export function computePresetRange(preset: (typeof DATE_RANGE_PRESETS)[number]): DateRange {
  const today = todayUTC();

  switch (preset) {
    case 'today':
      return { from: toDateString(today), to: toDateString(today) };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      return { from: toDateString(yesterday), to: toDateString(yesterday) };
    }
    case 'last7': {
      const from = new Date(today);
      from.setUTCDate(from.getUTCDate() - 6);
      return { from: toDateString(from), to: toDateString(today) };
    }
    case 'last30': {
      const from = new Date(today);
      from.setUTCDate(from.getUTCDate() - 29);
      return { from: toDateString(from), to: toDateString(today) };
    }
    case 'thisMonth': {
      const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      return { from: toDateString(from), to: toDateString(today) };
    }
    case 'lastMonth': {
      const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
      const to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
      return { from: toDateString(from), to: toDateString(to) };
    }
    case 'thisYear': {
      const from = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
      return { from: toDateString(from), to: toDateString(today) };
    }
    case 'lastYear': {
      const from = new Date(Date.UTC(today.getUTCFullYear() - 1, 0, 1));
      const to = new Date(Date.UTC(today.getUTCFullYear() - 1, 11, 31));
      return { from: toDateString(from), to: toDateString(to) };
    }
  }
}

/** Reverse lookup — which preset (if any) the current range matches, for highlighting the Selector. */
export function detectPreset(range: DateRange): DateRangePreset {
  for (const preset of DATE_RANGE_PRESETS) {
    const computed = computePresetRange(preset);
    if (computed.from === range.from && computed.to === range.to) return preset;
  }
  return 'custom';
}
