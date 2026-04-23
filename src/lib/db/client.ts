import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import Database, { type Database as DatabaseType } from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

type DbHolder = { db: Db; sqlite: DatabaseType };

// HMR-safe 单例：next dev 热更新 / Node test 多次 import 时不重复 open
// —— 详见 technical.md "关键说明"
const globalForDb = globalThis as unknown as { __klipsyncDb?: DbHolder };

function open(): DbHolder {
  const dataDir = process.env.DATA_DIR ?? "./data";
  const dbFile = resolve(dataDir, "klipsync.db");

  if (!existsSync(dirname(dbFile))) {
    mkdirSync(dirname(dbFile), { recursive: true });
  }

  const sqlite = new Database(dbFile);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

function getHolder(): DbHolder {
  if (!globalForDb.__klipsyncDb) {
    globalForDb.__klipsyncDb = open();
  }
  return globalForDb.__klipsyncDb;
}

export const db: Db = new Proxy({} as Db, {
  get(_, prop) {
    const holder = getHolder();
    const value = holder.db[prop as keyof Db];
    return typeof value === "function" ? value.bind(holder.db) : value;
  },
});

/** 暴露底层 better-sqlite3 句柄，给 migrate / transaction / pragma 使用。 */
export function getSqlite(): DatabaseType {
  return getHolder().sqlite;
}

/**
 * 以 `BEGIN IMMEDIATE` 语义执行事务（防止读事务升级时产生 SQLITE_BUSY）。
 * 首次 setup 的并发保护（technical.md §13 风险表）就靠它。
 *
 * 注意：better-sqlite3 的 .transaction() 包装默认是 DEFERRED；这里手动起 IMMEDIATE。
 */
export function withTransaction<T>(fn: (db: Db) => T): T {
  const holder = getHolder();
  holder.sqlite.prepare("BEGIN IMMEDIATE").run();
  try {
    const result = fn(holder.db);
    holder.sqlite.prepare("COMMIT").run();
    return result;
  } catch (err) {
    holder.sqlite.prepare("ROLLBACK").run();
    throw err;
  }
}

export { schema };
