'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import { UomDialog, type Uom } from './UomDialog';

const CLASS_COLOURS: Record<string, string> = {
  COUNT: 'bg-badge-count-bg text-badge-count-fg',
  WEIGHT: 'bg-badge-weight-bg text-badge-weight-fg',
  VOLUME: 'bg-badge-volume-bg text-badge-volume-fg',
  LENGTH: 'bg-badge-length-bg text-badge-length-fg',
  TIME: 'bg-badge-time-bg text-badge-time-fg',
};

interface Props {
  uoms: Uom[];
}

export function UomTable({ uoms }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Uom | undefined>(undefined);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openCreate() {
    router.push('/inventory/units-of-measure/new');
  }

  function openEdit(uom: Uom) {
    setEditing(uom);
    setDialogOpen(true);
  }

  async function handleDelete(uom: Uom) {
    if (!confirm(`Delete UOM "${uom.code} — ${uom.name}"? This cannot be undone.`)) return;
    setDeleting(uom.id);
    setDeleteError(null);
    try {
      await apiClient.delete(`/master-data/uom/${uom.id}`);
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete UOM. Please try again.');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      {deleteError && (
        <p className="mb-4 rounded-xl bg-danger/10 px-4 py-3 text-[13px] text-danger">{deleteError}</p>
      )}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-ink">Units of Measure</h1>
          <p className="mt-1 text-[15px] text-muted">
            {uoms.length === 0
              ? 'No units defined yet.'
              : `${uoms.length} unit${uoms.length === 1 ? '' : 's'} in the master catalog`}
          </p>
        </div>
        <Button onClick={openCreate}>+ New UOM</Button>
      </div>

      {uoms.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <table className="w-full text-left text-[15px]">
            <thead>
              <tr className="border-b border-black/5 bg-black/[0.02]">
                <th className="px-6 py-3 text-[12px] font-medium uppercase tracking-wide text-muted">
                  Code
                </th>
                <th className="px-6 py-3 text-[12px] font-medium uppercase tracking-wide text-muted">
                  Name
                </th>
                <th className="px-6 py-3 text-[12px] font-medium uppercase tracking-wide text-muted">
                  Class
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {uoms.map((uom, idx) => (
                <tr
                  key={uom.id}
                  className={idx < uoms.length - 1 ? 'border-b border-black/5' : ''}
                >
                  <td className="px-6 py-4 font-mono font-medium text-ink">{uom.code}</td>
                  <td className="px-6 py-4 text-ink">{uom.name}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${CLASS_COLOURS[uom.uomClass] ?? 'bg-black/5 text-ink'}`}
                    >
                      {uom.uomClass.charAt(0) + uom.uomClass.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" className="text-[13px]" onClick={() => openEdit(uom)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-[13px] text-danger hover:bg-danger/10"
                        disabled={deleting === uom.id}
                        onClick={() => handleDelete(uom)}
                      >
                        {deleting === uom.id ? 'Deleting…' : 'Delete'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UomDialog open={dialogOpen} onOpenChange={setDialogOpen} uom={editing} />
    </>
  );
}
