-- Canonical supply state modes:
-- direct_state -> fillLevel is the canonical input
-- numeric_thresholds -> currentStock + mediumThreshold + fullThreshold derive fillLevel

ALTER TABLE "PropertySupply"
ADD COLUMN "stateMode" TEXT NOT NULL DEFAULT 'direct_state',
ADD COLUMN "mediumThreshold" DOUBLE PRECISION,
ADD COLUMN "fullThreshold" DOUBLE PRECISION;

ALTER TABLE "TaskSupplyRunItem"
ADD COLUMN "stateMode" TEXT NOT NULL DEFAULT 'direct_state',
ADD COLUMN "mediumThreshold" DOUBLE PRECISION,
ADD COLUMN "fullThreshold" DOUBLE PRECISION;

UPDATE "PropertySupply"
SET
  "stateMode" = CASE
    WHEN LOWER(COALESCE("trackingMode", '')) IN ('numeric_thresholds', 'numeric', 'stock', 'stock_level', 'quantity')
      THEN 'numeric_thresholds'
    WHEN "targetStock" IS NOT NULL OR "targetLevel" IS NOT NULL
      THEN 'numeric_thresholds'
    ELSE 'direct_state'
  END,
  "mediumThreshold" = COALESCE("mediumThreshold", "minimumThreshold", "reorderThreshold", "warningThreshold"),
  "fullThreshold" = COALESCE("fullThreshold", "targetLevel", "targetStock");

UPDATE "PropertySupply"
SET "fullThreshold" = CASE
  WHEN "stateMode" = 'numeric_thresholds' AND "fullThreshold" IS NULL AND "mediumThreshold" IS NOT NULL
    THEN "mediumThreshold" + 1
  WHEN "stateMode" = 'numeric_thresholds' AND "fullThreshold" IS NULL
    THEN GREATEST(COALESCE("currentStock", 0), 1)
  ELSE "fullThreshold"
END;

UPDATE "PropertySupply"
SET "fillLevel" = CASE
  WHEN "stateMode" = 'numeric_thresholds' AND COALESCE("currentStock", 0) < COALESCE("mediumThreshold", 0)
    THEN 'missing'
  WHEN "stateMode" = 'numeric_thresholds' AND COALESCE("currentStock", 0) >= COALESCE("mediumThreshold", 0)
    AND COALESCE("currentStock", 0) < COALESCE("fullThreshold", COALESCE("mediumThreshold", 0) + 1)
    THEN 'medium'
  WHEN "stateMode" = 'numeric_thresholds'
    THEN 'full'
  ELSE LOWER(COALESCE("fillLevel", 'full'))
END;

UPDATE "TaskSupplyRunItem"
SET
  "stateMode" = CASE
    WHEN LOWER(COALESCE("trackingMode", '')) IN ('numeric_thresholds', 'numeric', 'stock', 'stock_level', 'quantity')
      THEN 'numeric_thresholds'
    WHEN "targetStock" IS NOT NULL OR "targetLevel" IS NOT NULL
      THEN 'numeric_thresholds'
    ELSE 'direct_state'
  END,
  "mediumThreshold" = COALESCE("mediumThreshold", "minimumThreshold", "reorderThreshold", "warningThreshold"),
  "fullThreshold" = COALESCE("fullThreshold", "targetLevel", "targetStock");

UPDATE "TaskSupplyRunItem"
SET "fullThreshold" = CASE
  WHEN "stateMode" = 'numeric_thresholds' AND "fullThreshold" IS NULL AND "mediumThreshold" IS NOT NULL
    THEN "mediumThreshold" + 1
  WHEN "stateMode" = 'numeric_thresholds' AND "fullThreshold" IS NULL
    THEN GREATEST(COALESCE("currentStock", 0), 1)
  ELSE "fullThreshold"
END;

UPDATE "TaskSupplyRunItem"
SET "fillLevel" = CASE
  WHEN "stateMode" = 'numeric_thresholds' AND COALESCE("currentStock", 0) < COALESCE("mediumThreshold", 0)
    THEN 'missing'
  WHEN "stateMode" = 'numeric_thresholds' AND COALESCE("currentStock", 0) >= COALESCE("mediumThreshold", 0)
    AND COALESCE("currentStock", 0) < COALESCE("fullThreshold", COALESCE("mediumThreshold", 0) + 1)
    THEN 'medium'
  WHEN "stateMode" = 'numeric_thresholds'
    THEN 'full'
  ELSE LOWER(COALESCE("fillLevel", 'full'))
END;

ALTER TABLE "PropertySupply"
ADD CONSTRAINT "PropertySupply_stateMode_check"
CHECK ("stateMode" IN ('direct_state', 'numeric_thresholds'));

ALTER TABLE "TaskSupplyRunItem"
ADD CONSTRAINT "TaskSupplyRunItem_stateMode_check"
CHECK ("stateMode" IN ('direct_state', 'numeric_thresholds'));

ALTER TABLE "PropertySupply"
ADD CONSTRAINT "PropertySupply_numeric_thresholds_check"
CHECK (
  "stateMode" <> 'numeric_thresholds'
  OR (
    "mediumThreshold" IS NOT NULL
    AND "fullThreshold" IS NOT NULL
    AND "fullThreshold" > "mediumThreshold"
  )
);

ALTER TABLE "TaskSupplyRunItem"
ADD CONSTRAINT "TaskSupplyRunItem_numeric_thresholds_check"
CHECK (
  "stateMode" <> 'numeric_thresholds'
  OR (
    "mediumThreshold" IS NOT NULL
    AND "fullThreshold" IS NOT NULL
    AND "fullThreshold" > "mediumThreshold"
  )
);

CREATE INDEX "PropertySupply_stateMode_idx" ON "PropertySupply"("stateMode");
CREATE INDEX "TaskSupplyRunItem_stateMode_idx" ON "TaskSupplyRunItem"("stateMode");
