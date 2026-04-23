# KlipSync · 手动走查 Checklist（T-505）

> 目的：M6 上线前按需求清单 FR-001 → FR-063 过一遍端到端场景。发现的问题不阻塞本次上线，记录到 `.faststack/changelog.md` 或新开任务处理。
>
> 约定：每一项标 `[ ]` 未验；通过后改 `[x]`；失败写一行"实测 → 现象 → 预期"然后留白等修。

## 前置准备

- [ ] 开发机浏览器：Chrome 最新 + Safari 最新；移动端准备一台真机（手机 / iPad）
- [ ] 清空本地 `./data` 目录（或部署一份干净容器）
- [ ] `docker compose up -d --build`（或 `npm run build && npm run start`）
- [ ] 确认反代透传了 `X-Forwarded-For` / `X-Forwarded-Proto`（生产环境）
- [ ] 准备两台设备：A = 桌面浏览器，B = 移动浏览器或第二个浏览器 profile

---

## A. 认证与初始化（FR-001 ~ FR-005, FR-062）

### A1 · 首次 Setup（FR-062）

- [ ] 访问 `/`，自动 302 到 `/setup`
- [ ] 用户名 < 3 位 / 密码 < 8 位 → 前端实时校验失败
- [ ] 两次密码不一致 → 前端拦截
- [ ] 提交成功 → 自动登录 + 跳到 `/`
- [ ] 重访 `/setup` → 302 回 `/login`（已初始化）
- [ ] 并发压测：两个浏览器同时提交 setup → 一个成功、另一个 409 `CONFLICT`

### A2 · 登录 / 登出（FR-001 / FR-002 / FR-004）

- [ ] 用错误密码登录 → 统一文案"用户名或密码错误"；HTTP 401
- [ ] 连续 5 次失败 → 429 + 倒计时按钮
- [ ] 正确登录 → 跳 `next` 或 `/`
- [ ] 勾"记住我" → 关浏览器重开仍登录；cookie `Max-Age=30d`
- [ ] 不勾"记住我" → 关浏览器重开后变未登录（Session Cookie）
- [ ] 登出 → cookie 清除 + 跳 `/login`

### A3 · 修改密码（FR-003）

- [ ] `/settings` → 输错旧密码 → `INVALID_CREDENTIALS`
- [ ] 新旧相同 → `CONFLICT`
- [ ] 成功修改后 → 会话仍有效（但 token 轮换；测试另一端下一次请求仍通过 —— 服务端实现决定，按实际记录）

### A4 · 强制改密（FR-005）

- [ ] Admin 新建 user → 该 user 首次登录被跳 `/force-reset`
- [ ] Admin 重置某 user 密码 → 该 user 下次登录跳 `/force-reset`
- [ ] `/force-reset` 成功 → `must_reset=0`，正常进入 `/`
- [ ] `must_reset=true` 时访问其他 API → 返 `MUST_RESET` (403)

---

## B. 剪贴板核心（FR-010 ~ FR-022）

### B1 · 列表 / 打开 / 新建（FR-010 ~ FR-012, FR-014, FR-015）

- [ ] 空账号访问 `/` → 跳 `/c/new` 空白编辑区
- [ ] 空白编辑区无输入离开 → 回列表后无新条目（FR-015）
- [ ] 在空白编辑区输入文本 → 自动落盘为新剪贴板（URL 变成 `/c/:id`）
- [ ] 在空白编辑区先上传一个附件 → 自动落盘 + 合并为首条（FR-014）
- [ ] 列表排序：`pinned_at DESC NULLS LAST, updated_at DESC`
- [ ] 列表项显示：文本前几行 + 附件数量 Paperclip 图标 + 相对时间 + 置顶标识

### B2 · 编辑 / 复制 / 删除（FR-013, FR-016, FR-018）

- [ ] 编辑文本 → 300ms 防抖 → PATCH；网络失败能回滚 + 红 toast
- [ ] 一键复制 → 系统剪贴板可以粘出；绿 toast"✓ 已复制"
- [ ] 删除整条 → AlertDialog 二次确认 → 列表刷新 + 跳回 `/`
- [ ] 删除后 `./data/attachments/{user}/{id}/` 目录内文件被异步 unlink（ls 验证）

### B3 · 附件（FR-017, FR-019, FR-020）

- [ ] 拖放文件上传 → 出现卡片 + 进度条
- [ ] 截图粘贴上传（桌面 Chrome `Ctrl+V`）→ 出现卡片
- [ ] 移动端通过"+"按钮走相册 / 文件选择 → 出现卡片
- [ ] 附件超 `max_attachment_mb` → 前端拦 + 红 toast；后端也返 413
- [ ] 下载附件 → 文件名保留（含中文 / 空格）
- [ ] 删除单个附件 → 二次确认 → 卡片消失；其他附件与剪贴板保留

### B4 · 置顶 / 清空（FR-021, FR-022）

- [ ] 置顶 → 徽章出现 + 列表排到最前
- [ ] 取消置顶 → 回到按 `updated_at` 排序的位置
- [ ] "清空"按钮 → 二次确认 → 文本清空 + 附件全删；剪贴板条目仍在

---

## C. 多端同步（FR-030, FR-031, FR-032）

在 A / B 两端登录同一账号，同时打开同一剪贴板。

### C1 · 内容实时同步（FR-030）

- [ ] A 端编辑文字 → B 端 < 2s 内看到更新
- [ ] A 端上传附件 → B 端 AttachmentDrawer 自动出现新卡片
- [ ] A 端删除附件 → B 端卡片消失
- [ ] A 端置顶 / 清空 → B 端同步反映

### C2 · 列表结构同步（FR-031）

- [ ] A 端新建剪贴板 → B 端列表自动 prepend
- [ ] A 端删除某条（非 B 端打开的那条）→ B 端列表过滤掉
- [ ] A 端置顶 → B 端列表顺序重算

### C3 · 当前条目被删（FR-032）

- [ ] A 打开的剪贴板被 B 删掉 → A 端 DeletedBanner 出现，编辑器只读
- [ ] DeletedBanner "返回列表"按钮 → 跳 `/`
- [ ] DeletedBanner "把草稿保存为新剪贴板"→ 内容转存为新条目

### C4 · SSE 恢复

- [ ] 断开 A 端网络 5s → TopBar 状态灯由 open → closed/connecting
- [ ] 恢复网络 → 自动重连 + 状态灯变回 open；恢复期间的事件需要重新 fetch 列表才能补上（记实测情况）

---

## D. 扫码跨设备（FR-040）

- [ ] 编辑区右上角 / 下方渲染 QR 码
- [ ] 未配置"公开访问基址" → QR 解出来是当前访问的 host（例如反代域名）
- [ ] 已配置"公开访问基址" → QR 解出来是该 URL；末尾无多余 `/`
- [ ] 用另一个账号扫码跳同一 `/c/:id` → 跳 P-008 "此剪贴板不存在或无权访问"（FR-040 越权）
- [ ] 未登录扫码 → 跳 `/login?next=/c/:id` → 登录后进原页

---

## E. 管理员（FR-050 ~ FR-055）

### E1 · 用户管理（FR-050, FR-051, FR-052, FR-053）

- [ ] 非 admin 访问 `/admin/*` → 403 / 跳 `/` 或其他保护路由（按实际实现）
- [ ] Admin 新增 user → 成功后列表出现，`must_reset=1`
- [ ] Admin 删除 user → 强确认（再输一次用户名）；该 user 所有剪贴板 / 附件 / session 都被清
- [ ] 被删 user 若有活跃 session → 收到 `session.revoked` 事件 → 前端强制跳 `/login`（人工确认一次）
- [ ] Admin 尝试删"最后一个 admin" → `CONFLICT`，不允许
- [ ] Admin 重置 user 密码 → 该 user 所有 session 被吊销；下次登录跳 `/force-reset`
- [ ] 列表显示：剪贴板数 + 存储占用（与真实 `./data/attachments/{user}` 磁盘占用对齐）
- [ ] UI 无任何"查看用户剪贴板内容"入口（FR-053 硬约束）

### E2 · 系统设置（FR-054, FR-055）

- [ ] `/admin/system` 附件大小上限卡：改成 20 → 保存后上传 15MB 成功 / 25MB 被拒
- [ ] 已有附件不受新上限影响（能继续下载，不被清）
- [ ] 公开访问基址卡：填 `https://klip.example.com` → QR 立即用新基址拼 URL
- [ ] 公开访问基址填 `not-a-url` → 保存失败 `VALIDATION`
- [ ] 末尾带 `/` 或超 512 字符 → 保存失败

---

## F. 部署 / 非功能（FR-060, FR-061, FR-063）

### F1 · Compose 部署（FR-060, FR-061）

- [ ] `docker compose up -d --build` 全新拉起不报错
- [ ] 容器重启后数据保留（`./data` 卷挂载生效）
- [ ] 没有任何对外网请求（`tcpdump` / 抓包或看日志无外网域名）
- [ ] `docker inspect --format='{{.State.Health.Status}}' klipsync` → `healthy`

### F2 · PWA（FR-063）

- [ ] `/manifest.webmanifest` 可访问，包含 name / icons / theme_color
- [ ] Chrome 地址栏出现"安装 KlipSync"入口；安装后桌面图标可打开
- [ ] iOS Safari "添加到主屏幕"后图标为紫底白剪贴板
- [ ] 二次访问时 `/sw.js` 已注册；`console.log(await navigator.serviceWorker.getRegistration())` 非空
- [ ] 升级后新版本通过 `skipWaiting` 立即生效（提交新版本部署后关闭再打开页面应已是新版）

### F3 · 断网恢复

- [ ] 在线态刷新 → NetworkFirst 走网络
- [ ] 关闭网络刷新 → 静态资源仍可从 SW 缓存加载；API 请求失败显示合理错误态
- [ ] 恢复网络 → reloadOnOnline 重载页面 / 手动刷新恢复正常

---

## G. 错误与边界

- [ ] 访问 `/c/不存在的id` → 跳 `/forbidden`（P-008）
- [ ] 手动构造异常（例如在某 API 内抛 Error）→ 前端显示 `src/app/error.tsx` 反馈态 + 有 digest；服务端 stdout/stderr 有 JSON 错误行（`level: "error"`, `stack` 字段）
- [ ] 访问不存在路由 → `src/app/not-found.tsx` 显示
- [ ] 4xx 错误服务端日志 level=warn，仅带 `code`，不带 stack

---

## 走查结果汇总

- 走查日期：
- 走查人：
- 通过项：/ 总项
- 发现的问题（登记到 changelog 或开新任务）：
  -
  -
  -
