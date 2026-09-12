import { apiClient } from '@/lib/apiClient';
import { SalesOrderForm } from '@/components/sales-orders/SalesOrderForm';
import type {
  CustomerOption,
  ItemOption,
  UomOption,
  WarehouseOption,
} from '@/components/sales-orders/SalesOrderTypes';

async function getCustomerOptions(): Promise<CustomerOption[]> {
  try {
    return await apiClient.get<CustomerOption[]>('/master-data/customers?limit=100');
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

export default async function NewSalesOrderPage() {
  const [customerOptions, warehouseOptions, itemOptions, uomOptions] = await Promise.all([
    getCustomerOptions(),
    getWarehouseOptions(),
    getItemOptions(),
    getUomOptions(),
  ]);

  return (
    <SalesOrderForm
      customerOptions={customerOptions}
      warehouseOptions={warehouseOptions}
      itemOptions={itemOptions}
      uomOptions={uomOptions}
    />
  );
}
