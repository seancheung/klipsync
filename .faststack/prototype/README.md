# KlipSync · 原型说明

> 基于：[product.md](../product.md)  ·  规范：[design.md](../design.md)  ·  预览：[design-preview.html](../design-preview.html)
>
> 入口：直接在浏览器打开 [index.html](./index.html)（原型导航索引页）

## 1. 技术形态

- 纯静态 HTML / CSS / 内联 SVG / vanilla JS，无构建工具、无 npm 依赖
- 字体通过 Bunny Fonts CDN 加载（Geist / Inter / Geist Mono）
- 样式共享：所有页面引用同一份 [`styles.css`](./styles.css)
- 交互共享：所有页面引用同一份 [`interactions.js`](./interactions.js)（主题切换 / modal 开关 / 列表激活 / 移动端栈式切换 / 复制反馈 / toast）

## 2. 文件结构

```
prototype/
├── index.html              # 原型导航入口（页面索引）
├── styles.css              # 所有页面共享的设计系统 + 组件样式
├── interactions.js         # 通用 vanilla JS 交互
├── P-001-setup.html        # 首次部署引导
├── P-002-login.html        # 登录
├── P-003-force-reset.html  # 强制改密
├── P-004-workbench.html    # 主工作台 ★ 核心
├── P-005-settings.html     # 个人设置
├── P-006-admin-users.html  # 用户管理（Admin）
├── P-007-admin-system.html # 系统设置（Admin）
└── P-008-not-found.html    # 无权访问状态页
```

## 3. 页面清单

| 文件 | P-ID | 名称 | 描述 | 对应 FR |
| --- | --- | --- | --- | --- |
| `P-001-setup.html` | P-001 | 首次部署引导 | 创建首位 Admin | FR-062 |
| `P-002-login.html` | P-002 | 登录页 | 用户名 + 密码 + 记住我 | FR-001, FR-004 |
| `P-003-force-reset.html` | P-003 | 强制改密 | 初始密码 / 重置后必须改 | FR-005 |
| `P-004-workbench.html` | P-004 | 主工作台 | **核心**：列表 + 编辑器 + 二维码面板 | FR-010~FR-022, FR-030~FR-032, FR-040 |
| `P-005-settings.html` | P-005 | 个人设置 | 账号 / 密码 / 登出 | FR-002, FR-003 |
| `P-006-admin-users.html` | P-006 | 用户管理 | 新增 / 重置 / 删除 | FR-050~FR-053 |
| `P-007-admin-system.html` | P-007 | 系统设置 | 附件大小上限 + 存储概览 | FR-054 |
| `P-008-not-found.html` | P-008 | 无权访问 | 软落地错误页 | FR-040（越权分支）, FR-032 |

## 4. 页面导航关系

```
          [未初始化]            ┌─────────────────────────┐
         ┌──────────┐           │                         │
         │  P-001   │ ──────────▶  P-004 (主工作台)       │
         │  初始化   │                                    │
         └──────────┘                                    │
                                                        │
                                                        │
          [未登录]                                       │
         ┌──────────┐                                    │
         │  P-002   │ ──────────▶  P-004 (主工作台)      │
         │  登录     │                                    │
         └──────────┘                                    │
                │                                        │
          [must_reset=true]                              │
                ▼                                        │
         ┌──────────┐                                    │
         │  P-003   │ ──────────▶  P-004 ◀───────────────┘
         │  强制改密 │
         └──────────┘
                                 ┌─────────────────┐
                                 │  P-005 设置     │ ──登出──▶ P-002
                                 │                 │
                                 │  (管理员入口)    │
                                 └────┬────────────┘
                                      │
                      ┌───────────────┴────────────┐
                      ▼                            ▼
               ┌──────────────┐            ┌──────────────┐
               │ P-006 用户   │            │ P-007 系统   │
               │  管理 (Admin)│            │  设置 (Admin)│
               └──────────────┘            └──────────────┘

        [异常软落地] (扫码越权 / URL 失效 / 已删除)
                     ▼
               ┌──────────────┐
               │  P-008       │ ──返回──▶ P-004
               │  无权访问     │
               └──────────────┘
```

## 5. 各页面详细说明

### P-004 主工作台 ★

核心页面，三种激活态（见 product.md §5.3）：

- `BlankDraft` — 未落盘的空白编辑区（在当前原型中未单独建视图，通过清空 textarea 模拟）
- `ActiveClipboard(id)` — **本页默认展示态**，含真实文本 + 2 个附件 + 1 个上传中的附件
- `ListOnly` — 仅移动端的列表态，通过 `.hide-on-mobile` 类切换

**主要区域**：

- **TopBar**（高度 56 px）：品牌 mark + 搜索（`⌘ K`）+ 主题切换 + 通知 + 用户 chip
- **左栏 ClipList**（320 px 固定宽度）：
  - head：空间名 + 条目计数 + "＋ 新建"按钮（`⌘ N`）
  - 列表：置顶项在前（图钉显示）、active 项（左侧紫色指示条 + 浅紫底）、hover 浅灰底
  - 每项：文本摘要（2 行截断）+ meta（相对时间 + 📎 附件计数）+ 右侧 mono 时间戳
- **右栏 Editor**（弹性）：
  - toolbar：左 `复制文本`（带反馈动画）/`已置顶`/`清空`/`删除` ；右 `已保存`徽章 + URL + 保存时间
  - 可选横幅：`此剪贴板已被删除` danger alert（在 HTML 注释中，取消注释即可展示）
  - textarea（白底 + 紫色 focus 环）
  - 附件网格：含 PDF / PNG 正常态 + XLSX 上传中 42% 进度态
  - 二维码面板：白底卡片 + QR SVG（装饰性，不可扫）+ URL 展示

**交互**：

- 点击列表任一项切换 active（vanilla JS）
- `复制文本` 按钮点击后切换成"✓ 已复制"2 秒后复原
- `清空` / `删除` 分别弹出二次确认 modal
- 移动端（< 900 px）：双栏改栈式，列表项点击后隐藏列表显示编辑器，编辑器 toolbar 上"< 返回"按钮显现

**状态覆盖**：

- ✅ 默认激活态
- ✅ Uploading 态（附件卡 42% 进度）
- ✅ 修改中 toast（`已保存`徽章 + 确认态）
- 🔲 `已被删除` 横幅（HTML 注释中，需手动开启）
- 🔲 `空间为空` 态（可在 cliplist div 内放 `.cliplist-empty` 元素模拟）
- 🔲 `未保存 · 重试中` 态（把 `已保存` 徽章换成 `.badge.progress`）

### P-001 首次部署引导

- 单卡居中 `auth-card` 结构 · 窄 400 px
- info alert 提示"一次性步骤"
- 表单：用户名 / 密码 / 确认密码，submit 后跳 P-004

### P-002 登录页

- 同样 `auth-card` 结构
- "记住我"默认勾选（对应 FR-004 长期 Cookie）
- 底部 alt-row 提示"联系管理员"

### P-003 强制改密

- warn alert 解释为什么落在这里
- 三个字段（旧密码 / 新密码 / 确认），error 态演示在第三个字段上
- 底部允许登出（但无其他跳出路径，对应 FR-005 硬约束）

### P-005 个人设置

- 账号信息卡（头像圆形 + 用户名 + `管理员` pinned 徽章）
- 修改密码卡（3 字段 + Primary 按钮）
- 会话卡（当前会话信息 + 登出 danger 按钮，弹 modal 二次确认）
- 管理员功能卡（两个快捷按钮跳 P-006 / P-007，仅在 Admin 视角下出现）

### P-006 用户管理（Admin）

- `wide` 版 page（1040 px）
- 表格：用户 / 状态（pinned 管理员、progress 待改密、confirmed 活跃）/ 剪贴板数 / 存储占用 / 上次活跃 / 操作
- 表格上方：新增用户 Primary 按钮
- 表格下方：info alert 解释"为什么看不到剪贴板内容"（FR-053 硬约束）
- 两个 modal：新增用户、删除用户（要求输入用户名确认）

### P-007 系统设置（Admin）

- `上传限制` 卡：数字输入 + MB 单位 + info alert 显示当前有效上限
- `存储概览` 卡：一行信息（挂载路径 / 已用可用 / 总剪贴板数 / 版本）

### P-008 无权访问状态页

- 居中 status-page · danger 色大图标
- 主文案 + 副文案解释可能原因
- 单按钮 "返回主工作台"
- 底部 mono 展示访问路径（帮助排查）

## 6. 全局交互模式

- **主题切换**：右上角或顶栏 `[🌞]` 图标 · `data-theme` 属性切换 · localStorage 持久化 · 默认跟随系统
- **页面跳转**：纯 `<a href="P-xxx.html">` 跳转，无 SPA 路由，刷新安全
- **modal**：`data-open-modal="id"` 打开、`data-close-modal` / ESC / 点背景关闭
- **列表激活**：点击 `.clip-item` 自动切换该列表内的 active 类
- **移动端栈式**：`data-mobile="to-editor" / "to-list"` 属性控制两栏隐藏
- **复制反馈**：任何 `data-copy` 按钮点击后临时切换成 `btn-accent + "✓ 已复制"`
- **toast**：`window.klipsyncToast(text, variant)` API，variant = accent / success / warn / danger / info

## 7. 规范引用

- 色彩 / 字体 / 间距 / 动效令牌：见 [design.md](../design.md) §3~§8
- 组件规范（按钮 / 输入框 / 卡片 / 徽章 / 列表项 / 附件卡）：见 [design.md](../design.md) §6
- 交互态约束（FR-014 自动落盘、FR-030 秒级同步、FR-032 删除横幅等）：见 [product.md](../product.md) §4

## 8. 验收要点

在浏览器中打开 [index.html](./index.html)，至少逐项确认：

- [ ] 浅色 / 深色切换后所有页面都可读、无对比度崩塌
- [ ] P-004 工具栏的"复制文本"按钮点击后能变成 "✓ 已复制"、2 秒后自动复原
- [ ] P-004 列表项点击能切换 active（紫色左条出现）
- [ ] P-004 "清空" 和 "删除" 按钮能弹出二次确认
- [ ] P-006 / P-004 的徽章颜色和语义匹配（管理员紫、待改密琥珀、已保存绿、保存中琥珀等）
- [ ] 窗口缩小到 < 900 px 时主工作台变栈式、< 600 px 时二维码面板堆栈
- [ ] 表单 input focus 时显示紫色光晕环，不是黑色 / 灰色环
- [ ] 没有任何按钮出现 inset 高光 / 彩色 glow（扁平纪律）
