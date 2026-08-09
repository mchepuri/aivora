-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('GOODS', 'SERVICE', 'ASSET');

-- CreateEnum
CREATE TYPE "ValuationMethod" AS ENUM ('FIFO', 'LIFO', 'WEIGHTED_AVG');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONTINUED');

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sku" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "baseUomId" TEXT NOT NULL,
    "itemType" "ItemType" NOT NULL DEFAULT 'GOODS',
    "valuationMethod" "ValuationMethod" NOT NULL DEFAULT 'FIFO',
    "isBatchTracked" BOOLEAN NOT NULL DEFAULT false,
    "isSerialTracked" BOOLEAN NOT NULL DEFAULT false,
    "shelfLifeDays" INTEGER,
    "reorderPoint" DECIMAL(18,4),
    "reorderQuantity" DECIMAL(18,4),
    "status" "ItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Per-tenant partial unique index scoped to active rows, so a soft-deleted
-- SKU can be reused and two tenants can independently define the same SKU.
-- Same pattern as units_of_measure_code_active_key.
CREATE UNIQUE INDEX "items_sku_active_key"
  ON "items" ("tenantId", "sku")
  WHERE "isDeleted" = false;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_baseUomId_fkey" FOREIGN KEY ("baseUomId") REFERENCES "units_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
