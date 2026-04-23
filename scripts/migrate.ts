/**
 * 迁移入口：
 *   npm run db:migrate         # 或直接 `node scripts/migrate.js`（Docker entrypoint）
 *
 * 步骤：
 *   1. 打开（必要时创建）${DATA_DIR}/klipsync.db，开启 WAL / FK / busy_timeout
 *   2. 跑 drizzle `migrate(db, { migrationsFolder: './drizzle' })`
 *   3. seed system_config：max_attachment_mb = 10、public_base_url = ""（仅当不存在）
 */

import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { systemConfig } from "../src/lib/db/schema";

function main() {
  const dataDir = process.env.DATA_DIR ?? "./data";
  const dbFile = resolve(dataDir, "klipsync.db");

  if (!existsSync(dirname(dbFile))) {
    mkdirSync(dirname(dbFile), { recursive: true });
  }

  const sqlite = new Database(dbFile);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  const db = drizzle(sqlite, { schema: { systemConfig } });

  console.log(`[migrate] applying migrations → ${dbFile}`);
  migrate(db, { migrationsFolder: resolve(process.cwd(), "drizzle") });

  const now = Date.now();
  const seed = sqlite.prepare(
    "INSERT OR IGNORE INTO system_config (key, value, updated_at) VALUES (?, ?, ?)",
  );

  const seeds: Array<[string, string, string]> = [
    ["max_attachment_mb", "10", "10"],
    ["public_base_url", "", "(empty)"],
  ];
  for (const [key, value, display] of seeds) {
    const r = seed.run(key, value, now);
    if (r.changes > 0) {
      console.log(`[migrate] seeded system_config.${key} = ${display}`);
    } else {
      console.log(`[migrate] system_config.${key} already present, skipping seed`);
    }
  }

  sqlite.close();
  console.log("[migrate] done");
}

main();
