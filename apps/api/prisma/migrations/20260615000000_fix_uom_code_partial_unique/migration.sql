-- Add missing tenantId column to units_of_measure for multi-tenant isolation.
-- Replace the global unique index on code with a per-tenant partial unique index
-- scoped to active rows (WHERE isDeleted = false), so soft-deleted codes can be
-- reused and two tenants can each independently define the same code.

ALTER TABLE "units_of_measure" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "units_of_measure" ALTER COLUMN "tenantId" DROP DEFAULT;

DROP INDEX "units_of_measure_code_key";

CREATE UNIQUE INDEX "units_of_measure_code_active_key"
  ON "units_of_measure" ("tenantId", "code")
  WHERE "isDeleted" = false;
