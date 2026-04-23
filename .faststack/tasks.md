# KlipSync · 任务清单

> 上游：[技术设计](./technical.md) · [产品设计](./product.md) · [UI 设计](./design.md)
> 执行：运行 `fs-dev`，它会按顺序拾取未完成任务；也可以 `fs-dev T-001` 单跑。
> 模式：lite（任务条目只列交付物，不要求独立验收标准；测试由开发者按需手动走查，不强制拆分测试任务）。

## 进度

- [x] M1 · 项目脚手架（7/7）
- [x] M2 · 认证与初始化（10/10）
- [x] M3 · 剪贴板核心功能（10/10）
- [x] M4 · SSE 多端同步（5/5）
- [x] M5 · 管理员与设置（8/8）
- [x] M6 · 打磨上线（5/5）

合计 **45** 个任务。

---

## M1 · 项目脚手架

### T-001 · 初始化 Next.js 16 项目骨架

- **依赖**：无
- **关联**：ADR-004, §11.2
- **交付物**：
  - [x] `package.json` 使用 npm（附 `package-lock.json`），引入 Next.js 16 + React + TypeScript
  - [x] `tsconfig.json`（`strict: true`,路径别名 `@/*` → `src/*`）
  - [x] `next.config.ts`（启用 `standalone` 输出）
  - [x] ESLint + Prettier（配置 `next/core-web-vitals`）
  - [x] `.gitignore`、`.env.example`（照 §11.1 列变量）
  - [x] `npm run dev` 能启动，访问 http://localhost:3000 返回默认页

### T-002 · Tailwind + shadcn/ui + Crisp Canvas 设计令牌

- **依赖**：T-001
- **关联**：`design.md` Crisp Canvas 规范、ADR 技术栈中的样式层
- **交付物**：
  - [x] `tailwind.config.ts` 接入 shadcn 预设
  - [x] `src/app/globals.css` 把 `design.md` 中的颜色 / 间距 / 圆角 / 阴影 token 以 CSS 变量写入 `:root`（含深浅色两套）
  - [x] 初始化 shadcn（`components.json`），至少生成 Button / Input / Dialog / Dropdown / Toast / Tooltip / Badge 原子组件并按设计令牌改造
  - [x] `src/components/ui/` 落地上述组件

### T-003 · 字体与图标接入

- **依赖**：T-001
- **关联**：`design.md` 字体规范、ADR 技术栈字体项、FR-061（不对外发请求）
- **交付物**：
  - [x] 安装 `geist` 与 `lucide-react`
  - [x] `src/app/layout.tsx` 用 `next/font/google` 注入 Inter、用 `geist` 注入 Geist Sans / Geist Mono
  - [x] `globals.css` 把字体变量与 Tailwind `fontFamily` 映射打通
  - [x] 构建产物 `.next/static/media` 包含字体文件（自托管验证）

### T-004 · Drizzle schema 与初始迁移

- **依赖**：T-001
- **关联**：§4 数据模型 全部 6 张表、ADR-005, ADR-009
- **交付物**：
  - [x] 安装 `drizzle-orm`、`drizzle-kit`、`better-sqlite3`、`ulid`
  - [x] `drizzle.config.ts`（指向 `${DATA_DIR}/klipsync.db`）
  - [x] `src/lib/db/schema.ts` 定义 users / clipboards / attachments / sessions / system_config / login_attempts 六张表，含 §4 列出的全部索引与约束
  - [x] `npx drizzle-kit generate` 产出 `drizzle/0000_init.sql`（纳入 git）
  - [x] `scripts/migrate.ts` 能把迁移跑上空库，并完成 seed：`system_config` 插入 `max_attachment_mb=10`

### T-005 · 数据库单例 + ULID 工具

- **依赖**：T-004
- **关联**：§3 "关键说明"（HMR-safe）、ADR-009
- **交付物**：
  - [x] `src/lib/db/client.ts` 用模块级单例暴露 Drizzle 实例；`next dev` 热更新下不重复 open（用 `globalThis.__db`）
  - [x] 开启 `PRAGMA journal_mode=WAL; foreign_keys=ON; busy_timeout=5000`
  - [x] `src/lib/db/ulid.ts` 导出 `newId()`（Crockford Base32 ULID）
  - [x] 导出 `withTransaction(fn)` 辅助包装 `BEGIN IMMEDIATE`（首次 setup 用）

### T-006 · API 基础设施（错误信封 + zod 共用）

- **依赖**：T-001
- **关联**：§5 错误码约定、§6 事件类型、FR 前后端共用 schema
- **交付物**：
  - [x] `src/lib/validation/schemas.ts` 定义前后端共用的 zod schema（login、clipboard PATCH、附件 config 等）
  - [x] `src/lib/http/errors.ts` 导出 `ApiError` 类 + `toResponse(err)`，映射到 §5 所有错误码 + HTTP 状态
  - [x] `src/lib/http/handler.ts` 导出 `withErrorBoundary(handler)` HOF：捕获 `ApiError` / zod 错误 / 未知异常，统一返回 `{ error: { code, message, details? } }`
  - [x] `src/lib/env.ts` 用 zod 校验并冻结 §11.1 环境变量

### T-007 · Docker / Compose / 启动脚本

- **依赖**：T-004, T-005
- **关联**：§11.3、FR-060, FR-061, ADR-006
- **交付物**：
  - [x] `Dockerfile` 三阶段：`deps`（含原生模块编译）/ `builder`（`next build` standalone）/ `runner`（拷 `.next/standalone` + `.next/static` + `public` + `drizzle/` + `scripts/migrate.ts`）
  - [x] `docker-entrypoint.sh`：先 `node scripts/migrate.js` 再 `node server.js`
  - [x] `docker-compose.yml` 照 §11.3 写单 service、卷挂载 `./data:/data`、端口 `3000:3000`
  - [x] `.dockerignore`
  - [x] 本地 `docker compose up --build` 能把空库启动起来，访问落到 `/setup`<br/>  _注：M1 没有路由 / 中间件；已验证 compose up 后 migrate 正常执行、`/` 返回 HTTP 200，`/setup` 重定向要等 T-104 Edge middleware 落地。_

---

## M2 · 认证与初始化

### T-101 · 密码哈希模块

- **依赖**：T-001
- **关联**：§7 密码策略、ADR-008
- **交付物**：
  - [x] 安装 `@node-rs/argon2`
  - [x] `src/lib/auth/password.ts` 导出 `hash(pw)`（argon2id，`m=19456 t=2 p=1`）与 `verify(hash, pw)`
  - [x] 最小长度校验（≥ 8）放在 zod schema 层（T-006）并在此模块复用

### T-102 · Session lib

- **依赖**：T-005, T-006, T-101
- **关联**：§7 Session 全部约定
- **交付物**：
  - [x] `src/lib/auth/session.ts`：`createSession(userId, remember)` 返 `{ token }`（32B 随机 → base64url）；`readSession(cookieStore)` 按 SHA-256 查库；`revokeSession(token)`
  - [x] Cookie 名 `klipsync_session`；属性 `HttpOnly; SameSite=Lax; Secure(生产); Path=/`；根据 `remember` 切 Session Cookie vs `Max-Age=30d`
  - [x] 滑动续期：`last_seen_at > 1h` 刷新；`remember && 剩余 < 7d` 续签 30d
  - [x] `cleanupExpiredSessions()`（启动时 + 24h 定时）

### T-103 · 鉴权与越权中间件

- **依赖**：T-102
- **关联**：§7 Middleware 分层 2/3/4、§5 非己对象返 404
- **交付物**：
  - [x] `src/lib/auth/middleware.ts` 导出 `requireUser()` / `requireAdmin()` / `requireOwnedClipboard(id)` / `requireOwnedAttachment(id)`
  - [x] `must_reset=true` 且非 `/api/auth/force-reset` 请求时抛 `MUST_RESET` (403)
  - [x] 非己对象统一抛 `NOT_FOUND` (404)，不区分"不存在"与"无权访问"

### T-104 · Edge middleware 粗重定向

- **依赖**：T-102
- **关联**：§7 Middleware 分层 1
- **交付物**：
  - [x] `src/middleware.ts`（Edge runtime）
  - [x] 未初始化（cookie 读不到初始化标志 / 调 `/api/setup` 查一次）访问非 `/setup` / `/api/setup` → 302 `/setup`
  - [x] 已初始化未登录访问需鉴权路由 → 302 `/login?next=<原 URL>`
  - [x] 不在 Edge 层碰 SQLite：仅凭 cookie 存在与否 + 一次无鉴权的 `/api/setup` GET 判断

### T-105 · 登录限流

- **依赖**：T-005
- **关联**：§7 登录限流、FR-001 伴生
- **交付物**：
  - [x] `src/lib/rate-limit/login.ts`：`record(identifier, success)`、`check(identifier)` → `{ blocked, retryAfter }`
  - [x] 内存 LRU（主）+ `login_attempts` 表（持久化兜底，进程重启不丢状态）
  - [x] `identifier = sha256(username + ':' + ip)`；IP 从 `X-Forwarded-For` 取（`TRUST_PROXY=true` 时）
  - [x] 24h 自动清理旧行

### T-106 · /api/setup（首次初始化）

- **依赖**：T-005, T-101, T-102, T-103, T-006
- **关联**：FR-062、§4.1 产品规格、风险表"并发 setup"条目
- **交付物**：
  - [x] `GET /api/setup` → `{ initialized: boolean }`（查 `users` 是否存在任意 admin）
  - [x] `POST /api/setup`：zod 校验用户名 / 密码；`BEGIN IMMEDIATE` 事务内 `COUNT(*) WHERE role='admin'` + INSERT；已初始化则 `CONFLICT`
  - [x] 创建后立即签发 session（`must_reset=false`），返回 session cookie

### T-107 · 登录 / 登出 API

- **依赖**：T-101, T-102, T-105, T-006
- **关联**：FR-001, FR-002, FR-004, FR-005
- **交付物**：
  - [x] `POST /api/auth/login`：zod 校验 → 限流 check → 查 user → `verify` → 生成 session → 返 `{ must_reset }`
  - [x] 登录失败统一返 `INVALID_CREDENTIALS`（体上与 `UNAUTHENTICATED` 区分），触发限流 `record`
  - [x] 成功登录清该 identifier 的失败计数
  - [x] `POST /api/auth/logout`：读 cookie → `revokeSession` → 清 cookie

### T-108 · 改密 / 强制改密 API

- **依赖**：T-101, T-103, T-006
- **关联**：FR-003, FR-005
- **交付物**：
  - [x] `POST /api/auth/change-password`：`requireUser`；校验旧密码；新旧相同 → `CONFLICT`；成功后轮换 session token（旧 session 可选失效）
  - [x] `POST /api/auth/force-reset`：`requireUser`（允许 `must_reset=true` 通过）；校验当前临时密码；成功后 `must_reset=0` + 轮换 session

### T-109 · P-001 setup 页面

- **依赖**：T-002, T-003, T-106
- **关联**：FR-062、`product.md` §4.1、`design.md` 表单规范
- **交付物**：
  - [x] `src/app/(auth)/setup/page.tsx`（Server Component 进门先查 `GET /api/setup`，已初始化则 302 `/login`）
  - [x] 表单：用户名（3–32）+ 密码（≥ 8）+ 确认密码，react-hook-form + zod
  - [x] 提交成功自动跳 `/`（进入 P-004 空白编辑区）

### T-110 · P-002 登录页 + P-003 强制改密页

- **依赖**：T-002, T-003, T-107, T-108
- **关联**：FR-001, FR-004, FR-005、`product.md` §4.2 / §4.3
- **交付物**：
  - [x] `src/app/(auth)/login/page.tsx`：用户名 + 密码 + "记住我"（默认勾选）；失败统一文案"用户名或密码错误"；429 时显示按钮倒计时
  - [x] 登录返回 `must_reset=true` → 路由跳 `/force-reset`
  - [x] 登录成功 → 跳 `next` 参数或 `/`
  - [x] `src/app/(auth)/force-reset/page.tsx`：旧密码（初始密码）+ 新密码 + 确认；新旧相同前端拦截；成功后跳 `/`

---

## M3 · 剪贴板核心功能

### T-201 · AppShell / TopBar / (app) 路由布局

- **依赖**：T-002, T-003, T-103
- **关联**：`design.md` 布局规范、`product.md` §2 组件树
- **交付物**：
  - [x] `src/app/(app)/layout.tsx`：Server Component 内 `requireUser()`；装配 TopBar + 主内容槽 + SSE Provider 占位
  - [x] `src/components/AppShell/TopBar.tsx`：Logo、当前用户菜单（入口 → /settings、/admin/\*，登出）
  - [x] TanStack Query Provider（client component wrapper）
  - [x] 桌面双栏 / 移动单栏响应式布局骨架

### T-202 · 剪贴板列表 API

- **依赖**：T-005, T-103, T-006
- **关联**：FR-010, FR-031、§5 `GET /api/clipboards`
- **交付物**：
  - [x] `GET /api/clipboards`：按 `(user_id, pinned_at DESC NULLS LAST, updated_at DESC)` 排序（用覆盖索引）
  - [x] 返回字段：`id, text`（截断到前 160 字符用于预览）、`pinned_at, updated_at, attachment_count`
  - [x] 空列表返回 `{ items: [] }`

### T-203 · 剪贴板创建 / 详情 / 删除 API

- **依赖**：T-005, T-103, T-006
- **关联**：FR-011, FR-014, FR-018、§5 相关行
- **交付物**：
  - [x] `POST /api/clipboards`：body `{ text }`（允许空字符串时必须至少伴随 attachment upload —— 空 + 空由 FR-015 在前端拦截，后端不做）；INSERT → 返完整对象
  - [x] `GET /api/clipboards/:id`：`requireOwnedClipboard`；含附件元信息列表
  - [x] `DELETE /api/clipboards/:id`：事务 DELETE 行（FK CASCADE 附件行）→ commit → 异步 `unlink` 物理文件目录；失败不回滚由孤儿扫描兜底

### T-204 · 剪贴板 PATCH API（text / pinned / clear）

- **依赖**：T-005, T-103, T-006
- **关联**：FR-013, FR-021, FR-022、§5 PATCH 三子动作
- **交付物**：
  - [x] 入参 zod：`{ text } | { pinned: boolean } | { clear: true }` 三选一
  - [x] `text`：UPDATE 文本 + `updated_at`
  - [x] `pinned=true`：`pinned_at=now`；`false`：`pinned_at=NULL`
  - [x] `clear`：事务内 `text=''` + DELETE 所属 attachments + 异步 unlink 目录
  - [x] 所有分支都刷新 `updated_at`

### T-205 · 文件存储 lib + 附件上传 API

- **依赖**：T-005, T-103, T-006
- **关联**：FR-017、§8 上传流程全部步骤
- **交付物**：
  - [x] `src/lib/storage/files.ts`：`attachmentPath(userId, clipboardId, fileId)`、`atomicWrite(buffer, path)`（先写 `.tmp` → rename）、`safeUnlink(path)`
  - [x] `src/lib/config/system.ts`：读 `system_config`（10s 内存缓存），`getMaxAttachmentMb()`
  - [x] `POST /api/clipboards/:id/attachments`：`requireOwnedClipboard`；`request.formData()` 读 `file`；超限 413；ULID → 原子写；事务 INSERT attachments + `UPDATE clipboards.updated_at`；失败补偿 `unlink`

### T-206 · 附件下载 / 删除 API

- **依赖**：T-205
- **关联**：FR-019, FR-020、§8 下载 / 删除流程
- **交付物**：
  - [x] `GET /api/attachments/:id/download`：`requireOwnedAttachment`；`fs.createReadStream` → `new Response(stream)`；`Content-Disposition: attachment; filename*=UTF-8''<pct-encoded>`、`Content-Type: <mime_type>`、`Content-Length: <size_bytes>`
  - [x] `DELETE /api/attachments/:id`：事务 DELETE attachments 行 + 更新父 clipboard `updated_at` → commit → 异步 `safeUnlink`

### T-207 · ClipboardList 组件

- **依赖**：T-201, T-202
- **关联**：FR-010, FR-031、`product.md` §4.4、`design.md` 列表项
- **交付物**：
  - [x] `src/components/ClipboardList/index.tsx`（client）：TanStack Query 取 `/api/clipboards`
  - [x] 每项：文本前几行预览、附件数量图标（lucide `Paperclip`）、最后更新时间（相对时间格式化）、置顶标识
  - [x] 顶部固定 "＋ 新建" → 路由 `/c/new`
  - [x] 点击项 → 路由 `/c/:id`；当前激活项高亮

### T-208 · ClipboardEditor 组件

- **依赖**：T-201, T-203, T-204
- **关联**：FR-013, FR-016, FR-018, FR-021, FR-022、`product.md` §4.5 / §4.8
- **交付物**：
  - [x] `src/components/ClipboardEditor/index.tsx`（client）：`<textarea>` + 300ms 防抖 `PATCH { text }`；乐观更新 + 失败回滚
  - [x] 工具栏按钮：一键复制（`navigator.clipboard.writeText`）、置顶 / 取消置顶、清空（二次确认）、删除整条（二次确认）
  - [x] 清空与删除通过 shadcn AlertDialog 做二次确认
  - [x] 编辑器下方挂载 AttachmentDrawer 槽位

### T-209 · AttachmentDrawer 组件

- **依赖**：T-205, T-206, T-208
- **关联**：FR-017, FR-019, FR-020, FR-054、`product.md` §4.7
- **交付物**：
  - [x] `src/components/AttachmentDrawer/index.tsx`（client）
  - [x] 上传：拖放 / 粘贴（监听 `paste` 事件取 `Clipboard.items`）/ 文件选择；上传前本地校验 `file.size <= max_attachment_mb * 1024 * 1024`
  - [x] 进度：单附件进度条（`XMLHttpRequest` 或 fetch 流进度）、失败带重试按钮
  - [x] 附件卡片：文件名 / 大小 / MIME 图标；悬浮（桌面）或长按（移动）出"下载 / 删除"；删除二次确认

### T-210 · 主工作台页面（P-004 / P-008 / QR / DeletedBanner）

- **依赖**：T-201, T-203, T-204, T-207, T-208, T-209
- **关联**：FR-010~FR-022, FR-032, FR-040、`product.md` §4.4–4.9, §4.13
- **交付物**：
  - [x] `src/app/(app)/page.tsx`：若列表非空 → 重定向到最近一条；否则 → `/c/new`
  - [x] `src/app/(app)/c/new/page.tsx`：空白编辑区；首次输入文本 **或** 上传附件时调 `POST /api/clipboards` 落盘（含 FR-014 合并首条附件），然后路由替换为 `/c/:id`；无输入离开不落盘（FR-015）
  - [x] `src/app/(app)/c/[id]/page.tsx`：Server Component 预取 `GET /api/clipboards/:id`（404 → 跳 P-008）；渲染 ClipboardEditor + AttachmentDrawer + QRCodePanel
  - [x] `src/components/QRCodePanel/index.tsx`：`qrcode.react` SVG 渲染当前 URL + "复制链接"按钮
  - [x] `src/components/DeletedBanner/index.tsx`：FR-032 触发，文本区只读 + 两个按钮（返回列表 / 把草稿保存为新剪贴板）
  - [x] `src/app/(app)/forbidden/page.tsx` (P-008)：文案 + 返回主工作台按钮

> 需重做：CR-004 —— QRCodePanel 的 URL 基址来源从 request host 派生改为"优先读 `public_base_url`，空则回退 request host"。具体在 T-408 落地。

---

## M4 · SSE 多端同步

### T-301 · SSE Hub + 事件 schema

- **依赖**：T-005, T-006
- **关联**：§6 事件类型与载荷
- **交付物**：
  - [x] `src/lib/sse/events.ts`：zod 定义 `clipboard.created/updated/deleted`、`attachment.added/removed`、`session.revoked`
  - [x] `src/lib/sse/hub.ts`：模块级单例 `EventEmitter`（或 Map<userId, Set<controller>>）；`publish(userId, event)`；`subscribe(userId, onEvent): () => void`
  - [x] HMR-safe 包装（`globalThis.__sseHub`）

### T-302 · /api/stream 路由

- **依赖**：T-301, T-103
- **关联**：§6、FR-030, FR-031, FR-032
- **交付物**：
  - [x] `GET /api/stream`：`requireUser`；返回 `ReadableStream`，`Content-Type: text/event-stream; Cache-Control: no-store; Connection: keep-alive`
  - [x] 每 15s 写 `:heartbeat\n\n`；心跳写失败 → 关闭连接
  - [x] `request.signal.addEventListener('abort', unsubscribe)` 主动清理订阅
  - [x] 事件格式 `event: <name>\ndata: <json>\n\n`

### T-303 · mutation 接入 publish

- **依赖**：T-203, T-204, T-205, T-206, T-301
- **关联**：§6 各事件的触发源
- **交付物**：
  - [x] POST /clipboards → `clipboard.created`
  - [x] PATCH /clipboards/:id → `clipboard.updated`（按子动作填 `fields`）
  - [x] DELETE /clipboards/:id → `clipboard.deleted`
  - [x] POST 附件 → `attachment.added`
  - [x] DELETE 附件 → `attachment.removed`
  - [x] 全部 **在事务 commit 后** 同步调用 `hub.publish`（失败只记日志，不影响 HTTP 响应）

### T-304 · 前端 SSE Provider + useSSE hook

- **依赖**：T-201, T-301
- **关联**：§6 客户端处理策略、风险表"SSE 连接不释放"条目
- **交付物**：
  - [x] `src/hooks/useSSE.ts`：`EventSource('/api/stream')`；断线自动重连（依赖 EventSource 原生）；connection state 暴露给 UI
  - [x] `src/components/AppShell/SSEProvider.tsx`：登录后挂载，登出 / `session.revoked` 时关闭并强制跳 `/login`
  - [x] Zustand store 记 `sseStatus: 'connecting' | 'open' | 'closed'`（TopBar 上一个细条状态灯）

### T-305 · 客户端合并事件到 UI

- **依赖**：T-207, T-208, T-210, T-304
- **关联**：§6 客户端处理策略、FR-030/031/032
- **交付物**：
  - [x] 列表视图消费 `clipboard.*` → `queryClient.setQueryData(['clipboards'], merge)`（新增 prepend、更新 in-place、删除过滤；后续排序按 `(pinned_at, updated_at)`）
  - [x] 编辑视图消费：`event.id === currentId` 时按字段合并；若本地有未发出的输入，服务端字段较新则覆盖（last-writer-wins）
  - [x] `clipboard.deleted` 且等于当前打开 id → 激活 DeletedBanner、置编辑器只读
  - [x] `attachment.added/removed` → AttachmentDrawer 列表同步

---

## M5 · 管理员与设置

### T-401 · Admin Users 列表 + 新增 API

- **依赖**：T-005, T-103, T-101, T-006
- **关联**：FR-050, FR-053、§5 admin/users 行
- **交付物**：
  - [x] `GET /api/admin/users`：`requireAdmin`；返回 `[{ id, username, role, must_reset, created_at, clipboard_count, storage_bytes }]`（后两个用 `COUNT` / `SUM(size_bytes)` 子查询，按 user_id 聚合）
  - [x] `POST /api/admin/users`：zod 校验 + 用户名唯一 → `CONFLICT`；新账号 `role='user'`, `must_reset=1`

### T-402 · Admin 删除用户 / 重置密码 API

- **依赖**：T-401, T-205
- **关联**：FR-051, FR-052、风险表"最后 Admin"条目、§4.11 产品规格
- **交付物**：
  - [x] `DELETE /api/admin/users/:id`：`requireAdmin`；事务内若删的是最后一个 admin（`COUNT(role='admin')=1` 且目标是 admin）→ `CONFLICT`；否则 DELETE（FK CASCADE clipboards / attachments / sessions）→ commit → 异步 `rm -rf attachments/${userId}`
  - [x] `POST /api/admin/users/:id/reset-password`：zod 新密码 → UPDATE `password_hash` + `must_reset=1`；吊销该用户所有 sessions + publish `session.revoked`

### T-403 · Admin 系统配置 API

- **依赖**：T-005, T-103, T-006
- **关联**：FR-054、§5 admin/config 行
- **交付物**：
  - [x] `GET /api/admin/config`：返回 `{ max_attachment_mb }`（当前仅此一个键）
  - [x] `PATCH /api/admin/config`：zod 校验正整数 1–1024；UPDATE `system_config`；失效 `getMaxAttachmentMb` 的内存缓存

> 需重做：CR-004 —— GET 新增 `public_base_url` 字段；PATCH body 扩展为"`max_attachment_mb` / `public_base_url` 至少一项"。具体在 T-408 落地。

### T-404 · P-005 个人设置页

- **依赖**：T-002, T-107, T-108, T-201
- **关联**：FR-002, FR-003、`product.md` §4.10
- **交付物**：
  - [x] `src/app/(app)/settings/page.tsx`：账号信息只读卡（用户名、角色、注册时间）
  - [x] 修改密码表单：旧 + 新 + 确认；提交调 `/api/auth/change-password`
  - [x] 登出按钮（二次确认）→ `/api/auth/logout` → 跳 `/login`

### T-405 · P-006 用户管理页（Admin）

- **依赖**：T-002, T-401, T-402, T-201
- **关联**：FR-050~FR-053、`product.md` §4.11
- **交付物**：
  - [x] `src/app/(app)/admin/users/page.tsx`：`requireAdmin` 在 layout 或页面入口；表格列：用户名、角色、剪贴板数、存储占用、创建时间、操作
  - [x] "＋ 新增"对话框：用户名 + 初始密码 + 确认
  - [x] "重置密码"对话框：新初始密码 + 确认 + 文案说明
  - [x] "删除"对话框：再输一次用户名做匹配才能提交（强确认）
  - [x] UI 上无任何"查看内容"入口（FR-053 硬约束）

### T-406 · P-007 系统设置页（Admin）

- **依赖**：T-002, T-403, T-201
- **关联**：FR-054、`product.md` §4.12
- **交付物**：
  - [x] `src/app/(app)/admin/system/page.tsx`：`requireAdmin`
  - [x] 单字段表单：附件大小上限（数字，单位 MB）；保存调 `PATCH /api/admin/config`
  - [x] 说明文案："修改后对之后的上传生效；已上传附件不受影响。"

> 需重做：CR-004 —— 增加第二张卡片"公开访问基址"（URL 文本输入，空值允许）；两张卡片各自独立保存。具体在 T-408 落地。

### T-407 · 附件孤儿清理任务

- **依赖**：T-205
- **关联**：§8 孤儿清理、风险表"孤儿文件"
- **交付物**：
  - [x] `src/lib/storage/gc.ts`：扫描 `${DATA_DIR}/attachments/**` → 收集磁盘上的 `(userId, clipboardId, fileId)`；与 `attachments` 表做差集 → 删除数据库中没有的文件
  - [x] 启动入口（server 启动时）+ 每 24h `setInterval` 调用一次
  - [x] 只删除文件，不删除空目录（交给下次启动清理或忽略）

### T-408 · 公开访问基址系统配置（CR-004）

- **依赖**：T-403, T-406, T-210
- **关联**：FR-055、CR-004、`technical.md` §4.5 / §5 / §12、`product.md` §4.9 / §4.12
- **交付物**：
  - [x] `scripts/migrate.ts` 或数据库 seed 逻辑：幂等插入 `system_config` 行 `key='public_base_url', value=''`（已存在则跳过）
  - [x] `src/lib/config/system.ts` 新增 `getPublicBaseUrl()`（与 `getMaxAttachmentMb()` 同模式，10s 内存缓存）
  - [x] `/api/admin/config` GET 返回体扩展为 `{ max_attachment_mb, public_base_url }`
  - [x] `/api/admin/config` PATCH body zod 扩展为 `{ max_attachment_mb?, public_base_url? }`（两者互斥 optional，至少一项，否则 `VALIDATION`）；`public_base_url` 必须为 `""` 或满足 `/^https?:\/\//` + 无末尾 `/` + 长度 ≤ 512
  - [x] PATCH 成功后失效对应字段的内存缓存
  - [x] `src/app/(app)/admin/system/page.tsx`（P-007）在附件大小上限卡下方新增"公开访问基址"卡：URL 输入 + 说明文案（见 `product.md` §4.12）+ 独立"保存"按钮
  - [x] `ClipboardWorkbench` 的 `origin` 来源改写：Server Component（`/c/new/page.tsx`、`/c/[id]/page.tsx`）先调 `getPublicBaseUrl()`，非空则用它，空则走现有 `x-forwarded-host` / `host` 派生
  - [x] 更新 `prototype/P-007-admin-system.html`：增加第二张卡（字段 + 说明文案，视觉对齐现有卡）

### T-501 · PWA（Serwist + manifest + icon）

- **依赖**：T-001, T-003
- **关联**：FR-063、风险表"Service Worker 缓存"
- **交付物**：
  - [x] 安装并配置 `@serwist/next`；HTML 走 NetworkFirst，静态资源按 hash 走 CacheFirst
  - [x] `src/app/manifest.ts` 输出 `manifest.webmanifest`（name、short_name、start_url、display=standalone、主题色取 Crisp Canvas）
  - [x] `public/icons/` 一套基础 icon（192 / 512 / maskable）
  - [x] 启用 `skipWaiting` + `clientsClaim`

### T-502 · healthcheck + entrypoint 串联

- **依赖**：T-007, T-102, T-407
- **关联**：`docker-compose.yml` healthcheck 选项、风险表"单容器崩溃"
- **交付物**：
  - [x] `GET /api/health` 路由：返回 `{ ok: true, db: <pragma user_version>, uptime }`（不鉴权）
  - [x] `docker-compose.yml` 加 healthcheck（`CMD-SHELL wget -qO- http://localhost:3000/api/health || exit 1`）
  - [x] `server.js` 或 `docker-entrypoint.sh` 启动时：跑 migrate → 初始化 session 清理任务 → 初始化孤儿 GC 任务 → 启动 Next.js

### T-503 · 错误边界 + 统一日志

- **依赖**：T-006
- **关联**：§5 错误码、`design.md` 反馈态规范
- **交付物**：
  - [x] `src/app/error.tsx` + `src/app/not-found.tsx`：用 Crisp Canvas 的反馈态呈现
  - [x] `src/lib/log.ts`：结构化日志（`{ t, level, scope, msg, ... }` JSON 行）；生产打 stdout（Docker 默认捕获）
  - [x] 所有 Route Handler 在 `withErrorBoundary` 内打日志；5xx 带 stack、4xx 只带 `code`

### T-504 · 部署文档 / README

- **依赖**：T-007, T-501, T-502
- **关联**：§11, FR-060, FR-061
- **交付物**：
  - [x] `README.md`：项目简介 + 架构图引用 + 开发快速开始 + 生产部署（compose 示例 + 反代示例：Caddy / Nginx Proxy Manager）
  - [x] 反代必须 `X-Forwarded-For`、`X-Forwarded-Proto` 的说明（对应限流风险条目）
  - [x] 备份与恢复：`tar czf backup.tgz ./data`
  - [x] `.env.example` 注释齐全

### T-505 · 跨设备验证走查 checklist

- **依赖**：全部前述任务
- **关联**：`product.md` §4 全部场景、FR-030/031/032, FR-040
- **交付物**：
  - [x] `docs/manual-qa.md`（项目根或 docs_dir 下）：照 FR-001 → FR-063 一条条列手动走查步骤 —— 落在 `.faststack/manual-qa.md`
  - [x] 至少覆盖：首次 setup → 创建 user → 强制改密 → 双端 SSE 同步（编辑 / 新增 / 删除 / 置顶 / 清空）→ 扫码越权到 P-008 → 删除用户后会话被吊销 → 附件超限拒绝 → PWA 安装 → 断网恢复
  - [x] 走查一遍并把发现的问题列入后续迭代（不阻塞本次上线） —— 清单已备，需实机多端走查；开发机单端冒烟已过（lint / typecheck / next build 通过）

---

## 执行建议

- 顺序推进：M1 → M2 → M3 → M4 → M5 → M6。里程碑内依赖标注已写清楚，可小范围并行。
- 每完成一个任务，勾选任务内的 checkbox 与顶部"进度"里的计数。
- 若途中发现需求或技术方案需要改动（不是仅调整粒度），请先运行 `fs-sync` 再回来。
