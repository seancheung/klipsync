# FastStack 文档目录

本目录存放 FastStack 流程生成的所有文档产物。

## 文件清单

| 文件 | 来源 Skill | 说明 |
| --- | --- | --- |
| `idea.md` | `fs-idea` | 想法梳理：把模糊的点子澄清为产品方向 |
| `requirements.md` | `fs-req` | 需求文档：用户角色 + 功能清单 + 关键流程（lite 模式） |
| `product.md` | `fs-prod` | 产品功能设计：功能规格、信息架构、页面/模块清单 |
| `design.md` | `fs-ui` | 设计规范 |
| `design-preview.html` | `fs-ui` | 自包含预览页 |
| `prototype/*.html` | `fs-ui` | HTML 原型 |
| `technical.md` | `fs-tech` | 技术设计：技术栈、架构、数据模型、API 设计 |
| `tasks.md` | `fs-tasks` | 任务拆解：可独立执行的开发任务清单 |
| `changelog.md` | `fs-sync` | 变更日志：下游变更回流到上游的记录 |

## 标准流程

```
fs-idea → fs-req → fs-prod → fs-ui → fs-tech → fs-tasks → fs-dev
```

## 当前模式：lite

- `fs-idea`：无 MVP 规划，只要边界
- `fs-req`：只要用户角色 + 功能清单 + 关键流程
- `fs-prod`：去掉数据与指标
- `fs-tasks`：不要验收标准，不拆测试任务
- `fs-dev`：跑 lint + typecheck + 目视验证，**不写不跑测试**
