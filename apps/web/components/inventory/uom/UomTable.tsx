'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Badge, type BadgeVariant } from '@astryxdesign/core/Badge';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import { UomDialog, type Uom } from './UomDialog';

const CLASS_BADGE_VARIANT: Record<Uom['uomClass'], BadgeVariant> = {
  COUNT: 'blue',
  WEIGHT: 'orange',
  VOLUME: 'cyan',
  LENGTH: 'purple',
  TIME: 'green',
};

interface Props {
  uoms: Uom[];
}

export function UomTable({ uoms }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Uom | undefined>(undefined);
  const [deletingUom, setDeletingUom] = useState<Uom | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openCreate() {
    router.push('/inventory/units-of-measure/new');
  }

  function openEdit(uom: Uom) {
    setEditing(uom);
    setDialogOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deletingUom) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await apiClient.delete(`/master-data/uom/${deletingUom.id}`);
      setDeletingUom(null);
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete UOM. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: TableColumn<Uom>[] = [
    {
      key: 'code',
      header: 'Code',
      renderCell: (uom) => <span className="font-mono font-medium text-ink">{uom.code}</span>,
    },
    { key: 'name', header: 'Name' },
    {
      key: 'uomClass',
      header: 'Class',
      renderCell: (uom) => (
        <Badge
          variant={CLASS_BADGE_VARIANT[uom.uomClass]}
          label={uom.uomClass.charAt(0) + uom.uomClass.slice(1).toLowerCase()}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      resizable: false,
      renderCell: (uom) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" className="text-[13px]" onClick={() => openEdit(uom)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            className="text-[13px] text-danger hover:bg-danger/10"
            onClick={() => setDeletingUom(uom)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      {deleteError && <Banner status="error" title={deleteError} className="mb-4" />}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Heading level={1}>Units of Measure</Heading>
          <Text color="secondary">
            {uoms.length === 0
              ? 'No units defined yet.'
              : `${uoms.length} unit${uoms.length === 1 ? '' : 's'} in the master catalog`}
          </Text>
        </div>
        <Button onClick={openCreate}>+ New UOM</Button>
      </div>

      {uoms.length > 0 && (
        <Card padding={0}>
          <Table data={uoms} columns={columns} idKey="id" hasHover />
        </Card>
      )}

      <UomDialog open={dialogOpen} onOpenChange={setDialogOpen} uom={editing} />

      <AlertDialog
        isOpen={deletingUom !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDeletingUom(null);
        }}
        title="Delete unit of measure?"
        description={
          deletingUom ? `Delete "${deletingUom.code} — ${deletingUom.name}"? This cannot be undone.` : ''
        }
        actionLabel={isDeleting ? 'Deleting…' : 'Delete'}
        onAction={handleConfirmDelete}
      />
    </>
  );
}
