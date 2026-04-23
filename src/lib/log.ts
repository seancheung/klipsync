/**
 * 结构化日志 —— 每行一个 JSON，生产打 stdout（Docker 默认捕获到 `docker logs`）。
 *
 * 字段约定：
 *   - t:    ISO 时间戳
 *   - level:'debug' | 'info' | 'warn' | 'error'
 *   - scope:模块名（如 'api', 'session-gc', 'gc'），便于 `jq 'select(.scope=="api")'`
 *   - msg:  一句话描述
 *   - ...:  其它键值（requestId、status、code 等）
 *
 * 选择 JSON 行而不是引入 pino：本项目规模小、单进程、不需要 transport，
 * 标准输出 + Docker 收集已足够，避免一个额外的重依赖。
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogFields {
  [key: string]: unknown;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function currentMinLevel(): number {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  if (raw in LEVEL_ORDER) return LEVEL_ORDER[raw as LogLevel];
  return LEVEL_ORDER.info;
}

function write(level: LogLevel, scope: string, msg: string, fields?: LogFields) {
  if (LEVEL_ORDER[level] < currentMinLevel()) return;
  const line = JSON.stringify({
    t: new Date().toISOString(),
    level,
    scope,
    msg,
    ...(fields ?? {}),
  });
  // warn / error 走 stderr，便于按流分离；其余 stdout
  if (level === "error" || level === "warn") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export interface Logger {
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
  child(extra: LogFields): Logger;
}

export function createLogger(scope: string, base: LogFields = {}): Logger {
  const mix = (fields?: LogFields) => ({ ...base, ...(fields ?? {}) });
  return {
    debug: (msg, fields) => write("debug", scope, msg, mix(fields)),
    info: (msg, fields) => write("info", scope, msg, mix(fields)),
    warn: (msg, fields) => write("warn", scope, msg, mix(fields)),
    error: (msg, fields) => write("error", scope, msg, mix(fields)),
    child: (extra) => createLogger(scope, { ...base, ...extra }),
  };
}

export const log = createLogger("app");
