# KlipSync · 设计规范

> 上游：[产品设计](./product.md) ｜ 下游：[技术设计](./technical.md) ｜ 预览：[./design-preview.html](./design-preview.html) ｜ 原型：[./prototype/index.html](./prototype/index.html)

## 1. 设计原则

1. **画布是纯白，不是灰。** 窗口外层 `#F5F5F7` 作为 frame，内容区 `#FFFFFF` 作为真正的画布，层次靠"留白 + 1 px 投影"建立，不靠花哨阴影或色块分区。
2. **紫色只在主动作和信号上。** `Soft Violet #7C5CFC` 只作用于三处：品牌 Logo、Primary CTA（登录 / 创建 / 确认）、置顶与"已同步"等反馈信号。正文、表单、列表本身不染紫。
3. **Pastel 徽章是情绪，不是装饰。** 桃 / 薄荷 / 玫红 / 琥珀 / 天蓝 / 淡紫六色各自对应唯一语义（上传中 / 已保存 / 已删除 / 保存中 / 提示 / 置顶），不可随意复用。
4. **扁平至上，拒绝拟物。** 按钮无 inset 高光、无彩色 glow；卡片仅有 `0 1px 2px rgba(22,22,37,0.04)` 的一像素投影做 elevation；渐变只在禁止清单里。
5. **工具气质靠选择性 mono。** 时间戳、剪贴板 ID、URL、文件大小、快捷键提示用 Geist Mono，其余一律 Geist / Inter——mono 过多会把工具变成终端。

## 2. 平台与美学方向

- **目标平台**：Web 优先 · 响应式（桌面浏览器 + 移动浏览器，共用一份前端代码）
- **设计体系基础**：不依附 Material / HIG / Fluent，独立的 Crisp Canvas 系统，参照 AlignUI / Linear / Vercel 的扁平 SaaS 方向
- **风格方向**：Crisp Canvas —— 纯白画布 + Soft Violet CTA + Pastel 状态徽章
- **调性**：专业克制 + 当代 SaaS 友好感，兼顾技术管理员和家庭成员的双重受众
- **单位体系**：px / rem，基于 4 px 基准
- **参考**：AlignUI（dashboard 气质、pastel 状态）、Linear（紫色品牌 + kbd 芯片）、Vercel（排版纪律）

## 3. 色彩体系

### 3.1 中性底色 · Neutrals

| 名称 | 浅色 | 深色 | 用途 | CSS 变量 |
| --- | --- | --- | --- | --- |
| Bg | `#F5F5F7` | `#0F0F14` | 窗口外层底色（app shell、body） | `--c-bg` |
| Bg Raise | `#FFFFFF` | `#18181F` | 卡片 / 编辑区 / 输入框 / 面板 | `--c-bg-raise` |
| Bg Sunk | `#EDEDF0` | `#07070B` | hover 下沉态、thumb 占位灰 | `--c-bg-sunk` |
| Line | `rgba(22,22,37,0.07)` | `rgba(245,245,248,0.07)` | 弱分隔线 | `--c-line` |
| Line Strong | `rgba(22,22,37,0.12)` | `rgba(245,245,248,0.14)` | 输入框边框、卡片内部分隔 | `--c-line-strong` |

### 3.2 文本 · Foreground

| 名称 | 浅色 | 深色 | 用途 | CSS 变量 |
| --- | --- | --- | --- | --- |
| Text | `#171629` | `#F5F5F8` | 标题、正文主文字（**非纯黑/纯白**） | `--c-text` |
| Text Mute | `#5E5C73` | `#A4A3B5` | 次要说明、meta 行、placeholder | `--c-text-mute` |
| Text Dim | `#8B8A9E` | `#6F6D82` | 时间戳、占位文字、禁用字 | `--c-text-dim` |

### 3.3 品牌紫 · Primary Accent

| 名称 | 浅色 | 深色 | 用途 | CSS 变量 |
| --- | --- | --- | --- | --- |
| Accent | `#7C5CFC` | `#9B82FD` | Primary CTA 填充、Logo、active 左指示条、accent 着色词 | `--c-accent` |
| Accent Soft | `#EFEAFE` | `rgba(155,130,253,0.16)` | 置顶徽章底、"已同步"反馈底、active 列表项底 | `--c-accent-soft` |
| Accent Strong | `#6A45E8` | `#B8A5FE` | Primary hover / pressed、accent 徽章字色 | `--c-accent-strong` |

**紫色使用规则**：
- **填充紫**（Primary CTA）：登录、创建管理员、创建用户、确认、保存设置。按钮内文字永远是纯白（浅色）或纯深色（深色反色）。
- **轮廓紫 / 软底紫**（反馈态）：复制成功 ✓、落盘成功、置顶徽章、"剪贴板已创建"消息。
- **禁止**：不在正文、列表项、表格、输入框中使用紫色。不做任何形式的 gradient。

### 3.4 Pastel 语义色 · Semantic

所有语义色均用"深字 + 对应 pastel 软底"组合，不用饱和色填充（避免 alert 显得刺眼）。

| 名称 | 浅色字 / 底 | 深色字 / 底 | 唯一语义 |
| --- | --- | --- | --- |
| Success | `#15803D` / `#DCFCE7` | `#6EE7A5` / `rgba(110,231,165,0.14)` | 已保存、操作成功、已完成 |
| Warn | `#B45309` / `#FEF3C7` | `#FBBF24` / `rgba(251,191,36,0.14)` | 未保存重试中、只读、保存中 |
| Danger | `#BE123C` / `#FFE4E6` | `#FB7185` / `rgba(251,113,133,0.14)` | 已删除、超上限、错误 |
| Peach | `#C2410C` / `#FFEDD5` | `#FDBA74` / `rgba(253,186,116,0.14)` | 上传中、进行中、等待 |
| Info | `#0369A1` / `#E0F2FE` | `#7DD3FC` / `rgba(125,211,252,0.14)` | 中性提示、扫码引导 |
| Pinned | Accent-strong / Accent-soft | Accent-strong / Accent-soft | 置顶徽章（同品牌色系） |

## 4. 字体与排版

### 4.1 字体选择

| 角色 | 字体 | 加载 | 回退栈 |
| --- | --- | --- | --- |
| 标题 / UI | **Geist** (300-700) | Bunny Fonts `<link>` | `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif` |
| 正文 / 编辑区 | **Inter** (400/500/600) | Bunny Fonts `<link>` | `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif` |
| 数据 / 时间 / ID / URL / 代码 | **Geist Mono** (400/500) | Bunny Fonts `<link>` | `ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace` |

**加载方式**：使用 Bunny Fonts（GDPR 友好、无跟踪）而非 Google Fonts，通过 `<link rel="preconnect">` + `<link href="...&display=swap">` 加载，减少 FOIT。

**选择理由**：
- Geist 是为工具类 web app 设计的当代字体，比 Inter 更有 SaaS 气质，作为标题 / UI 字体
- Inter 作为正文字体成熟可靠，中文场景 fallback 系统字体自然
- Geist Mono 与 Geist 同家族，切换到 mono 时视觉过渡平滑

### 4.2 字号层级

| 层级 | 字号 | 行高 | 字重 | 字距 | 用途 |
| --- | --- | --- | --- | --- | --- |
| Display | 44 px | 1.05 | 500 | -0.035em | 登录页欢迎语、首次部署引导标题 |
| H1 | 32 px | 1.10 | 600 | -0.025em | 页面主标题（"我的空间" "用户管理"） |
| H2 | 22 px | 1.20 | 600 | -0.015em | 段落标题（设置分组） |
| H3 | 17 px | 1.30 | 600 | 0 | 卡片标题、对话框标题 |
| Body | 15 px | 1.55 | 400 | 0 | 编辑区正文、对话框说明文字 |
| Body Small | 13 px | 1.50 | 400 | 0 | 列表项正文、alert 正文 |
| Meta (mono) | 12 px | 1.50 | 400 | 0 | 时间戳、ID、URL、文件大小 |
| Caption | 12 px | 1.40 | 400 | 0.01em | placeholder 提示、表单 help 文本 |

## 5. 间距与布局

### 5.1 间距系统

基础单位 **4 px**，令牌：

```
--s-1  = 4  px   紧凑缝隙（图标内边距）
--s-2  = 8  px   表单字段内元素间距
--s-3  = 12 px   列表项内部间距
--s-4  = 16 px   卡片内部组间距、按钮水平 padding 参考
--s-6  = 24 px   卡片 padding、编辑区 padding
--s-8  = 32 px   页面水平 padding、段落间距
--s-12 = 48 px   section 间距
--s-16 = 64 px   大段分隔
```

### 5.2 布局（Web）

- **最大内容宽度**：
  - 认证 / 状态页：400 px 卡片居中
  - 设置页：720 px 单栏
  - 用户管理表格页：1040 px
  - 主工作台：无外宽限制，左栏 320 px 固定 + 右栏弹性
- **断点**：
  - ≥ 900 px：主工作台双栏（列表 + 编辑器并排）
  - < 900 px：主工作台栈式（列表全屏 ↔ 编辑器全屏切换，顶部 "< 返回"按钮）
  - < 780 px：认证页卡片横向 padding 减半，表格页改用卡片列表
- **圆角令牌**：
  - `--r-sm`  = 6 px（徽章辅助）
  - `--r-md`  = 8 px（按钮、输入框、缩略图）
  - `--r-lg`  = 14 px（卡片、对话框、编辑区 textarea）
  - `--r-xl`  = 18 px（最外层容器，弱化使用）
  - `--r-pill` = 999 px（状态徽章胶囊）

### 5.3 AppShell 结构

```
┌─ TopBar ─────────────────────────────────────────┐
│ [K] KlipSync    [搜索(占位)]    [🔔] [用户菜单▾]  │
├──────────────┬──────────────────────────────────┤
│ ClipList     │  Editor                          │
│ 320 px       │  flex                            │
│              │                                  │
│ ＋ 新建       │  工具栏                           │
│ ▸ 列表项1     │  文本区                           │
│   列表项2     │  附件网格                         │
│   ...        │  二维码面板（折叠/展开）           │
└──────────────┴──────────────────────────────────┘
```

## 6. 组件规范

### 6.1 按钮 · Button

| 变体 | 浅色 | 深色 | 用途 |
| --- | --- | --- | --- |
| Primary | Accent 填充 + 纯白字 + 白底紫字 kbd | Accent 填充 + 近黑字 + 深底紫字 kbd | 登录、创建、确认、保存 |
| Secondary | Raise 底 + 边框 + Text 字 | Raise 底 + 边框 + Text 字 | 取消、重试、下载 |
| Ghost | 透明 + Text Mute 字 | 同左 | ＋新建、设置入口 |
| Accent（软底） | Accent Soft 底 + Accent Strong 字 + 淡边框 | 同左 | 反馈态（✓ 已复制）、次强 CTA |
| Danger | 透明 + Danger 字，hover 变 Danger Soft 底 | 同左 | 删除、清空 |

**尺寸**：

| 尺寸 | Padding | 字号 | 用途 |
| --- | --- | --- | --- |
| `.btn-sm` | 4 px / 8 px | 12 | 工具栏、列表项内操作 |
| 默认 | 6 px / 12 px | 13 | 对话框确认、表单提交 |
| `.btn-lg` | 8 px / 14 px | 14 | 欢迎页主 CTA |

**交互**：hover 变色用 120 ms 过渡；`:active` translateY(0.5px) 模拟微弱按压；disabled opacity 0.5 + cursor not-allowed。

### 6.2 表单 · Input / Textarea

- 背景：`--c-bg-raise`（**永远白色 / raise 色**，不用 sunk 灰——避免误读为禁用态）
- 边框：`--c-line-strong`（约 1 px）
- 圆角：`--r-md` 8 px
- padding：9 / 12 px（小号输入）；16 px（textarea）
- **focus 态**：边框变 `--c-accent`（紫），叠加 `0 0 0 3px var(--c-accent-soft)` 光晕环
- **error 态**：边框 `--c-danger`，focus 光晕换成 `--c-danger-soft`
- **help 文本**：用 Geist Mono · 11 / 12 px，error 态同色

### 6.3 卡片 · Card

- 背景 `--c-bg-raise`（白 / 深紫黑）
- 边框 1 px `--c-line`
- 圆角 `--r-lg` 14 px
- 内 padding `--s-6` 24 px
- 阴影极淡 `0 1px 2px rgba(22,22,37,0.04)`（深色下 `rgba(0,0,0,0.4)`），仅做 elevation 暗示
- **不得**使用彩色阴影、多层阴影、magnified hover 放大效果

### 6.4 导航 · TopBar / Sidebar

**TopBar**：
- 高度 56 px（`padding: 16px 32px`）
- 背景 `--c-bg` 85% 透明 + `backdrop-filter: blur(8px)`
- 底部 1 px `--c-line` 分隔
- 左：品牌 mark（28 px 紫色圆角方块，白字 "K"）+ 产品名 + 版本 tag（mono，弱化）
- 右：搜索 / 通知 / 用户菜单

**左栏列表（桌面）/ 顶部栏切换（移动）**：
- 列表项高度 56 px
- hover：`--c-bg-sunk` 底
- active：`--c-accent-soft` 底 + **左侧 3 px `--c-accent` 竖条**（高度 8 px 留白到 8 px 底，圆角 `0 3px 3px 0`）

### 6.5 消息反馈 · Alert

- 圆角 `--r-lg`
- 无边框，仅 pastel 软底
- 内部：6 px 小圆点（深色同类色）+ 正文（**标题用该语义深色，副文用 `--c-text-mute`**）
- 六种变体：accent / success / warn / danger / info / peach（同语义色表）
- padding `--s-3 --s-4`

### 6.6 状态徽章 · Badge（胶囊）

- 圆角 `--r-pill` 999 px
- 字体 Geist · 500 · 12 px（不用 mono）
- padding 3 / 10 px
- 结构：小圆点 6×6 + 文字
- 所有徽章都是"pastel 底 + 对应深色字 + 对应深色点"

常见徽章语义化清单（在 design-preview.html "Pastel Badges" 中完整展示）：

| class | 用途 |
| --- | --- |
| `.badge.pinned` | 置顶 |
| `.badge.confirmed` | 已保存 / 已同步 / 已完成 |
| `.badge.progress` | 保存中 / 同步中 |
| `.badge.rejected` | 已删除 / 超上限 |
| `.badge.pending` | 上传中 / 离线 |
| `.badge.info` | 设备在线、中性提示 |

### 6.7 列表项 · ClipItem

- 三列网格 `16px 1fr auto`
- 左：置顶图钉位（置顶时显 `--c-accent`，否则留白保宽）
- 中：文本摘要（最多 2 行，CSS `-webkit-line-clamp`）+ 下一行 meta（相对时间 + 附件计数 📎 N）
- 右：mono 时间戳（14:22 格式）
- active 态：浅紫底 + 左侧紫色竖条（见 §6.4）

### 6.8 附件卡 · AttachmentCard

- 背景 `--c-bg-raise`（白）+ 1 px `--c-line-strong` 边框
- 圆角 `--r-md`
- hover 边框变 `--c-accent`
- 结构：缩略图区（64 px 高，`--c-bg` 占位灰，显文件类型或图像）+ 文件名（truncate）+ 文件大小（mono，`--c-text-dim`）

## 7. 图标与图形

- **风格**：线性 stroke 1.5 px，圆角终点，统一 24×24 viewBox
- **尺寸令牌**：14 / 16 / 20 / 24（对应 meta / 文本 / 工具栏 / 展示）
- **推荐库**：[Lucide](https://lucide.dev/)（线性、MIT、与 Geist 气质协调），按需内联 SVG，不引入整包
- **Emoji 使用**：慎用。列表项的 📎 附件计数、📌 置顶图钉可保留（语义贴合且无跨平台歧义），其余处不用 emoji 替代图标
- **头像**：圆形 28 / 40 / 64 px，fallback 用首字母 + 该用户的固定浅色（hash 到 6 个 pastel 底之一）

## 8. 动效

| 令牌 | 时长 | 缓动 | 场景 |
| --- | --- | --- | --- |
| `--t-fast` | 120 ms | `cubic-bezier(0.22, 1, 0.36, 1)` | 按钮 hover / focus 态、kbd 反馈 |
| `--t-med` | 200 ms | 同上 | 对话框进出、面板折叠展开、主题切换 |
| `--t-slow` | 400 ms | 同上 | 列表重排（新剪贴板滑入）、"已同步"淡出 |

**仅允许的三类动画**：

1. **新条目落盘**：淡紫底（`--c-accent-soft`）闪烁一下（400 ms），退回默认底色
2. **列表重排**：另一端创建 / 删除时，列表项 FLIP 动画重排（400 ms）
3. **"复制成功"反馈**：按钮文案从"复制"切到"✓ 已复制"（120 ms），2 秒后切回

禁止：shine 光扫、bounce、elastic、3D transform、持续循环动画。

## 9. 设计决策日志

| 日期 | 决策 | 理由 |
| --- | --- | --- |
| 2026-04-22 | 底色从纯 zinc 换成带微紫 tint（`#F5F5F7` frame + `#FFFFFF` canvas） | 用户反馈 Vercel 式纯黑白烂大街，纯灰又显得脏；纯白画布 + 浅灰 frame 是 AlignUI 同款范式 |
| 2026-04-22 | Primary 按钮从黑色填充换成 Soft Violet `#7C5CFC` 填充 | 避免 Vercel 黑按钮的无聊感；让品牌紫真的承担"主动作 CTA"的视觉责任 |
| 2026-04-22 | 强调色从 Sync Amber → Electric Violet → **Soft Violet `#7C5CFC`** | 琥珀偏复古、Violet-600 偏冷硬；Soft Violet 比 `#7C3AED` 更柔和，对齐 AlignUI 参考图的品牌紫气质 |
| 2026-04-22 | 语义色从 tailwind 饱和色 → **Pastel 深字 + 软底** 组合 | 饱和色做 alert 填充会刺眼；pastel 底 + 深色字兼顾可读和柔和，也更贴合参考图 |
| 2026-04-22 | 按钮、Logo 去掉 `inset` 高光和彩色 glow | 用户明确拒绝拟物风格；扁平纯色填充是当代 SaaS 共识 |
| 2026-04-22 | 输入框 / textarea / 附件卡背景从 `--c-bg` 灰 → `--c-bg-raise` 白 | 白卡片上灰输入框会被误读为禁用态；改白底靠边框分界是 AlignUI / Linear 做法 |
| 2026-04-22 | Primary 按钮内的 kbd 从半透明白字 → **白底 + 紫字实心胶囊** | 半透明白字对比度不足；Linear 式反色胶囊对比度最强、辨识度最高 |
| 2026-04-22 | "复制文本"（FR-016）快捷键定为 **⌘ / Ctrl + Shift + C** | `⌘ + C` 与编辑 textarea 内选中文本的系统复制冲突；`⌘ ⇧ C` 是 Notion / Raycast 同类"复制整块 / 整条内容"的通用习惯，辨识度高且无冲突 |
| 2026-04-22 | 附件从"编辑区底部 chip 行"改为"工具栏按钮 + 右侧滑出抽屉" | chip 行即便做了 3 行滚动，仍占用固定纵向空间；改抽屉后编辑区撑满全高，附件作为"辅助视图"按需唤出，更符合"剪贴板 = 文本为主 + 附件为辅"的产品语义 |
| 2026-04-22 | 移动端（视口 < 900 px）隐藏二维码按钮 | 二维码的唯一使用场景是"桌面 → 手机的单向跳转"；在手机上扫自己手机上的码没有意义，展示反而浪费工具栏空间 |
