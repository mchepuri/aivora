'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { apiClient } from '@/lib/apiClient';

const UOM_CLASSES = ['COUNT', 'WEIGHT', 'VOLUME', 'LENGTH', 'TIME'] as const;
type UomClass = (typeof UOM_CLASSES)[number];

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
        <Link
          href="/inventory/units-of-measure"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted transition hover:text-ink"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Units of Measure
        </Link>
        <h1 className="text-[28px] font-semibold tracking-tight text-ink">New Unit of Measure</h1>
        <p className="mt-1 text-[15px] text-muted">Add a new unit to the master catalog.</p>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="uom-code">Code</Label>
            <Input
              id="uom-code"
              maxLength={16}
              placeholder="e.g. EA, KG, BOX"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              required
            />
          </div>

          <div>
            <Label htmlFor="uom-name">Name</Label>
            <Input
              id="uom-name"
              maxLength={50}
              placeholder="e.g. Each, Kilogram, Box"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="uom-class">Class</Label>
            <select
              id="uom-class"
              value={form.uomClass}
              onChange={(e) => setForm({ ...form, uomClass: e.target.value as UomClass })}
              className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[15px] text-ink shadow-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
              required
            >
              {UOM_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0) + c.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-[13px] text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create UOM'}
            </Button>
            <Link href="/inventory/units-of-measure">
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
