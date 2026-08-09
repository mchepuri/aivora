'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Dialog } from '@astryxdesign/core/Dialog';
import { DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
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

export interface Uom {
  id: string;
  code: string;
  name: string;
  uomClass: UomClass;
  // Astryx's Table requires row data to satisfy Record<string, unknown>.
  [key: string]: unknown;
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
    <Dialog isOpen={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit}>
        <Layout
          header={
            <DialogHeader
              title={isEdit ? 'Edit Unit of Measure' : 'New Unit of Measure'}
              subtitle={uom ? `Editing ${uom.code}` : 'Add a new unit to the master catalog.'}
              onOpenChange={onOpenChange}
            />
          }
          content={
            <LayoutContent>
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
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create UOM'}
              </Button>
            </LayoutFooter>
          }
        />
      </form>
    </Dialog>
  );
}
