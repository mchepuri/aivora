-- CreateEnum
CREATE TYPE "WarehouseType" AS ENUM ('DC', 'RETAIL_BACKROOM', 'MANUFACTURING', 'BONDED', 'VIRTUAL');

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" VARCHAR(16) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "addressLine" VARCHAR(255),
    "warehouseType" "WarehouseType" NOT NULL DEFAULT 'DC',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Per-tenant partial unique index scoped to active rows, so a soft-deleted
-- code can be reused and two tenants can independently define the same code.
-- Same pattern as units_of_measure_code_active_key / items_sku_active_key /
-- suppliers_code_active_key.
CREATE UNIQUE INDEX "warehouses_code_active_key"
  ON "warehouses" ("tenantId", "code")
  WHERE "isDeleted" = false;
