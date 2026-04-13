DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'PropertySupplyStateMode'
  ) THEN
    CREATE TYPE "public"."PropertySupplyStateMode" AS ENUM (
      'direct_state',
      'numeric_thresholds'
    );
  END IF;
END
$$;

ALTER TABLE "PropertySupply"
  DROP CONSTRAINT IF EXISTS "PropertySupply_stateMode_check",
  DROP CONSTRAINT IF EXISTS "PropertySupply_numeric_thresholds_check";

ALTER TABLE "TaskSupplyRunItem"
  DROP CONSTRAINT IF EXISTS "TaskSupplyRunItem_stateMode_check",
  DROP CONSTRAINT IF EXISTS "TaskSupplyRunItem_numeric_thresholds_check";

ALTER TABLE "PropertySupply"
  ALTER COLUMN "stateMode" DROP DEFAULT,
  ALTER COLUMN "stateMode" TYPE "public"."PropertySupplyStateMode"
  USING ("stateMode"::text::"public"."PropertySupplyStateMode"),
  ALTER COLUMN "stateMode" SET DEFAULT 'direct_state'::"public"."PropertySupplyStateMode";

ALTER TABLE "TaskSupplyRunItem"
  ALTER COLUMN "stateMode" DROP DEFAULT,
  ALTER COLUMN "stateMode" TYPE "public"."PropertySupplyStateMode"
  USING ("stateMode"::text::"public"."PropertySupplyStateMode"),
  ALTER COLUMN "stateMode" SET DEFAULT 'direct_state'::"public"."PropertySupplyStateMode";

ALTER TABLE "PropertySupply"
  ADD CONSTRAINT "PropertySupply_numeric_thresholds_check"
  CHECK (
    "stateMode" <> 'numeric_thresholds'::"public"."PropertySupplyStateMode"
    OR (
      "mediumThreshold" IS NOT NULL
      AND "fullThreshold" IS NOT NULL
      AND "fullThreshold" > "mediumThreshold"
    )
  );

ALTER TABLE "TaskSupplyRunItem"
  ADD CONSTRAINT "TaskSupplyRunItem_numeric_thresholds_check"
  CHECK (
    "stateMode" <> 'numeric_thresholds'::"public"."PropertySupplyStateMode"
    OR (
      "mediumThreshold" IS NOT NULL
      AND "fullThreshold" IS NOT NULL
      AND "fullThreshold" > "mediumThreshold"
    )
  );
