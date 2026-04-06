ALTER TABLE "Task"
ADD CONSTRAINT "Task_booking_source_requires_booking_id"
CHECK (
  lower("source") <> 'booking'
  OR "bookingId" IS NOT NULL
) NOT VALID;

-- Existing invalid rows remain visible for audit/remediation.
-- After remediation, validate the constraint with:
-- ALTER TABLE "Task" VALIDATE CONSTRAINT "Task_booking_source_requires_booking_id";
