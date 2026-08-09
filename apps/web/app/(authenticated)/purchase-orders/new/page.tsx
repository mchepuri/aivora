import { apiClient } from '@/lib/apiClient';
import { PurchaseOrderForm } from '@/components/purchase-orders/PurchaseOrderForm';
import type {
  ItemOption,
  SupplierOption,
  UomOption,
  WarehouseOption,
} from '@/components/purchase-orders/PurchaseOrderTypes';

async function getSupplierOptions(): Promise<SupplierOption[]> {
  try {
    return await apiClient.get<SupplierOption[]>('/master-data/suppliers?limit=100');
  } catch {
    return [];
  }
}

async function getWarehouseOptions(): Promise<WarehouseOption[]> {
  try {
    return await apiClient.get<WarehouseOption[]>('/master-data/warehouses?limit=100');
  } catch {
    return [];
  }
}

async function getItemOptions(): Promise<ItemOption[]> {
  try {
    return await apiClient.get<ItemOption[]>('/master-data/items?limit=100');
  } catch {
    return [];
  }
}

async function getUomOptions(): Promise<UomOption[]> {
  try {
    return await apiClient.get<UomOption[]>('/master-data/uom?limit=100');
  } catch {
    return [];
  }
}

export default async function NewPurchaseOrderPage() {
  const [supplierOptions, warehouseOptions, itemOptions, uomOptions] = await Promise.all([
    getSupplierOptions(),
    getWarehouseOptions(),
    getItemOptions(),
    getUomOptions(),
  ]);

  return (
    <PurchaseOrderForm
      supplierOptions={supplierOptions}
      warehouseOptions={warehouseOptions}
      itemOptions={itemOptions}
      uomOptions={uomOptions}
    />
  );
}
