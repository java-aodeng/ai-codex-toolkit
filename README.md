# ai-codex-toolkit

`ai-codex-toolkit` 用于集中维护 AI 编程规范、场景化执行指令、技术方案和 Codex 桌面端主题，避免把内容分散在不同项目或全局配置中。

## 目录结构

```text
ai-codex-toolkit/
├── ai-rules/             # AI 编码规范目录
│   └── coding-standards.mdc  # 通用编码规范和协作约定
├── ai-instructions/      # 场景化执行指令目录
│   ├── bugfix.md             # AI 批量排查和修复 Bug 的执行指令
│   └── imagegen-sub2api.md   # 通过 Sub2API 配置 Codex 生图的执行指令
├── ai-solutions/         # 可复用技术方案目录
│   └── Elasticsearch大数据量索引与蓝绿迁移通用方案.md  # 可复用的 Elasticsearch 迁移方案
└── ai-theme/             # Codex 桌面主题目录
    ├── apply.bat             # 实时应用 Codex 主题
    ├── pause.bat             # 移除主题并恢复原生界面
    ├── src/                  # 样式生成和无重启注入代码
    └── theme/                # 主题配置及图片资源
```

## 开发规范

[`ai-rules/coding-standards.mdc`](ai-rules/coding-standards.mdc) 是日常开发任务唯一需要 AI 主动读取的规范文件，包含通用编码规范、协作约定、多项目识别方式和按技术栈生效的专项规则。

### 使用方式

把 `ai-codex-toolkit` 放到你的工作目录里，和业务项目同级即可。

在 Codex 全局指令中只配置规则入口和读取时机，具体编码要求统一在 `coding-standards.mdc` 中维护。

### Codex 全局指令示例

```text
默认使用中文沟通，回答先给结论，再给关键原因。

默认由当前会话直接处理，不主动使用子代理或任务委派。
仅当用户明确要求，或任务可拆分为互不依赖、不修改同一文件且不影响同一接口或共享契约的独立子任务时，才使用子代理；主会话负责最终整合和确认。

不要在每个新会话自动读取编码规范。
仅当用户明确要求查代码、按规范执行、排查本地项目、修改、修复、实现、重构或 review 本地源码、配置或脚本时，读取：
D:\work\ai-codex-toolkit\ai-rules\coding-standards.mdc

仅询问原因、方案、可行性或优化思路，且未明确要求检查本地文件时，不读取编码规范，不搜索项目，也不运行命令。
普通聊天、概念解释、资料查询、Git 操作、文件传输、环境查询及不修改配置的 Docker 操作，不加载编码规范。

如果用户给出了项目路径，以该路径作为当前项目。
如果用户只给出文件路径，以该文件所在仓库作为当前项目。
实际读取或修改本地项目文件时，读取项目根目录到目标文件路径之间的 `AGENTS.md`。
存在多层项目规范时，以距离目标文件最近的规范为准。
项目规范与通用编码规范冲突时，以项目规范为准。
全局指令中不固定具体项目名称或项目绝对路径。

对于解释、咨询、诊断、排查和 review 请求，默认只读分析，不修改文件。
对于明确要求修复、实现、重构或修改的请求，直接完成需求范围内的修改。
需要扩大修改范围时，先说明原因和影响。
```

### 配置原则

- 全局指令只负责规则路由、项目识别和修改权限。
- 具体编码规范统一放在 `coding-standards.mdc` 里维护。
- 涉及本地工程时，先读通用规范和项目内 `AGENTS.md`，再按就近优先原则执行；普通聊天不加载规范。

## 场景化指令

[`ai-instructions/bugfix.md`](ai-instructions/bugfix.md) 用于 AI 批量读取问题清单、定位代码并执行修复。它是特定任务的执行模板，不属于每次开发都要加载的通用规范。

[`ai-instructions/imagegen-sub2api.md`](ai-instructions/imagegen-sub2api.md) 用于在 Windows 上配置 Codex 通过用户提供的 Sub2API 中转站调用图片模型，并完成备份、依赖检查和无费用 dry-run 验证。

## 技术方案

[`ai-solutions`](ai-solutions) 用于沉淀项目中可复用的架构设计、性能优化、数据迁移和问题解决方案。

## Codex 主题

[`ai-theme`](ai-theme) 是独立的 Codex 桌面端主题源码，采用运行时注入，不需要安装到 Codex，也不会修改 Codex 安装目录。

- 运行 `ai-theme/apply.bat`：向当前 Codex 窗口实时应用主题，无需重启。
- 运行 `ai-theme/pause.bat`：移除主题并恢复原生界面。
- 修改 `ai-theme/theme`：调整主题配色、背景和装饰图片。

Codex 更新或完全退出后，运行时注入会被清除，需要再次运行 `apply.bat`。该目录是附加工具，普通代码任务不需要读取。

## License

MIT
