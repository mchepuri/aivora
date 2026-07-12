'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';

const UOM_CLASSES = ['COUNT', 'WEIGHT', 'VOLUME', 'LENGTH', 'TIME'] as const;
type UomClass = (typeof UOM_CLASSES)[number];

const UOM_CLASS_OPTIONS = UOM_CLASSES.map((c) => ({
  value: c,
  label: c.charAt(0) + c.slice(1).toLowerCase(),
}));

interface FormState {
  code: string;
  name: string;
  uomClass: UomClass;
}

const DEFAULT_FORM: FormState = { code: '', name: '', uomClass: 'COUNT' };

export function UomCreateForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await apiClient.post('/master-data/uom', form);
      router.push('/inventory/units-of-measure');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create UOM');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <Link href="/inventory/units-of-measure" className="mb-4 inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M9 11L5 7l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Units of Measure
        </Link>
        <Heading level={1}>New Unit of Measure</Heading>
        <Text color="secondary">Add a new unit to the master catalog.</Text>
      </div>

      <Card padding={8}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <TextInput
            label="Code"
            placeholder="e.g. EA, KG, BOX"
            value={form.code}
            onChange={(value) => setForm({ ...form, code: value.toUpperCase() })}
            isRequired
          />
          <TextInput
            label="Name"
            placeholder="e.g. Each, Kilogram, Box"
            value={form.name}
            onChange={(value) => setForm({ ...form, name: value })}
            isRequired
          />
          <Selector
            label="Class"
            options={UOM_CLASS_OPTIONS}
            value={form.uomClass}
            onChange={(value) => setForm({ ...form, uomClass: value as UomClass })}
          />

          {error && <Banner status="error" title={error} />}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create UOM'}
            </Button>
            <Button type="button" variant="ghost" href="/inventory/units-of-measure">
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
