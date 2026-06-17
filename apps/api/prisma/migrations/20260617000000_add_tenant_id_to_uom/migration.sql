-- Add missing tenantId column to units_of_measure for multi-tenant isolation.
-- Also replace the partial unique index on (code) with a per-tenant one on
-- (tenantId, code), so two tenants can each have an active UOM with the same code.

ALTER TABLE "units_of_measure" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "units_of_measure" ALTER COLUMN "tenantId" DROP DEFAULT;

DROP INDEX "units_of_measure_code_active_key";

CREATE UNIQUE INDEX "units_of_measure_code_active_key"
  ON "units_of_measure" ("tenantId", "code")
  WHERE "isDeleted" = false;
