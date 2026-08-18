# ai-dev-rules

`ai-dev-rules` 用于集中维护 AI 编程规范、场景化执行指令和 Codex 桌面端主题，避免把规则分散在不同项目或全局配置中。

## 目录结构

```text
ai-dev-rules/
├── rules/
│   └── coding-standards.mdc  # 通用编码规范和协作约定
├── ai-instructions/
│   └── bugfix.md             # AI 批量排查和修复 Bug 的执行指令
└── ai-theme/
    ├── apply.bat             # 实时应用 Codex 主题
    ├── pause.bat             # 移除主题并恢复原生界面
    ├── src/                  # 样式生成和无重启注入代码
    └── theme/                # 主题配置及图片资源
```

## 开发规范

[`rules/coding-standards.mdc`](rules/coding-standards.mdc) 是日常开发任务唯一需要 AI 主动读取的规范文件，包含通用编码规范、协作约定、多项目识别方式和按技术栈生效的专项规则。

### 使用方式

把 `ai-dev-rules` 放到你的工作目录里，和业务项目同级即可。

在 Codex 全局指令中只配置规则入口和读取时机，具体编码要求统一在 `coding-standards.mdc` 中维护。

### Codex 全局指令示例

```text
- 默认由当前会话直接排查与处理，不使用子代理、任务委派或把本地代码分析工作拆给其它代理。
- 搜索统一优先使用 `rg`，默认优先使用 `rg -n` 做精准定位。
- 禁止使用 `Get-Content`、`Get-Content -LiteralPath` 及其它整文件读取命令做常规代码排查；只有确实需要查看连续上下文时，才基于 `rg` 命中结果读取必要的局部片段。
- 只检查与当前需求直接相关的文件、目录和引用链路；非用户明确要求时，不做项目级全量读取或大范围遍历。

默认使用中文沟通，回答先给结论，再给关键原因。

不要在每个新会话自动读取规则文件。

凡涉及本地项目、文件、代码、命令、排查、修改、review 的请求，默认读取：
D:\work\ai-dev-rules\rules\coding-standards.mdc

写 skyte-ui-new 前端项目时，读取该项目规范：
D:\work\cloud-skyte\skyte-ui-new\AGENTS.md

如果用户当前消息给出了项目路径，优先以该路径作为当前项目。
如果只是普通聊天、解释概念、临时问答，不要主动读取规则文件。
```

### 配置原则

- 全局指令只负责约束“什么时候读取规则文件”。
- 具体编码规范统一放在 `coding-standards.mdc` 里维护。
- 涉及本地工程时，先读规则，再按规则执行；普通聊天不加载规则。

## 场景化指令

[`ai-instructions/bugfix.md`](ai-instructions/bugfix.md) 用于 AI 批量读取问题清单、定位代码并执行修复。它是特定任务的执行模板，不属于每次开发都要加载的通用规范。

## Codex 主题

[`ai-theme`](ai-theme) 是独立的 Codex 桌面端主题源码，采用运行时注入，不需要安装到 Codex，也不会修改 Codex 安装目录。

- 运行 `ai-theme/apply.bat`：向当前 Codex 窗口实时应用主题，无需重启。
- 运行 `ai-theme/pause.bat`：移除主题并恢复原生界面。
- 修改 `ai-theme/theme`：调整主题配色、背景和装饰图片。

Codex 更新或完全退出后，运行时注入会被清除，需要再次运行 `apply.bat`。该目录是附加工具，普通代码任务不需要读取。

## License

MIT
