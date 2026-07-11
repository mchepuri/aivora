'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { apiClient } from '@/lib/apiClient';

const UOM_CLASSES = ['COUNT', 'WEIGHT', 'VOLUME', 'LENGTH', 'TIME'] as const;
type UomClass = (typeof UOM_CLASSES)[number];

export interface Uom {
  id: string;
  code: string;
  name: string;
  uomClass: UomClass;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uom?: Uom;
  prefill?: { code?: string; name?: string; uomClass?: UomClass };
}

interface FormState {
  code: string;
  name: string;
  uomClass: UomClass;
}

const DEFAULT_FORM: FormState = { code: '', name: '', uomClass: 'COUNT' };

export function UomDialog({ open, onOpenChange, uom, prefill }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (uom) {
        setForm({ code: uom.code, name: uom.name, uomClass: uom.uomClass });
      } else if (prefill) {
        setForm({
          code: prefill.code ?? '',
          name: prefill.name ?? '',
          uomClass: prefill.uomClass ?? 'COUNT',
        });
      } else {
        setForm(DEFAULT_FORM);
      }
      setError('');
    }
  }, [open, uom, prefill]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (uom) {
        await apiClient.patch(`/master-data/uom/${uom.id}`, form);
      } else {
        await apiClient.post('/master-data/uom', form);
      }
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save UOM');
    } finally {
      setSaving(false);
    }
  }

  const isEdit = Boolean(uom);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{isEdit ? 'Edit Unit of Measure' : 'New Unit of Measure'}</DialogTitle>
        <DialogDescription>
          {uom ? `Editing ${uom.code}` : 'Add a new unit to the master catalog.'}
        </DialogDescription>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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

          {error && <p className="text-[13px] text-danger">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create UOM'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
