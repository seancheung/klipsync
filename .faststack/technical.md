# KlipSync · 技术设计文档

> 上游：[产品设计](./product.md) ｜ [UI 设计](./design.md) ｜ 下游：[任务拆解](./tasks.md)

## 1. 技术栈

| 层 | 选型 | 理由 |
| --- | --- | --- |
| 前端框架 | **Next.js 16 (App Router) + TypeScript** | 全栈一体，单仓库单进程易于部署；App Router + Server Components 可让列表等非敏感数据走 SSR，弱网下首屏更快；生态齐全，vibecoding 友好 |
| 样式 / UI 组件 | **Tailwind CSS + shadcn/ui** | 无运行时开销；shadcn 直接把源码复制进仓库，便于按 `design.md` 的 Crisp Canvas 规范改造（Design Tokens 以 CSS 变量注入 `:root`） |
| 状态 / 数据 | **TanStack Query + Zustand**（轻量本地态） | Query 负责请求缓存、乐观更新、断线重连重取；Zustand 管"当前激活态 / SSE 连接状态"等 UI 状态 |
| 表单 / 校验 | **react-hook-form + zod** | zod schema 前后端共用；react-hook-form 做受控表单 |
| 编辑器 | 原生 `<textarea>` + 防抖 | 需求只需纯文本；不引入 CodeMirror / Monaco，避免体积爆炸 |
| 二维码 | **qrcode.react** | 客户端 SVG 生成，无需后端 |
| 后端 | **Next.js Route Handlers + Server Actions**（Node runtime） | 与前端同仓库同进程；Node runtime 原生支持 SSE streaming |
| 数据库 | **SQLite（WAL 模式）+ Drizzle ORM** | 单文件、零外部服务、NAS 挂载卷即可备份；Drizzle 比 Prisma 轻、SQLite 支持好、类型推导完整 |
| SQLite 驱动 | **better-sqlite3** | 同步 API，事务 + WAL 下性能与并发足以覆盖家庭场景（≤ 10 人） |
| 多端同步 | **SSE (Server-Sent Events)** | 单向下发即可满足 FR-030/031/032；HTTP 长连接反代友好、断线自动重连；比 WebSocket 少一半实现复杂度 |
| 认证 | **自建**：argon2id + httpOnly Session Cookie | 需求单一（用户名/密码 + 强制改密 + 长期登录），200 行内可控；Auth.js / Better Auth 太重 |
| 密码哈希 | **@node-rs/argon2** | argon2id 是 OWASP 当前首推；Rust 实现性能比 bcrypt 好 |
| 附件存储 | **本地文件系统**（挂载卷） | FR-061 硬要求；对象存储在家庭场景是过度工程 |
| 图标 | **lucide-react** | `design.md` 指定；按需 tree-shake |
| 字体 | **`geist` npm 包 + `next/font/google` (Inter)** | `design.md` 指定 Geist / Inter / Geist Mono；Next.js 构建时自动下载 Google 字体并打包进 `.next/static`，运行时完全自托管，无外网依赖（比 Bunny CDN 更适合 NAS 内网部署），同时满足原设计"不给 Google 发请求"的 GDPR 目标 |
| PWA | **@serwist/next** | `next-pwa` 的官方继任者，活跃维护，支持 App Router |
| 构建 / 运行时 | Node.js 20 LTS（或更高） | Next.js 16 对 Node 最低版本要求进一步提升；选当前 LTS 更稳 |
| 容器化 | **Docker**（多阶段构建）+ **Docker Compose**（单 service） | FR-060 硬要求；单容器一个进程，卷挂载 `./data` |
| 反向代理 | **外部现成**（NAS 上的 Caddy / NPM / Traefik） | 容器只暴露 HTTP，不在容器内做 TLS；KlipSync 不提供反代 |

## 2. 架构总览

```
┌──────────────────────────────────────────────────────────┐
│  Browser（Desktop + Mobile，可 PWA 安装）                 │
│   ├── React UI (shadcn + Tailwind, Crisp Canvas)          │
│   ├── TanStack Query（REST 缓存 + 乐观更新）              │
│   ├── EventSource → /api/stream（按 userId 订阅）         │
│   └── Service Worker（Serwist，离线壳 + 静态缓存）        │
└────────────────────────────┬─────────────────────────────┘
                             │ HTTPS（由外部反代终止 TLS）
┌────────────────────────────▼─────────────────────────────┐
│  Next.js 16 Server（Node runtime, 单进程）                │
│                                                           │
│   [ Route Handlers / Server Actions ]                     │
│          │                                                │
│          ├─ Auth Middleware（Session → req.user）         │
│          ├─ RBAC Guard（admin-only routes）               │
│          ├─ Ownership Guard（clipboard/attachment 鉴权）  │
│          ├─ Drizzle ORM → SQLite                          │
│          ├─ FileStore（读写 /data/attachments）           │
│          └─ SSE Hub（进程内 EventEmitter，按 userId 分发）│
│                  │                                        │
│                  └─ mutation commit 后 publish            │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────┐
│  Volume: /data（宿主 NAS 挂载）                           │
│   ├── klipsync.db               SQLite 主库               │
│   ├── klipsync.db-wal / -shm    WAL 热文件                │
│   └── attachments/{userId}/{clipboardId}/{fileId}         │
└──────────────────────────────────────────────────────────┘
```

**请求生命周期（以"编辑文本"为例）**：

```
Client 防抖 300ms
  └─ PATCH /api/clipboards/:id { text }
       └─ Middleware: session → user
            └─ Ownership: clipboard.user_id === user.id ?
                 └─ Drizzle UPDATE clipboards SET text=?, updated_at=now()
                      └─ SSE Hub publish(user.id, { type:'clipboard.updated', id, text, updated_at })
                           └─ 所有该 user 的在线 SSE 连接收到事件
                                └─ TanStack Query invalidate / 直接合并到本地缓存
```

## 3. 目录结构

```
klipsync/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── drizzle.config.ts
├── .env.example
│
├── scripts/
│   └── migrate.ts                # 启动前执行 Drizzle migrations
│
├── drizzle/                      # 生成的迁移文件（纳入 git）
│   └── 0000_init.sql
│
└── src/
    ├── app/
    │   ├── layout.tsx            # AppShell + 字体注入
    │   ├── globals.css           # Crisp Canvas CSS 变量
    │   ├── manifest.ts           # PWA manifest
    │   │
    │   ├── (auth)/               # 不需登录态的路由组
    │   │   ├── setup/page.tsx           # P-001
    │   │   ├── login/page.tsx           # P-002
    │   │   └── force-reset/page.tsx     # P-003
    │   │
    │   ├── (app)/                # 需登录的路由组（layout 做鉴权）
    │   │   ├── layout.tsx               # TopBar + SSE Provider
    │   │   ├── page.tsx                 # 主工作台（重定向到 /c/new 或最近一条）
    │   │   ├── c/
    │   │   │   ├── new/page.tsx         # P-004 空白编辑区
    │   │   │   └── [id]/page.tsx        # P-004 激活剪贴板
    │   │   ├── settings/page.tsx        # P-005
    │   │   ├── forbidden/page.tsx       # P-008
    │   │   └── admin/
    │   │       ├── users/page.tsx       # P-006
    │   │       └── system/page.tsx      # P-007
    │   │
    │   └── api/
    │       ├── setup/route.ts           # POST: 创建首个 Admin；GET: 初始化状态
    │       ├── auth/
    │       │   ├── login/route.ts
    │       │   ├── logout/route.ts
    │       │   ├── change-password/route.ts
    │       │   └── force-reset/route.ts
    │       ├── clipboards/
    │       │   ├── route.ts             # GET list / POST create
    │       │   └── [id]/
    │       │       ├── route.ts         # GET / PATCH / DELETE
    │       │       └── attachments/route.ts   # POST upload
    │       ├── attachments/[id]/
    │       │   ├── route.ts             # DELETE
    │       │   └── download/route.ts    # GET 流式下载
    │       ├── stream/route.ts          # SSE 订阅
    │       └── admin/
    │           ├── users/route.ts       # GET / POST
    │           ├── users/[id]/
    │           │   ├── route.ts         # DELETE
    │           │   ├── reset-password/route.ts
    │           │   └── stats/route.ts
    │           └── config/route.ts      # GET / PATCH
    │
    ├── components/
    │   ├── ui/                   # shadcn 生成的原子组件
    │   ├── AppShell/
    │   ├── ClipboardList/
    │   ├── ClipboardEditor/
    │   ├── AttachmentDrawer/
    │   ├── QRCodePanel/
    │   ├── DeletedBanner/
    │   └── forms/
    │
    ├── lib/
    │   ├── db/
    │   │   ├── client.ts         # better-sqlite3 + Drizzle 实例（单例）
    │   │   └── schema.ts         # 表定义
    │   ├── auth/
    │   │   ├── session.ts        # cookie 读写 / 签发 / 校验
    │   │   ├── password.ts       # argon2id hash / verify
    │   │   └── middleware.ts     # requireUser / requireAdmin
    │   ├── sse/
    │   │   ├── hub.ts            # 进程内 EventEmitter，按 userId 分发
    │   │   └── events.ts         # 事件类型定义（zod schema）
    │   ├── storage/
    │   │   └── files.ts          # 附件读写、路径拼接、原子 rename
    │   ├── config/
    │   │   └── system.ts         # 读取 system_config 表（缓存 + 失效）
    │   ├── rate-limit/
    │   │   └── login.ts          # 登录失败计数（内存 LRU + 持久化兜底）
    │   └── validation/
    │       └── schemas.ts        # zod 请求体 schema（前后端共用）
    │
    ├── hooks/
    │   ├── useSSE.ts
    │   ├── useClipboards.ts
    │   └── useCurrentUser.ts
    │
    └── middleware.ts             # Next.js Edge middleware（仅做 "有无 Admin / 有无 session" 的粗路由）
```

**关键说明**：
- `middleware.ts`（Edge）只负责 `/setup` 与 `/login` 的粗重定向；细粒度鉴权放到 Route Handler / Server Component 层（Node runtime），避免 Edge runtime 连不上 SQLite。
- `lib/db/client.ts` 用模块级单例 + HMR-safe 包装（避免 `next dev` 热更新时反复开库）。

## 4. 数据模型

**命名规范**：表名复数 snake_case；主键 `id` 为 ULID（26 字符，自带时序性，便于按创建顺序排序）。时间戳一律存 UTC 毫秒（`INTEGER`），前端按需格式化。

### 4.1 users

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | TEXT | PK | ULID |
| username | TEXT | UNIQUE, NOT NULL | 3–32 字符，登录用 |
| password_hash | TEXT | NOT NULL | argon2id 哈希（含参数） |
| role | TEXT | NOT NULL, CHECK in ('admin','user') | RBAC |
| must_reset | INTEGER | NOT NULL, DEFAULT 0 | 0/1，FR-005 标志 |
| created_at | INTEGER | NOT NULL | |
| updated_at | INTEGER | NOT NULL | |

> 索引：`idx_users_username` UNIQUE。
> 约束：系统内 `role='admin'` 至少保留 1 人（删除/重置最后一个 Admin 在 service 层硬拦截，对应 §4.11 产品规格）。

### 4.2 clipboards

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | TEXT | PK | ULID |
| user_id | TEXT | FK users.id ON DELETE CASCADE | 所有者（= Space 的隐式容器） |
| text | TEXT | NOT NULL, DEFAULT '' | 可为空字符串（仅附件剪贴板） |
| pinned_at | INTEGER | NULL | 非空即置顶，值用于置顶内部排序（倒序）；NULL = 未置顶 |
| created_at | INTEGER | NOT NULL | |
| updated_at | INTEGER | NOT NULL | 文本 / 附件 / 置顶任一变更都会刷新 |

> 索引：
> - `idx_clipboards_user_pinned_updated` (user_id, pinned_at DESC, updated_at DESC) —— 覆盖 FR-010 默认排序
> - `idx_clipboards_user_updated` (user_id, updated_at DESC) —— 兜底

> 没有 `title` 字段（FR 范围外明确）；没有独立 `Space` 表（Space 是"隶属于 user 的 clipboards 集合"的概念名，物理上不存在）。

### 4.3 attachments

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | TEXT | PK | ULID，也作为磁盘文件名 |
| clipboard_id | TEXT | FK clipboards.id ON DELETE CASCADE | |
| user_id | TEXT | FK users.id ON DELETE CASCADE | 冗余字段，便于按用户扫描统计 |
| filename | TEXT | NOT NULL | 用户原始文件名（保留） |
| mime_type | TEXT | NOT NULL | |
| size_bytes | INTEGER | NOT NULL | |
| created_at | INTEGER | NOT NULL | |

> 索引：`idx_attachments_clipboard` (clipboard_id)。
> 物理文件路径：`${DATA_DIR}/attachments/${user_id}/${clipboard_id}/${id}`。

### 4.4 sessions

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| token_hash | TEXT | PK | SHA-256(token)，token 本身只在 Cookie 里，不入库 |
| user_id | TEXT | FK users.id ON DELETE CASCADE | |
| expires_at | INTEGER | NOT NULL | |
| remember | INTEGER | NOT NULL, DEFAULT 0 | 是否"记住我"（决定续期策略） |
| user_agent | TEXT | NULL | 便于未来做"活跃会话"页（本期不做） |
| created_at | INTEGER | NOT NULL | |
| last_seen_at | INTEGER | NOT NULL | 滑动续期基准 |

> 索引：`idx_sessions_user` (user_id)，`idx_sessions_expires` (expires_at)（供定时清理）。

### 4.5 system_config

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| key | TEXT | PK | |
| value | TEXT | NOT NULL | JSON 字符串 |
| updated_at | INTEGER | NOT NULL | |

> 初始化时 seed（幂等，key 已存在则跳过）：
> - `{"key":"max_attachment_mb","value":"10"}`（对应 FR-054 默认 10MB）
> - `{"key":"public_base_url","value":""}`（对应 FR-055；空字符串 = 未设置，运行时由 request host 派生）

### 4.6 login_attempts（防暴力破解）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | INTEGER | PK AUTOINCREMENT | |
| identifier | TEXT | NOT NULL | `username:ip` 组合哈希 |
| attempted_at | INTEGER | NOT NULL | |
| success | INTEGER | NOT NULL | 0/1 |

> 索引：`idx_login_attempts_id_time` (identifier, attempted_at DESC)。清理策略：保留 24h。

### 4.7 关系图

```
users (1) ──< (N) clipboards (1) ──< (N) attachments
  │
  └──< (N) sessions
```

## 5. API 设计

**约定**：
- 所有 API 走 JSON（除附件上传走 `multipart/form-data`、下载走 stream）。
- 错误返回 `{ error: { code, message } }`，HTTP 状态码与语义对齐。
- 鉴权靠 HttpOnly Cookie `klipsync_session`；API 无需显式 `Authorization` 头。
- 非己对象统一返 **404**（不区分"不存在"与"无权访问"），对应 `P-008`（FR-040 越权分支、§4.5 删除后访问）。

| 方法 | 路径 | 说明 | 关联 FR |
| --- | --- | --- | --- |
| GET | `/api/setup` | 返回 `{ initialized: boolean }`，前端判断是否跳 `/setup` | FR-062 |
| POST | `/api/setup` | 创建首个 Admin（仅当 `initialized=false`） | FR-062 |
| POST | `/api/auth/login` | 登录，返回 `{ must_reset }`；下发 Session Cookie | FR-001, FR-004 |
| POST | `/api/auth/logout` | 销毁当前 session | FR-002 |
| POST | `/api/auth/change-password` | 修改自己密码（需旧密码） | FR-003 |
| POST | `/api/auth/force-reset` | 强制改密（`must_reset=true` 专用） | FR-005 |
| GET | `/api/clipboards` | 列出当前用户空间，默认排序 | FR-010, FR-031 |
| POST | `/api/clipboards` | 首次落盘（body：text + 可选 attachments upload id 占位） | FR-014 |
| GET | `/api/clipboards/:id` | 获取单条全量（text + 附件元信息列表） | FR-011 |
| PATCH | `/api/clipboards/:id` | 三种子动作：`{ text }` \| `{ pinned: true/false }` \| `{ clear: true }` | FR-013, FR-021, FR-022 |
| DELETE | `/api/clipboards/:id` | 删除整条（连附件） | FR-018 |
| POST | `/api/clipboards/:id/attachments` | 上传附件（`multipart/form-data`, field `file`） | FR-017 |
| GET | `/api/attachments/:id/download` | 流式下载附件，返回 `Content-Disposition: attachment` | FR-019 |
| DELETE | `/api/attachments/:id` | 删单个附件 | FR-020 |
| GET | `/api/stream` | SSE 订阅（`text/event-stream`），事件载荷见 §6 | FR-030, FR-031, FR-032 |
| GET | `/api/admin/users` | 用户列表 + 统计（剪贴板数、存储占用） | FR-050, FR-053 |
| POST | `/api/admin/users` | 新增用户（自动 `must_reset=true`） | FR-050 |
| DELETE | `/api/admin/users/:id` | 删除用户（级联剪贴板 + 附件 + 磁盘文件） | FR-051 |
| POST | `/api/admin/users/:id/reset-password` | 重置密码（目标 `must_reset=true`） | FR-052 |
| GET | `/api/admin/config` | 读系统配置 | FR-054, FR-055 |
| PATCH | `/api/admin/config` | 改系统配置（`max_attachment_mb` / `public_base_url`，至少一项） | FR-054, FR-055 |

**错误码约定**：
- `UNAUTHENTICATED`（401）— 未登录 / session 失效
- `MUST_RESET`（403）— 登录态但须强制改密（前端拦截后跳 `/force-reset`）
- `FORBIDDEN`（403）— 非 Admin 访问 admin API
- `NOT_FOUND`（404）— 对象不存在或非己
- `VALIDATION`（400）— zod 校验失败，带 `details`
- `RATE_LIMITED`（429）— 登录失败过多
- `CONFLICT`（409）— 用户名已存在 / 新旧密码相同
- `PAYLOAD_TOO_LARGE`（413）— 附件超上限
- `SERVER`（500）— 其他

## 6. SSE 事件协议

**端点**：`GET /api/stream`（Node runtime，`text/event-stream`，`Cache-Control: no-store`）。

**连接模型**：一个浏览器标签一条 SSE。服务端用进程内 `EventEmitter` 作 Hub，按 `userId` 分发；mutation 在事务提交后同步 `hub.publish(userId, event)`。

**心跳**：每 15s 推送 `:heartbeat\n\n` 注释行，防止中间层超时；EventSource 内置断线重连（默认 3s）。

**事件类型**（`data` 为 JSON）：

| event | 载荷 | 触发源 | 关联 FR |
| --- | --- | --- | --- |
| `clipboard.created` | `{ id, text, pinned_at, created_at, updated_at, attachment_count }` | POST /clipboards | FR-031 |
| `clipboard.updated` | `{ id, fields: { text?, pinned_at?, cleared?, updated_at } }` | PATCH /clipboards/:id | FR-030, FR-031 |
| `clipboard.deleted` | `{ id }` | DELETE /clipboards/:id | FR-031, FR-032 |
| `attachment.added` | `{ clipboard_id, attachment: { id, filename, mime_type, size_bytes, created_at } }` | POST attachments | FR-030 |
| `attachment.removed` | `{ clipboard_id, id }` | DELETE /attachments/:id | FR-030 |
| `session.revoked` | `{}` | 其他设备退出当前 session / Admin 删本账号 | 对应强制登出 |

**客户端处理策略**：
- 列表视图：收到 `clipboard.*` → TanStack Query 对 `/api/clipboards` 做合并（无需全量重取）。
- 编辑视图：若 `event.id === currentId`，按 `updated` 合并或触发 `deleted` 横幅（FR-032）。
- 冲突解决：同一条 `clipboard.updated` 的 `text` 字段采用"服务端最后写入胜出"（last-writer-wins），客户端本地乐观缓冲若与返回值不一致直接覆盖。多端同时编辑同一剪贴板的精细合并**不在本期范围**（范围外条款：无多人实时协作）。

## 7. 认证与会话

**密码策略**：
- 哈希：`@node-rs/argon2` 的 argon2id，参数 `m=19456, t=2, p=1`（OWASP 2024 推荐）。
- 强度：最少 8 字符；不做复杂度强制（NIST SP 800-63B 立场）。

**Session**：
- 登录成功生成 32 字节随机 token，SHA-256 后存库（`token_hash`），明文只下发给 Cookie。
- Cookie：`klipsync_session`，`HttpOnly; SameSite=Lax; Secure`（生产），`Path=/`。
- 生命周期：
  - 记住我=false：Session Cookie（浏览器关闭即失效），服务端 `expires_at = now + 24h`。
  - 记住我=true：`Max-Age = 30 天`，服务端同时存 `expires_at = now + 30d`。
- 滑动续期：每次请求若 `now - last_seen_at > 1h`，更新 `last_seen_at`；若记住我且剩余寿命 < 7 天，续签 30 天。
- 清理：后台任务（启动时 + 每 24h）删除 `expires_at < now` 的行。

**Middleware 分层**：
1. **Edge `middleware.ts`**：仅判断 cookie 存在与否 + 初始化态，做粗重定向（未登录访问需鉴权路由 → `/login?next=...`；未初始化访问任何非 `/setup` → `/setup`）。
2. **Route Handler 内 `requireUser()`**：真正查 sessions 表，得到 `user`；校验 `must_reset` 并在非 `/api/auth/force-reset` 请求时返 `MUST_RESET`。
3. **`requireAdmin()`**：链式在 `requireUser()` 后，检查 `role='admin'`，否则 `FORBIDDEN`。
4. **Ownership guard**：对 `/api/clipboards/:id` / `/api/attachments/:id` 强制校验对象归属当前 user，否则 `NOT_FOUND`（不泄露是否存在）。

**登录限流**（FR-001 伴生安全需求）：
- 按 `sha256(username + ':' + ip)` 聚合；60s 内失败 ≥ 5 次 → 锁定 60s，返回 `RATE_LIMITED`。
- 成功登录清零该聚合。
- 产品层感知：前端始终显示同一句"用户名或密码错误"+ 按钮倒计时（§4.2 产品规格）。

## 8. 附件子系统

**上传流程**：
1. 前端 `FormData` POST 到 `/api/clipboards/:id/attachments`，field 名 `file`。
2. Handler 校验：所有者、文件大小 ≤ `max_attachment_mb`（读 `system_config`）。超限 → 413。
3. 生成 ULID 作 `id`，目标路径 `${DATA_DIR}/attachments/${userId}/${clipboardId}/${id}`。
4. **原子写**：先写 `${id}.tmp`，写完 `rename` 到最终名（崩溃/部分写时目录里只存在 .tmp，不污染正文）。
5. 事务：`INSERT attachments ...` + `UPDATE clipboards SET updated_at=now() WHERE id=?`；失败则 `unlink` 磁盘文件（补偿）。
6. Commit 后 `hub.publish(userId, 'attachment.added', ...)`。

**下载流程**：`/api/attachments/:id/download` → 校验所有者 → `fs.createReadStream(path)` 配合 `Response(stream)`，`Content-Disposition: attachment; filename*=UTF-8''<encoded>`，`Content-Type` 按库存 `mime_type`。

**删除**：级联优先级为 **先数据库后文件**（数据库事务中 DELETE → 提交 → 异步 `unlink`）；若 `unlink` 失败记录日志、不回滚（孤儿文件由周期性 GC 清理）。

**孤儿清理**（兜底）：启动时 + 每 24h 扫 `attachments/` 目录，找磁盘上存在但数据库无对应 `id` 的文件，安全删除。

**大小限制**：
- 单文件上限由 `system_config.max_attachment_mb` 控制，PATCH 后对"之后的上传"生效（FR-054 产品层约束）。
- Next.js Route Handler 默认 `body size` 限制通过 `export const runtime = 'nodejs'` + `export const maxDuration` 无影响；真正的 request body 限制在 `next.config.ts` `experimental.serverActions.bodySizeLimit`（仅影响 Server Actions，REST route 用 streaming 读取不受此限）。Route Handler 使用 `request.formData()` 一次性读入内存 —— 默认可接受（10MB 量级），未来如果上限调到 > 100MB 要改为 busboy / formidable 流式解析。

## 9. 关键技术决策（ADR）

### ADR-001：SQLite 而非 PostgreSQL
**背景**：FR-061 要求"数据落本地磁盘 / NAS 挂载卷，不依赖任何外部 SaaS"；面向 ≤ 10 人的家庭场景。
**决策**：SQLite（WAL 模式 + better-sqlite3）。
**为什么不选 PostgreSQL**：多一个容器、多一套备份流程、内存占用翻倍、运维面扩大；在 < 10 并发写的家庭场景拿不到任何好处。
**后果**：垂直扩展上限低（单机单进程）；若未来要加"跨 NAS 集群"或"高并发" → 迁 PG。迁移成本可控，Drizzle schema 改后端方言即可。备份=拷 `klipsync.db*`。

### ADR-002：SSE 而非 WebSocket
**背景**：FR-030/031/032 只需服务器→客户端的下发，不需要客户端流式上行（编辑走 REST PATCH 防抖）。
**决策**：SSE。
**为什么不选 WebSocket**：WS 需要独立协议升级、反代配置更麻烦、重连需手写、不天然 HTTP 缓存/鉴权。SSE 就是 HTTP GET + `text/event-stream`，Cookie 鉴权自动生效，EventSource 自带重连。
**后果**：无法客户端主动推事件（我们不需要）；每个标签占 1 条长连接 —— 家庭规模下可忽略。

### ADR-003：自建认证而非 Auth.js / Better Auth / Lucia
**背景**：需求就是"用户名+密码+记住我+强制改密+管理员加人"，**没有任何 OAuth / 魔链 / 2FA 诉求**。
**决策**：自建（`lib/auth/*` 约 200 行），argon2id + session 表。
**为什么不选 Auth.js**：把 OAuth-first 的心智模型硬塞进仅用户名密码的场景、文档复杂、App Router 适配反复折腾。
**为什么不选 Better Auth / Lucia**：功能比需要的多一个量级；自托管小工具不值得引入一个需要长期跟进升级的大依赖。
**后果**：安全敏感代码需要审 —— 攻击面集中在 `session.ts`、`password.ts`、`login` rate limit，代码量少反而易审。

### ADR-004：Next.js 全栈而非前后分离
**背景**：单人/小团队维护的 self-hosted 项目，CI/CD、依赖升级、部署都是成本。
**决策**：Next.js 单仓单进程，前端 + API 同源。
**为什么不选 Vite + Hono**：多一个进程、多一套构建、多一层 CORS / 反代配置，收益几乎为零。
**后果**：SSR/CSR 边界要自己把关，不能在客户端组件 `import drizzle`。通过 `'use server'` + `lib/` 分层来约束。

### ADR-005：Drizzle 而非 Prisma
**背景**：SQLite + TypeScript + 迁移需求。
**决策**：Drizzle。
**为什么不选 Prisma**：运行时 engine 体积大、容器镜像翻倍、冷启动慢；查询 API 类型推导仍不如 Drizzle 直接；SQLite 驱动选择少。
**后果**：无 Prisma Studio 这类可视化工具 —— 用 `sqlite3` CLI 或 TablePlus 看库就好。

### ADR-006：单容器部署而非多容器
**背景**：SQLite 不需要独立进程；SSE Hub 是进程内 EventEmitter，多实例会错过对方发的事件。
**决策**：单 service `docker-compose.yml`，一个 Node 进程跑 Next.js。
**为什么不选多容器（app + db）**：SQLite 单文件被多进程 FFI 并发访问需要 `immutable=0` + WAL，架构复杂度陡增却无收益。
**后果**：水平扩展不可行 —— 家庭场景不需要。

### ADR-007：本地文件系统而非对象存储
**背景**：FR-061 硬约束；家庭 NAS 本来就是"大硬盘 + 文件系统"。
**决策**：`/data/attachments/{userId}/{clipboardId}/{fileId}` 目录树，原子 rename 写入。
**为什么不选 MinIO / S3 兼容**：又多一个容器、又多一层抽象、备份更复杂。
**后果**：跨机迁移得 `rsync` 整个目录 —— 可接受。

### ADR-008：argon2id 而非 bcrypt
**背景**：OWASP 2024 明确首推 argon2id；Node.js 20+ 支持通过 Rust 绑定高性能实现。
**决策**：`@node-rs/argon2`，`m=19456, t=2, p=1`。
**为什么不选 bcrypt**：已进入"legacy 仍可用"状态；在 GPU/ASIC 攻击面下 argon2id 的内存硬度更优。
**后果**：依赖 prebuilt binary —— `@node-rs/argon2` 覆盖 Docker 常见基础镜像（alpine musl + debian glibc），不是问题。

### ADR-009：ULID 作主键而非自增整数或 UUIDv4
**背景**：多端同步场景下 URL 含对象 ID；希望 ID 不泄露总量（避免自增），且列表排序友好。
**决策**：ULID（Crockford Base32，26 字符，前缀时间戳）。
**为什么不选 UUIDv4**：UUIDv4 索引局部性差（随机插入使 B-tree 页分裂频繁）；ULID 前缀时序使插入近尾页，SQLite 上写入更友好。
**为什么不选 自增 INTEGER**：URL 里暴露 `/c/42` 让"猜数枚举"成为可能（虽然有 ownership 拦，仍不体面）。
**后果**：26 字符 vs 8 字节，存储略大；可忽略。

## 10. 第三方服务

**本期无外部 SaaS / 云服务依赖**。

运行期依赖：
- npm 侧：`next`、`react`、`drizzle-orm`、`better-sqlite3`、`@node-rs/argon2`、`zod`、`@tanstack/react-query`、`react-hook-form`、`qrcode.react`、`lucide-react`、`@serwist/next`、`tailwindcss`、`ulid`、`geist`。
- 字体：`geist`（官方 Vercel npm 包，含 Geist Sans / Mono）+ Inter 通过 `next/font/google` 构建时下载 —— 两者运行时均由 Next.js 自托管打包进 `.next/static`，**无运行时外部请求**。
- 图标库：lucide-react（本地包，无外链）。

## 11. 环境与部署

### 11.1 环境变量

| 变量 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- |
| `DATA_DIR` | 否 | `/data` | 数据根目录（SQLite 文件 + 附件） |
| `DATABASE_URL` | 否 | `file:${DATA_DIR}/klipsync.db` | Drizzle/better-sqlite3 连接串 |
| `NODE_ENV` | 否 | `production` | |
| `PORT` | 否 | `3000` | Next.js 监听端口 |
| `TRUST_PROXY` | 否 | `true` | 处于反代后，解析 `X-Forwarded-*` |
| `COOKIE_SECURE` | 否 | `false` | 生产必须 true；仅本地 dev 允许设 false |

不需要 `SESSION_SECRET`：session token 本身是随机的，cookie 不做签名（改用存哈希查库的方式，token 本身在服务端校验）。

### 11.2 本地开发

```bash
npm install
npx drizzle-kit generate       # 根据 schema 生成迁移
npx tsx scripts/migrate.ts     # 应用迁移
npm run dev                    # http://localhost:3000
```

### 11.3 生产部署（Docker Compose）

**Dockerfile**（多阶段）：
- `deps` 阶段：安装依赖，编译原生模块（`better-sqlite3`、`@node-rs/argon2`）
- `builder` 阶段：`npm run build`（Next.js standalone 输出）
- `runner` 阶段：复制 `.next/standalone` + `.next/static` + `public` + `drizzle/`，`CMD ["node", "server.js"]`（entrypoint 先跑 migrate）

**docker-compose.yml**：

```yaml
services:
  klipsync:
    image: ghcr.io/<owner>/klipsync:latest
    container_name: klipsync
    restart: unless-stopped
    environment:
      DATA_DIR: /data
      COOKIE_SECURE: "true"
    volumes:
      - ./data:/data
    ports:
      - "3000:3000"   # 通过宿主 NAS 上的 Caddy / NPM / Traefik 反代
```

**首次启动**：
1. `docker compose up -d`
2. 浏览器访问（反代域名） → 自动 302 到 `/setup` → 创建 Admin
3. 此后任何访问无 Admin 态都走登录流

**备份**：停服或加 SQLite VACUUM 锁后 `tar czf backup.tgz ./data`；或启用 SQLite `.backup` API 做热备份（本期不实现，写入量小时冷备足够）。

## 12. 非功能需求落地对照

| 非功能需求 | 实现 |
| --- | --- |
| 内网使用，不做公网暴露 | 容器只绑本地端口；文档里不提供 TLS 默认配置，把 TLS / 外网接入推给用户的反代 |
| 多端同步 < 2s（FR-030/031） | SSE 心跳 15s；mutation 提交即 publish；客户端 EventSource 默认 3s 重连。实际延迟 ≈ RTT + 防抖 300ms |
| PWA "添加到主屏幕"（FR-063） | `@serwist/next` + `app/manifest.ts` + 基础 icon set |
| 附件大小限制可配（FR-054） | `system_config.max_attachment_mb`；写入经 Admin API；读取带 10s 内存缓存 |
| 公开访问基址可配（FR-055） | `system_config.public_base_url`；写入经 Admin API（zod 校验 `http(s)://` 开头、无末尾 `/`、≤ 512 字符）；读取带 10s 内存缓存；`QRCodePanel` URL 组装优先读此值，空字符串回退到 request `x-forwarded-host` / `host` 派生 |
| 强制改密（FR-005） | `must_reset` 字段 + `requireUser` 中间件拦截 + `/force-reset` 页绕过 |
| 非己对象不可见 | Ownership guard 返回 404（不区分"不存在"和"无权限"） |
| 数据归用户所有 | 所有数据在挂载卷；无任何外部上报 / 遥测 |

## 13. 风险与预案

| 风险 | 影响 | 预案 |
| --- | --- | --- |
| SQLite 写竞争（多端并发编辑同一剪贴板） | 罕见写冲突 | WAL 模式 + 事务短小；产品层已接受 "last-writer-wins"，不做 OT/CRDT |
| SSE 连接不释放（反代/浏览器异常） | 内存慢泄漏 | Hub 维护 `WeakRef` 不现实；改用：controller.signal.addEventListener('abort') 主动清理；15s 心跳写入失败即关闭 |
| 附件孤儿文件（事务回滚后磁盘未删） | 磁盘占用缓慢增长 | 启动时 + 每 24h 扫目录对账；仅删除"DB 中不存在的 id" |
| Next.js Route Handler 一次读完 `formData()` 占内存 | 10MB 以内无忧；若上限调高到 > 100MB 会 OOM | 文档注明，未来切 busboy 流式解析（§8 已记） |
| 首次部署 /setup 被并发访问创建多 Admin | 意外多管理员 | 事务内 `SELECT COUNT(*) FROM users WHERE role='admin'` + INSERT 包进 `BEGIN IMMEDIATE`，争用时后到者返 `CONFLICT` |
| 密码哈希阻塞事件循环 | 并发登录时延迟上升 | `@node-rs/argon2` 是异步 Rust 绑定，不阻塞；且限流阈值已够低 |
| 反代未传 `X-Forwarded-*` 导致 IP 限流失效 | 登录限流不准 | 文档明确反代必须 `header X-Forwarded-For`；本地开发关 `TRUST_PROXY` 回落到 `req.socket.remoteAddress` |
| Service Worker 缓存陈旧静态资源导致登录/版本不一致 | 升级后部分用户卡在旧版 | Serwist 启用 `skipWaiting` + `clientsClaim` + 静态资源按 hash 缓存；HTML 走 NetworkFirst |
| 单容器进程崩溃 | 服务中断 | `restart: unless-stopped` + 可选 healthcheck（`GET /api/setup`） |
| 最后一个 Admin 被删 / 被降级 | 系统不可管理 | service 层硬拦截（§4.1 约束） |
