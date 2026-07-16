'use client';

import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Selector } from '@astryxdesign/core/Selector';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@/components/ui/Button';
import {
  draftLineTotal,
  emptyDraftLine,
  formatCurrency,
  type DraftLine,
  type ItemOption,
  type UomOption,
} from './PurchaseOrderTypes';

interface Props {
  lines: DraftLine[];
  onChange: (lines: DraftLine[]) => void;
  itemOptions: ItemOption[];
  uomOptions: UomOption[];
  currency: string;
}

export function PurchaseOrderLinesEditor({
  lines,
  onChange,
  itemOptions,
  uomOptions,
  currency,
}: Props) {
  const itemSelectorOptions: { value: string; label: string; disabled?: boolean }[] =
    itemOptions.length === 0
      ? [{ value: '', label: 'No items defined yet', disabled: true }]
      : itemOptions.map((item) => ({ value: item.id, label: `${item.sku} — ${item.name}` }));
  const uomSelectorOptions: { value: string; label: string; disabled?: boolean }[] =
    uomOptions.length === 0
      ? [{ value: '', label: 'No units defined yet', disabled: true }]
      : uomOptions.map((uom) => ({ value: uom.id, label: `${uom.code} — ${uom.name}` }));

  function updateLine(key: string, patch: Partial<DraftLine>) {
    onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function removeLine(key: string) {
    onChange(lines.filter((line) => line.key !== key));
  }

  const subtotal = lines.reduce((sum, line) => sum + draftLineTotal(line), 0);

  const columns: TableColumn<DraftLine>[] = [
    {
      key: 'itemId',
      header: 'Item',
      renderCell: (line) => (
        <Selector
          label="Item"
          isLabelHidden
          options={itemSelectorOptions}
          value={line.itemId}
          onChange={(value) => updateLine(line.key, { itemId: value as string })}
          isRequired
        />
      ),
    },
    {
      key: 'uomId',
      header: 'UOM',
      renderCell: (line) => (
        <Selector
          label="UOM"
          isLabelHidden
          options={uomSelectorOptions}
          value={line.uomId}
          onChange={(value) => updateLine(line.key, { uomId: value as string })}
          isRequired
        />
      ),
    },
    {
      key: 'quantityOrdered',
      header: 'Quantity',
      renderCell: (line) => (
        <NumberInput
          label="Quantity"
          isLabelHidden
          value={line.quantityOrdered}
          onChange={(value) => updateLine(line.key, { quantityOrdered: value })}
          min={0}
        />
      ),
    },
    {
      key: 'unitPrice',
      header: 'Unit Price',
      renderCell: (line) => (
        <NumberInput
          label="Unit price"
          isLabelHidden
          value={line.unitPrice}
          onChange={(value) => updateLine(line.key, { unitPrice: value })}
          min={0}
          step={0.01}
        />
      ),
    },
    {
      key: 'lineTotal',
      header: 'Line Total',
      align: 'end',
      renderCell: (line) => formatCurrency(String(draftLineTotal(line)), currency),
    },
    {
      key: 'remove',
      header: '',
      align: 'end',
      resizable: false,
      renderCell: (line) => (
        <Button
          variant="ghost"
          className="text-[13px] text-danger hover:bg-danger/10"
          onClick={() => removeLine(line.key)}
          disabled={lines.length === 1}
        >
          Remove
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Table data={lines} columns={columns} idKey="key" />

      <div className="mt-3">
        <Button variant="ghost" onClick={() => onChange([...lines, emptyDraftLine()])}>
          + Add Line
        </Button>
      </div>

      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1">
          <div className="flex justify-between">
            <Text color="secondary">Subtotal</Text>
            <Text>{formatCurrency(String(subtotal), currency)}</Text>
          </div>
          <div className="flex justify-between">
            <Text color="secondary">Tax</Text>
            <Text>{formatCurrency('0', currency)}</Text>
          </div>
          <div className="flex justify-between font-semibold">
            <Text>Total</Text>
            <Text>{formatCurrency(String(subtotal), currency)}</Text>
          </div>
        </div>
      </div>
    </div>
  );
}
