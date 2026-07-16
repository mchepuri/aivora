-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'BLOCKED');

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "legalName" VARCHAR(255) NOT NULL,
    "defaultCurrency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "ratingScore" DECIMAL(4,2),
    "status" "SupplierStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Per-tenant partial unique index scoped to active rows, so a soft-deleted
-- code can be reused and two tenants can independently define the same code.
-- Same pattern as units_of_measure_code_active_key / items_sku_active_key.
CREATE UNIQUE INDEX "suppliers_code_active_key"
  ON "suppliers" ("tenantId", "code")
  WHERE "isDeleted" = false;
