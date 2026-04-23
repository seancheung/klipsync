# 变更日志

## CR-004 · 2026-04-22

**发起方**：开发阶段（`fs-dev`，处理 P-004 `QRCodePanel` 的 URL 来源问题）。

**变更**：
1. `requirements.md` §3.5 新增 FR-055"配置公开访问基址"（P1）；§2 管理员主要任务补充"公开访问基址"。
2. `product.md` §3 P-007 行关联需求加 FR-055、组件列表扩展为双字段；§4.12 系统设置改写为两个独立卡片（附件大小上限 + 公开访问基址）；§4.9 二维码主流程补一句说明"URL 基址优先用 P-007 配置，空则回退请求访问地址"。
3. `technical.md` §4.5 `system_config` seed 补 `public_base_url=""` 行且说明为幂等；§5 API 表 `/api/admin/config` GET/PATCH 关联 FR 和备注扩展为 `max_attachment_mb / public_base_url`；§12 非功能需求落地对照新增"公开访问基址可配"条。
4. `tasks.md` T-210、T-403、T-406（均已完成）各自下加一行 `> 需重做：CR-004`，不取消勾选；M5 末新增 T-408"公开访问基址系统配置"承担所有重做点；M5 进度 7/7 → 7/8；合计 44 → 45。
5. `prototype/P-007-admin-system.html` 需增加第二张卡（本 CR 仅标注，不直接改 HTML；实际修订由 T-408 交付物承担或另行 `fs-ui` 处理）。

**理由**：自托管场景下，服务可能部署在 NAS 局域网 IP、反代域名、或开发机 localhost，桌面浏览器访问时 request `host` 头未必等于手机（或其他扫码设备）能直接打开的地址。给管理员一个显式覆盖字段 + 空值自动回退到请求 host，既解决"扫码打不开"，又对最小部署场景零配置。

**影响**：
- FR-055（+1，P1 优先级）
- P-007 由单字段页演进为双字段页
- `system_config` 表新增一个 key；`/api/admin/config` 读写双方向扩展
- T-210 / T-403 / T-406 已完成任务需追加实现（QR URL 来源、API 字段、P-007 卡片）
- 新增 T-408 作为集中实施点
- `prototype/P-007-admin-system.html` 需同步

**文档更新**：`requirements.md`、`product.md`、`technical.md`、`tasks.md`、`changelog.md`

---

## CR-003 · 2026-04-22

**发起方**：技术设计阶段用户指示。

**变更**：
1. 包管理器从 pnpm 改为 npm。
2. `technical.md` §11.2 本地开发命令：`pnpm install/dev/drizzle-kit/tsx` → `npm install` + `npm run dev` + `npx drizzle-kit` + `npx tsx`。
3. `technical.md` §11.3 Dockerfile builder 阶段：`pnpm build` → `npm run build`。
4. `tasks.md` T-001：`package.json 使用 pnpm` → `使用 npm（附 package-lock.json）`；`pnpm dev` → `npm run dev`。
5. `tasks.md` T-004：`pnpm drizzle-kit generate` → `npx drizzle-kit generate`。

**理由**：用户明确要求使用 npm 作为包管理器（原生随 Node.js 分发，无需额外安装，对 NAS 部署与新贡献者更零门槛）。pnpm 的 store 复用优势在单项目 self-hosted 场景价值有限。

**影响**：
- `technical.md` §11.2、§11.3 — 已更新
- `tasks.md` T-001、T-004 — 已更新
- `requirements.md` / `product.md` / `design.md` — 不涉及包管理器，不需要改
- 未来开发过程中的命令、CI（如有）按 npm 执行

**文档更新**：`technical.md`、`tasks.md`

---

## CR-002 · 2026-04-22

**发起方**：技术设计阶段用户追问"Bunny Fonts 是否有 npm 包？"。

**变更**：
1. `technical.md` §1 技术栈表格字体行：`Bunny Fonts`（走 CDN）→ `geist` 官方 npm 包（Geist Sans / Mono）+ `next/font/google`（Inter），全部由 Next.js 构建时下载并自托管打包进 `.next/static`。
2. `technical.md` §10 第三方服务：字体条目同步改为 npm 自托管。
3. `technical.md` §10 npm 依赖清单补充 `geist`。
4. `technical.md` §1 技术栈表格框架版本：Next.js 15 → Next.js 16（三处）。

**理由**：
- Bunny Fonts 没有官方 npm 包，只能走 CDN，运行时依赖外网；KlipSync 是家庭 NAS 自托管产品，FR-061 明确"不依赖外部 SaaS"，内网/断网场景走 CDN 会导致字体加载失败。
- `geist` 官方 npm 包 + `next/font/google`（构建时下载 + 自托管）同时满足"不给 Google 发请求"与"离线可用"两个目标，比 Bunny 更合适。
- Next.js 16 已发布，是当前稳定版本。

**影响**：
- `technical.md` §1、§10 — 已更新
- `design.md` §4.1 字体规范中的"加载方式：Bunny Fonts"属于实现细节描述，字体选择（Geist/Inter/Geist Mono）本身不变。不强制同步 design.md；若关注设计规范与实现的一致性，可在后续 fs-sync 中把"加载方式"这句调整为"Next.js 构建时自托管"。
- 其他上游文档（requirements / product）不涉及字体加载细节，无影响

**文档更新**：`technical.md`

---

## CR-001 · 2026-04-22

**发起方**：需求定稿阶段（`fs-req` 完成后主动回看上游一致性）。

**变更**：
1. 核心价值第 2 条"二维码快速跳转"：粒度从"电脑端每条内容自动生成二维码"改为"激活的剪贴板视图展示当前剪贴板链接的二维码"，并明确二维码不是对外分享机制。
2. 核心价值第 3 条标题从"轻度用户区分 + 持续历史"改为"轻度用户区分 + 持续空间"；去掉"最近 N 条可回查"的表述，明确"空间内多个剪贴板，不自动过期、无条数上限，用户自己管"。
3. 竞品分析 ClipCascade 的"可借鉴"列：移除"服务端最新一条的存储模型"（新模型不是"最新一条"而是"多剪贴板"），仅保留"文件大小限制策略"。
4. 竞品分析 PrivateBin 的"可借鉴"列：移除"内容自动过期策略"（明确不做），并在"要避开"列补一句说明。

**理由**：
- 需求收集过程中与用户澄清出 `用户 → 空间 → 多剪贴板` 的分层数据模型，剪贴板即最小单位，不再存在"条目 / 历史"概念；`idea.md` 写作时沿用了"最近 N 条"的粗模型。
- Q2 最终选择"不自动过期、无上限"（self-hosted 场景最大数据自由度），所以竞品里"可借鉴的过期策略"不再成立。
- 二维码定位明确为"同一用户跨设备快捷跳转"而非"分享链接"，原文措辞含糊会误导下游产品设计。

**影响**：
- `idea.md` §核心价值 L29, L30 · §竞品分析 L46, L48
- `requirements.md`：已是本次变更的源头真相（FR-040 / FR-010 / 范围外条款），**不需要改**
- 其他下游文档（product / design / technical / tasks）尚未生成，无影响

**文档更新**：`idea.md`
