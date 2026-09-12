import { notFound } from 'next/navigation';
import { SalesOrderForm } from '@/components/sales-orders/SalesOrderForm';
import type {
  CustomerOption,
  ItemOption,
  SalesOrder,
  UomOption,
  WarehouseOption,
} from '@/components/sales-orders/SalesOrderTypes';
import { apiClient } from '@/lib/apiClient';

async function getSalesOrder(id: string): Promise<SalesOrder | null> {
  try {
    return await apiClient.get<SalesOrder>(`/sales/sales-orders/${id}`);
  } catch {
    return null;
  }
}

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

export default async function EditSalesOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const salesOrder = await getSalesOrder(id);

  if (!salesOrder || salesOrder.status !== 'DRAFT') {
    notFound();
  }

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
      salesOrder={salesOrder}
    />
  );
}
