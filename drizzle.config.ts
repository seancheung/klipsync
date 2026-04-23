import type { Config } from "drizzle-kit";

const dataDir = process.env.DATA_DIR ?? "./data";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: `${dataDir}/klipsync.db`,
  },
  strict: true,
  verbose: true,
} satisfies Config;
