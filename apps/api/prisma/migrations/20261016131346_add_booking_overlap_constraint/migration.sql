-- As Prisma cannot describe exclusion constraints, so this is hand-written SQL.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Backstop for the API rule: the database must reject a second APPROVED or COLLECTED booking for the same equipment on overlapping dates, even if two requests race.
-- '[]' makes both the start and end dates inclusive.
ALTER TABLE "Booking"
  ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist (
    "equipmentId" WITH =,
    daterange("startDate", "endDate", '[]') WITH &&
  )
  WHERE ("status" IN ('APPROVED', 'COLLECTED'));

-- A booking cannot be ended before it starts.
ALTER TABLE "Booking"
  ADD CONSTRAINT "booking_dates_valid"
  CHECK ("startDate" <= "endDate");