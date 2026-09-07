# ai-codex-toolkit

`ai-codex-toolkit` 用于集中维护 AI 编程规范、场景化指令、技术方案和 Codex 主题。

## 目录结构

```text
ai-codex-toolkit/
├── ai-rules/             # AI 编码规范目录
│   └── coding-standards.mdc  # 通用编码规范和协作约定
├── ai-instructions/      # 场景化指令目录
│   ├── bugfix.md             # AI 批量排查和修复 Bug 的执行指令
│   └── imagegen-sub2api.md   # 通过 Sub2API 配置 Codex 生图的执行指令
├── ai-solutions/         # 技术方案目录
│   └── Elasticsearch大数据量索引与蓝绿迁移通用方案.md  # 可复用的 Elasticsearch 迁移方案
└── ai-theme/             # Codex 主题目录
    ├── apply.bat             # 实时应用 Codex 主题
    ├── pause.bat             # 移除主题并恢复原生界面
    ├── src/                  # 样式生成和无重启注入代码
    └── theme/                # 主题配置及图片资源
```

## AI 编码规范

[`ai-rules/coding-standards.mdc`](ai-rules/coding-standards.mdc) 是日常开发任务唯一需要 AI 主动读取的规范文件，包含通用编码规范、协作约定、多项目识别方式和按技术栈生效的专项规则。

### 使用方式

把 `ai-codex-toolkit` 放到你的工作目录里，和业务项目同级即可。

在 Codex 全局指令中只配置规则入口和读取时机，具体编码要求统一在 `coding-standards.mdc` 中维护。

### Codex 全局指令示例

```text
默认使用中文沟通，回答先给结论，再给关键原因，保持简洁。

默认由当前会话直接处理；小型、单文件或顺序依赖任务不主动委派。
仅用户明确要求，或多个独立子任务并行能明显缩短总耗时时，才使用子代理；自动拆分的任务不得修改同一文件或影响同一接口、共享契约，主会话负责整合和验证。

不要在每个新会话自动读取编码规范。
仅当用户明确要求查代码、按规范执行、排查本地项目，或修改、修复、实现、重构、review 本地源码、配置或脚本时，读取：
D:\work\ai-codex-toolkit\ai-rules\coding-standards.mdc
同一会话中，已完整读取且内容仍在上下文中的规则直接复用；仅在规则更新、切换适用项目或上下文缺失时重新读取所需规则。
仅询问原因、方案、可行性或优化思路，且未要求检查本地文件时，不读取编码规范、不搜索项目、不运行命令。
普通聊天、概念解释、资料查询、单纯 Git 操作、文件传输、环境查询及不修改配置的 Docker 操作，不加载编码规范。

当前项目优先采用用户指定的项目路径；只给文件路径时使用其所在仓库，否则使用当前工作目录。
全局指令只固定通用规范入口，不固定业务项目名称或路径。
遵循已加载的项目指令；读取或修改目标文件前，仅补充读取项目根目录到目标文件目录链中尚未加载且适用的 `AGENTS.md`。
项目规范优先于通用编码规范；更近层级只覆盖冲突条目，其余上层规则继续适用。

解释、咨询、诊断、排查、review 及“先分析”请求默认只读，不修改文件。
用户明确要求修复、实现、重构或修改时，直接完成范围内工作和必要验证，常规实现选择自行判断，不重复确认已授权操作。
必要关联改动说明原因和影响；缺少影响正确性的关键信息、需要扩大需求或涉及未授权操作时，提出必要问题，并继续不受阻碍的已授权工作。
```

### 配置原则

- 全局指令只负责规则路由、项目识别和修改权限。
- 具体编码规范统一放在 `coding-standards.mdc` 里维护。
- 按上述触发条件读取通用规范，复用已加载内容并补齐适用的项目规则；更近层级仅覆盖冲突条目。

## 场景化指令

[`ai-instructions/bugfix.md`](ai-instructions/bugfix.md) 用于 AI 批量读取问题清单、定位代码并执行修复。它是特定任务的执行模板，不属于每次开发都要加载的通用规范。

[`ai-instructions/imagegen-sub2api.md`](ai-instructions/imagegen-sub2api.md) 用于在 Windows 环境下配置 Codex 通过 Sub2API 调用图片生成模型，并完成环境与接口验证。

## 技术方案

[`ai-solutions/Elasticsearch大数据量索引与蓝绿迁移通用方案.md`](ai-solutions/Elasticsearch大数据量索引与蓝绿迁移通用方案.md) 用于指导 Elasticsearch 大数据量场景下的索引设计、数据同步、蓝绿切换、校验和回滚。

## Codex 主题

[`ai-theme`](ai-theme) 是独立的 Codex 桌面端主题源码，采用运行时注入，不需要安装到 Codex，也不会修改 Codex 安装目录。

- 运行 `ai-theme/apply.bat`：向当前 Codex 窗口实时应用主题，无需重启。
- 运行 `ai-theme/pause.bat`：移除主题并恢复原生界面。
- 修改 `ai-theme/theme`：调整主题配色、背景和装饰图片。

Codex 更新或完全退出后，运行时注入会被清除，需要再次运行 `apply.bat`。该目录是附加工具，普通代码任务不需要读取。

## License

MIT
