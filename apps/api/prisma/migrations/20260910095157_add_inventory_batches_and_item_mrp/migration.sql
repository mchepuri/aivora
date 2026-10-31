-- CreateEnum
CREATE TYPE "InventoryBatchStatus" AS ENUM ('ACTIVE', 'QUARANTINE', 'EXPIRED', 'RECALLED');

-- AlterTable
ALTER TABLE "goods_receipt_note_lines" ADD COLUMN     "batchId" TEXT;

-- AlterTable
ALTER TABLE "inventory_ledger" ADD COLUMN     "batchId" TEXT;

-- AlterTable
-- Selling price maintained on the item master — see the Item.mrp comment in schema.prisma.
ALTER TABLE "items" ADD COLUMN     "mrp" DECIMAL(18,4);

-- CreateTable
-- Batches are created implicitly at GRN receiving time, not through a
-- separate batch-management screen — see the model comment in schema.prisma.
CREATE TABLE "inventory_batches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "batchNo" VARCHAR(64) NOT NULL,
    "supplierLotNo" VARCHAR(64),
    "manufacturedDate" DATE,
    "expiryDate" DATE,
    "status" "InventoryBatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "inventory_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_batches_tenantId_itemId_batchNo_key" ON "inventory_batches"("tenantId", "itemId", "batchNo");

-- AddForeignKey
ALTER TABLE "goods_receipt_note_lines" ADD CONSTRAINT "goods_receipt_note_lines_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "inventory_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "inventory_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
