#!/bin/sh
set -euo pipefail

echo "[entrypoint] KlipSync starting…"
echo "[entrypoint] DATA_DIR=${DATA_DIR:-/data}  PORT=${PORT:-3000}  NODE_ENV=${NODE_ENV:-production}"

# 1) 迁移：幂等、空库会自动建表 + seed，不需要人工干预
node scripts/migrate.cjs

# 2) 启动 Next.js standalone server（CMD 会传入 `node server.js`）
exec "$@"
