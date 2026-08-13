-- Backfill workout_sessions.planId / dayNumber for sessions that were
-- started from a plan BEFORE those columns existed.
--
-- Background: startPlanDay (src/controllers/plans.controller.ts) now stores
-- planId/dayNumber directly on the session it creates, but that only
-- happens going forward. Older sessions only recorded the plan/day as free
-- text in `notes`, e.g.:
--   "From plan: Full Body Strength Builder — Day 1 — Full Body A"
-- This script reconstructs that exact string from the plan_days/
-- workout_plans tables and, wherever it finds a single unambiguous match,
-- fills in the missing planId/dayNumber.
--
-- It cannot recover sessions whose original plan has since been deleted —
-- there's nothing left to match against, and that's expected (no error,
-- the row is just left alone).
--
-- Safe to re-run: only ever touches rows where "planId" IS NULL, and only
-- writes a match when it's unambiguous (exactly one plan+day reconstructs
-- the same notes/name pair for that user).
--
-- Usage:
--   1. Run the PREVIEW query below first and eyeball the results.
--   2. Run the transaction. It does NOT auto-commit — inspect the output
--      of the UPDATE (row count, and re-run the preview query in the same
--      session to see the "after" state), then either:
--        COMMIT;
--      or, if something looks wrong:
--        ROLLBACK;
--
--   psql "$DATABASE_URL" -f scripts/backfill_plan_links.sql   -- runs it all
--   -- or paste sections into your SQL client interactively.

-- ── PREVIEW: what would be backfilled ──────────────────────────────────────
WITH candidates AS (
  SELECT
    ws.id                    AS session_id,
    ws."userId"               AS user_id,
    ws.name                   AS session_name,
    ws.notes                  AS session_notes,
    wp.id                     AS plan_id,
    wp.name                   AS plan_name,
    pd."dayNumber"            AS day_number,
    pd.label                  AS day_label,
    COUNT(*) OVER (PARTITION BY ws.id) AS match_count
  FROM workout_sessions ws
  JOIN plan_days pd
    ON ws.name = pd."sessionName"
  JOIN workout_plans wp
    ON wp.id = pd."planId"
   AND ws.notes = 'From plan: ' || wp.name || ' — ' || pd.label
   AND (wp."ownerId" = ws."userId" OR wp.visibility = 'PUBLIC')
  WHERE ws."planId" IS NULL
    AND ws.notes LIKE 'From plan: %'
)
SELECT session_id, user_id, session_name, plan_name, day_number, day_label,
       match_count,
       CASE WHEN match_count > 1 THEN 'AMBIGUOUS — will be skipped' ELSE 'will be backfilled' END AS outcome
FROM candidates
ORDER BY session_id;

-- Sessions with plan-origin notes that found NO match at all (plan/day was
-- since renamed or deleted — nothing to backfill from, expected to stay NULL):
SELECT ws.id AS session_id, ws."userId" AS user_id, ws.name, ws.notes
FROM workout_sessions ws
WHERE ws."planId" IS NULL
  AND ws.notes LIKE 'From plan: %'
  AND NOT EXISTS (
    SELECT 1 FROM plan_days pd
    JOIN workout_plans wp ON wp.id = pd."planId"
    WHERE ws.name = pd."sessionName"
      AND ws.notes = 'From plan: ' || wp.name || ' — ' || pd.label
      AND (wp."ownerId" = ws."userId" OR wp.visibility = 'PUBLIC')
  );

-- ── APPLY ────────────────────────────────────────────────────────────────
BEGIN;

WITH candidates AS (
  SELECT
    ws.id          AS session_id,
    pd."planId"    AS plan_id,
    pd."dayNumber" AS day_number,
    COUNT(*) OVER (PARTITION BY ws.id) AS match_count
  FROM workout_sessions ws
  JOIN plan_days pd
    ON ws.name = pd."sessionName"
  JOIN workout_plans wp
    ON wp.id = pd."planId"
   AND ws.notes = 'From plan: ' || wp.name || ' — ' || pd.label
   AND (wp."ownerId" = ws."userId" OR wp.visibility = 'PUBLIC')
  WHERE ws."planId" IS NULL
    AND ws.notes LIKE 'From plan: %'
)
UPDATE workout_sessions ws
SET "planId" = c.plan_id,
    "dayNumber" = c.day_number,
    "updatedAt" = now()
FROM candidates c
WHERE ws.id = c.session_id
  AND c.match_count = 1;

-- Inspect the row count Postgres reports for the UPDATE above, and/or
-- re-run the preview SELECT in this same session, then:
--   COMMIT;
-- or:
--   ROLLBACK;
