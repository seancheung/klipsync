import { z } from "zod";

/**
 * 环境变量 schema —— 对应 technical.md §11.1
 * 校验失败即抛错，避免带着坏配置启动。
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATA_DIR: z.string().min(1).default("./data"),
  DATABASE_URL: z.string().optional(),
  TRUST_PROXY: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("[env] Invalid environment variables:", z.treeifyError(parsed.error));
    throw new Error("Invalid environment configuration");
  }
  const resolved = {
    ...parsed.data,
    DATABASE_URL: parsed.data.DATABASE_URL ?? `file:${parsed.data.DATA_DIR}/klipsync.db`,
  };
  return Object.freeze(resolved);
}

export const env = loadEnv();
export type Env = typeof env;
