'use client';

import { Selector } from '@astryxdesign/core/Selector';
import { DateInput } from '@astryxdesign/core/DateInput';
import type { ISODateString } from '@astryxdesign/core/Calendar';
import { Grid } from '@astryxdesign/core/Grid';
import {
  DATE_RANGE_PRESETS,
  DATE_RANGE_PRESET_LABEL,
  computePresetRange,
  detectPreset,
  type DateRange,
} from './DateRangePresets';

const PRESET_OPTIONS = [
  ...DATE_RANGE_PRESETS.map((preset) => ({ value: preset, label: DATE_RANGE_PRESET_LABEL[preset] })),
  { value: 'custom', label: DATE_RANGE_PRESET_LABEL.custom, disabled: true },
];

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: Props) {
  const activePreset = detectPreset(value);

  return (
    <Grid columns={{ minWidth: 180 }} gap={5}>
      <Selector
        label="Quick Range"
        options={PRESET_OPTIONS}
        value={activePreset}
        onChange={(preset) => {
          if (preset === 'custom') return;
          onChange(computePresetRange(preset as (typeof DATE_RANGE_PRESETS)[number]));
        }}
      />
      <DateInput
        label="From"
        value={value.from as ISODateString}
        onChange={(v) => onChange({ ...value, from: v ?? value.from })}
        isRequired
      />
      <DateInput
        label="To"
        value={value.to as ISODateString}
        onChange={(v) => onChange({ ...value, to: v ?? value.to })}
        isRequired
      />
    </Grid>
  );
}
