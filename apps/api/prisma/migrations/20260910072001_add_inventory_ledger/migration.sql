-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('RECEIPT', 'ISSUE', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUSTMENT_POSITIVE', 'ADJUSTMENT_NEGATIVE', 'RETURN_IN', 'RETURN_OUT');

-- CreateTable
-- Append-only — see the model comment in schema.prisma and CLAUDE.md's ledger
-- rules. No UPDATE/DELETE grants at the DB-role level, matching
-- inventory_ledger/gl_journal_*/audit_logs/tax_transactions elsewhere in the
-- architecture doc's §7. The REVOKE below is a no-op today because the app
-- connects as the database owner (owners bypass ACL checks in Postgres) — it
-- takes effect automatically once the app is moved to a non-owner role, which
-- is the real prerequisite for DB-enforced immutability. Until then,
-- immutability is enforced at the application layer: StockLedgerService has
-- no update()/remove() methods and the controller exposes no PATCH/DELETE
-- route for this resource — corrections are new reversal rows only.
CREATE TABLE "inventory_ledger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entryNo" INTEGER NOT NULL,
    "itemId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "movementType" "InventoryMovementType" NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "uomId" TEXT NOT NULL,
    "unitCost" DECIMAL(18,6),
    "sourceDocumentType" VARCHAR(50),
    "sourceDocumentId" TEXT,
    "reasonCode" VARCHAR(50),
    "reversesEntryId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "inventory_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_ledger_tenantId_itemId_warehouseId_occurredAt_idx" ON "inventory_ledger"("tenantId", "itemId", "warehouseId", "occurredAt");

-- CreateIndex
CREATE INDEX "inventory_ledger_tenantId_sourceDocumentType_sourceDocument_idx" ON "inventory_ledger"("tenantId", "sourceDocumentType", "sourceDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_ledger_tenantId_entryNo_key" ON "inventory_ledger"("tenantId", "entryNo");

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_uomId_fkey" FOREIGN KEY ("uomId") REFERENCES "units_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_ledger" ADD CONSTRAINT "inventory_ledger_reversesEntryId_fkey" FOREIGN KEY ("reversesEntryId") REFERENCES "inventory_ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RevokeGrant
REVOKE UPDATE, DELETE ON "inventory_ledger" FROM CURRENT_USER;
