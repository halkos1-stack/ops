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
  ALTER COLUMN "stateMode" DROP DEFAULT,
  ALTER COLUMN "stateMode" TYPE "public"."PropertySupplyStateMode"
  USING ("stateMode"::text::"public"."PropertySupplyStateMode"),
  ALTER COLUMN "stateMode" SET DEFAULT 'direct_state'::"public"."PropertySupplyStateMode";

ALTER TABLE "TaskSupplyRunItem"
  ALTER COLUMN "stateMode" DROP DEFAULT,
  ALTER COLUMN "stateMode" TYPE "public"."PropertySupplyStateMode"
  USING ("stateMode"::text::"public"."PropertySupplyStateMode"),
  ALTER COLUMN "stateMode" SET DEFAULT 'direct_state'::"public"."PropertySupplyStateMode";
