import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { ApprovalLimitsModule } from './approval-limits/approval-limits.module';
import { SodRulesModule } from './sod-rules/sod-rules.module';
import { UomModule } from './master-data/uom/uom.module';
import { ItemsModule } from './master-data/items/items.module';
import { SuppliersModule } from './master-data/suppliers/suppliers.module';
import { WarehousesModule } from './master-data/warehouses/warehouses.module';
import { CustomersModule } from './master-data/customers/customers.module';
import { PurchaseOrdersModule } from './procurement/purchase-orders/purchase-orders.module';
import { GoodsReceiptsModule } from './procurement/goods-receipts/goods-receipts.module';
import { SalesOrdersModule } from './sales/sales-orders/sales-orders.module';
import { StockLedgerModule } from './inventory/stock-ledger/stock-ledger.module';
import { ReportsModule } from './reports/reports.module';
import { QueryAgentModule } from './ai/query-agent/query-agent.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [PrismaModule, HealthModule, UsersModule, ApprovalLimitsModule, SodRulesModule, UomModule, ItemsModule, SuppliersModule, WarehousesModule, CustomersModule, PurchaseOrdersModule, GoodsReceiptsModule, SalesOrdersModule, StockLedgerModule, ReportsModule, QueryAgentModule, AuthModule],
})
export class AppModule {}
