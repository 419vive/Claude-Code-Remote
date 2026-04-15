#!/usr/bin/env node
/**
 * Idempotent startup migrations for Railway / production deploy.
 *
 * Why this exists: the existing `drizzle/0002`, `0003`, `0004*.sql` migration
 * files are NOT tracked in `_journal.json`, so `drizzle-kit migrate` can't
 * apply them automatically. Rather than rely on a human to remember to run
 * `npm run db:push` after deploy, this script:
 *
 *   1. Connects to the production MySQL via DATABASE_URL.
 *   2. Checks INFORMATION_SCHEMA for each known schema change.
 *   3. Applies the ALTER TABLE only if the column / index is missing.
 *
 * It's intentionally CONSERVATIVE (no destructive operations) and IDEMPOTENT
 * (safe to re-run on every container start). New schema changes should be
 * appended here and to the matching `drizzle/NNNN_*.sql` file.
 *
 * If DATABASE_URL is unset (local dev / tests / CI sandbox), this script is
 * a no-op — it logs a warning and exits 0 so the container can still start.
 */
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
  console.warn('[migrate] No DATABASE_URL set — skipping startup migrations.');
  process.exit(0);
}

let conn;
try {
  conn = await mysql.createConnection(url);
} catch (err) {
  console.error('[migrate] ❌ Could not connect to DATABASE_URL:', err?.message || err);
  // Fail open: let the app start anyway. The app has fallback behavior for
  // missing columns (reads return undefined → falsy) so the bot stays alive,
  // and the operator can re-run the migration manually.
  process.exit(0);
}

async function columnExists(table, column) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS n
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?`,
    [table, column]
  );
  return Number(rows[0]?.n || 0) > 0;
}

async function run(label, sql) {
  try {
    console.log(`[migrate] → ${label}`);
    await conn.query(sql);
    console.log(`[migrate] ✅ ${label}`);
  } catch (err) {
    console.error(`[migrate] ❌ ${label} failed:`, err?.message || err);
    // Don't exit non-zero — the app should still come up. Operator can fix
    // manually via `npm run db:push` or a direct SQL session.
  }
}

try {
  // ── 0004: add `conversations.aiDisabled` (operator-takeover lock flag) ──
  if (!(await columnExists('conversations', 'aiDisabled'))) {
    await run(
      "0004 ALTER TABLE conversations ADD COLUMN aiDisabled int NOT NULL DEFAULT 0",
      "ALTER TABLE `conversations` ADD COLUMN `aiDisabled` int NOT NULL DEFAULT 0"
    );
  } else {
    console.log('[migrate] aiDisabled column already exists — skipping 0004');
  }

  console.log('[migrate] ✅ All startup migrations complete.');
} finally {
  await conn.end();
}
