-- Replace the global unique index on code with a partial unique index that
-- excludes soft-deleted rows. This allows a code (e.g. "CM") to be reused
-- after a UOM is soft-deleted, matching the behaviour the list endpoint
-- already shows (only active rows are visible).

DROP INDEX "units_of_measure_code_key";

CREATE UNIQUE INDEX "units_of_measure_code_active_key"
  ON "units_of_measure" ("code")
  WHERE "isDeleted" = false;
