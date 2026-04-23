# KlipSync

> 家庭与小团队自托管的多端剪贴板同步工具。单容器部署，SQLite + 本地卷即可跑起来；内网使用、数据不离设备。

- **适用场景**：家里 NAS / 小团队内网；≤ 10 人、典型剪贴板量 < 1 MB 文本 + 偶发附件
- **镜像**：`ghcr.io/seancheung/klipsync:latest`（GitHub Container Registry）
- **默认端口**：`3000`（HTTP，建议前置反代终止 TLS）

---

## 快速开始

容器内 entrypoint 会先跑数据库迁移（幂等）再启动服务，无需手动初始化。数据全部落在挂载到容器 `/data` 的目录里。

### 方式一：`docker run`（最小命令）

```bash
mkdir -p ./data

docker run -d \
  --name klipsync \
  --restart unless-stopped \
  -p 3000:3000 \
  -v "$(pwd)/data:/data" \
  ghcr.io/seancheung/klipsync:latest
```

容器跑起来后：

1. 浏览器打开 `http://<宿主 IP>:3000`，会自动 302 到 `/setup`
2. 创建首个 Admin（用户名 ≥ 3 位 / 密码 ≥ 8 位）
3. 之后的普通用户由 Admin 在「用户管理」里创建

升级：

```bash
docker pull ghcr.io/seancheung/klipsync:latest
docker stop klipsync && docker rm klipsync
# 用同样的 docker run 命令再起一次，数据保留在 ./data
```

### 方式二：`docker compose`（推荐）

新建 `docker-compose.yml`：

```yaml
services:
  klipsync:
    image: ghcr.io/seancheung/klipsync:latest
    container_name: klipsync
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/data
    environment:
      # 反代终止 TLS 时打开下面两项（详见下文「反向代理」）
      # TRUST_PROXY: "true"
      # COOKIE_SECURE: "true"
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000/api/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s
```

启动 / 升级：

```bash
docker compose up -d                  # 启动
docker compose pull && docker compose up -d   # 升级（迁移会在新容器启动时自动执行）
docker compose logs -f klipsync       # 跟日志
docker compose down                   # 停止并移除容器（数据不会被删）
```

如需锁定版本，把 `latest` 换成具体 tag（例如 `ghcr.io/seancheung/klipsync:v1.0.0`）。

---

## 环境变量

容器只暴露 HTTP，TLS 一律交给反代。下面这些变量在 `docker run -e KEY=VALUE` 或 compose 的 `environment:` 里按需注入即可，没配也能跑起来。

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 容器内监听端口，通常不改 |
| `DATA_DIR` | `/data` | SQLite + 附件的落盘根目录，和卷挂载点对齐 |
| `TRUST_PROXY` | `false` | 走反代时设为 `true`，登录限流会从 `X-Forwarded-For` 取真实 IP |
| `COOKIE_SECURE` | `false` | 反代终止 TLS 时设为 `true`，Session cookie 仅在 HTTPS 下发送 |
| `LOG_LEVEL` | `info` | `debug` / `info` / `warn` / `error`，结构化 JSON 输出到 stdout |

完整字段见 `.env.example` 内的注释。

---

## 反向代理

容器只暴露 HTTP，建议挂在 Caddy / Nginx / NPM 等反代后面。**反代必须透传 `X-Forwarded-For` 与 `X-Forwarded-Proto`**，否则：

- 登录限流从反代 IP 取值 → 所有人共用一个桶，会互相踩到限流阈值。
- Next.js 无法判断请求是 HTTPS，cookie `Secure` 语义和外链域名会出错。

同时 SSE 长连接要求反代关闭 response buffer、放宽读超时。

#### Caddy（推荐，最少配置）

```caddy
klip.example.com {
    reverse_proxy klipsync:3000
}
```

Caddy 的 `reverse_proxy` 默认写入 `X-Forwarded-For` / `X-Forwarded-Proto` / `X-Forwarded-Host`，SSE 也开箱即用。

#### Nginx Proxy Manager

Proxy Host 配置：

- Scheme: `http`
- Forward Hostname: 容器名或宿主 IP（`klipsync` / `192.168.1.10`）
- Forward Port: `3000`
- Websockets Support: **开启**（SSE 长连接需要）
- Advanced 选项卡 Custom Nginx Configuration：

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;

# SSE 长连接：关 buffer，允许长超时
proxy_buffering off;
proxy_read_timeout 3600s;
```

#### 手写 Nginx 片段

```nginx
location / {
    proxy_pass http://klipsync:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;

    # SSE
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;
}
```

挂反代后记得把 `TRUST_PROXY=true` 和 `COOKIE_SECURE=true` 打开。

---

## 健康检查

- `GET /api/health`：无需鉴权，返回 `{ ok, db, uptime }`。`ok=false` 时 HTTP 503。
- Compose 内置 healthcheck 每 30s 打一次，配合 `restart: unless-stopped` 做进程级恢复。

---

## 备份与恢复

SQLite 是单文件数据库，`./data` 下 `klipsync.db` + `klipsync.db-wal` + `klipsync.db-shm` 以及 `attachments/` 就是全部状态。

**冷备份**（推荐，简单可靠）：

```bash
docker compose stop klipsync
tar czf klipsync-backup-$(date +%F).tgz ./data
docker compose start klipsync
```

恢复时：停容器 → 解包覆盖 `./data` → 启动。

**热备份**（不停服）：

```bash
docker compose exec klipsync sh -c \
  "sqlite3 /data/klipsync.db \".backup '/data/klipsync-snapshot.db'\""
tar czf klipsync-hotbackup-$(date +%F).tgz \
  ./data/klipsync-snapshot.db ./data/attachments
```

> 附件文件独立落盘，SQLite 备份只覆盖元数据。做热备时也要带上 `attachments/` 目录。

---

## PWA 与离线

- HTML 走 NetworkFirst，保证登录 / 版本及时刷新；
- 静态资源按 hash 走 CacheFirst；
- 新版本上线后 `skipWaiting` + `clientsClaim` 立即生效，无需手动刷新；
- iOS / Android 浏览器都可以「添加到主屏幕」以 PWA 模式打开。

---

## 常见问题

- **端口被占用**：改 compose 里 `3000:3000` 的前半段，或 `docker run` 的 `-p 8080:3000`。
- **容器起不来，日志 `SQLITE_CANTOPEN`**：`./data` 权限不对；容器内使用 uid/gid `1001:1001`，把宿主目录 `chown -R 1001:1001 ./data` 或放宽权限即可。
- **登录频繁被限流**：反代没把 `X-Forwarded-For` 透传到容器，或忘了 `TRUST_PROXY=true`。
- **扫码二维码链接是内网 IP**：在「管理员 → 系统设置」里填写「公开访问基址」，之后 QR 会用它拼 URL。

---
---

# 贡献者指南

以下内容面向希望本地调试、阅读源码或提交 PR 的开发者；只想跑起来用的用户可以忽略。

## 架构总览

```
Browser (Desktop + Mobile，PWA)
  │ HTTPS（外部反代终止 TLS）
  ▼
Next.js 16 Server（单进程 Node runtime）
  ├── Route Handlers / Server Actions
  ├── Auth / RBAC / Ownership Middleware
  ├── Drizzle ORM → SQLite（WAL）
  ├── 文件附件 → /data/attachments/{user}/{clip}/{file}
  └── SSE Hub（进程内 EventEmitter，按 userId 分发）
  │
  ▼
Volume: /data
  ├── klipsync.db            SQLite 主库
  ├── klipsync.db-wal / -shm WAL 热文件
  └── attachments/…
```

**技术栈**：Next.js 16 App Router + TypeScript + Tailwind + shadcn/ui；后端 Route Handlers + SQLite（WAL）+ Drizzle ORM；SSE 做多端同步；Docker 单容器部署。

更详尽的架构图、请求生命周期、数据模型见：

- [`.faststack/product.md`](./.faststack/product.md) — 产品设计
- [`.faststack/technical.md`](./.faststack/technical.md) — 技术方案（第 2 节是架构、§11.1 是环境变量）
- [`.faststack/design.md`](./.faststack/design.md) — UI 规范

## 本地开发

前置要求：Node.js 20 LTS 或更高（`engines.node` 声明 `>=20.9.0`）。

```bash
npm install
cp .env.example .env.local          # 按需改 DATA_DIR 等
npm run db:generate                 # 仅在 src/lib/db/schema.ts 改动后需要
npm run db:migrate                  # 应用迁移并 seed 默认 system_config
npm run dev                         # http://localhost:3000
```

首次访问 `/` 会被引导到 `/setup` 创建第一个 Admin。

## 常用脚本

| 脚本 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发服务器（Turbopack 禁用） |
| `npm run build` | 生产构建（Next.js standalone 输出） |
| `npm run start` | 启动已构建产物 |
| `npm run lint` | ESLint（`next/core-web-vitals` + Prettier） |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run format` / `format:check` | Prettier 格式化 / 校验 |
| `npm run db:generate` | 生成 Drizzle 迁移 SQL |
| `npm run db:migrate` | 跑迁移（开发用 tsx 直接运行） |
| `npm run build:migrate` | 把 migrate 脚本 esbuild 成 `dist/migrate.cjs`（Dockerfile 用） |

## 自己构建镜像

仓库根目录的 `Dockerfile` 是三阶段构建（`deps` → `builder` → `runner`），产物是非 root（uid/gid `1001:1001`）运行的 standalone Next.js + bundled migrate 脚本。本地构建：

```bash
docker build -t klipsync:dev .
docker run --rm -p 3000:3000 -v "$(pwd)/data:/data" klipsync:dev
```

`docker-compose.yml` 里默认写了 `build:` 段，`docker compose up --build` 会就地构建并运行。

---

## 许可

项目为内部 / 自托管使用，未附开源许可证；如需二次分发请先联系仓库 owner。
