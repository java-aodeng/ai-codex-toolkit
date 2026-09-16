# ai-codex-toolkit

`ai-codex-toolkit` 集中维护 AI 编码规范、Codex 会话模板、场景指令、技术方案和桌面主题。

## 目录结构

```text
ai-codex-toolkit/
├── ai-rules/                 # 编码规范
│   └── coding-standards.mdc
├── ai-instructions/          # 会话模板与场景指令
│   ├── codex-sessions.md     # 会话模板
│   ├── imagegen-sub2api.md   # 生图指令
│   └── bugfix.md             # 批量修复 Bug
├── ai-solutions/             # 技术方案
│   └── Elasticsearch大数据量索引与蓝绿迁移通用方案.md
└── ai-theme/                 # Codex 主题
    ├── start-themed.bat      # 启动与切换入口
    ├── src/                 # 主题脚本
    └── themes/
        ├── miku/            # 初音
        ├── dark-gold/       # 暗金
        └── ink-landscape/   # 水墨·护眼
```

## 使用

| 功能 | 怎么用 |
| --- | --- |
| [编码规范](ai-rules/coding-standards.mdc) | 将下方全局指令复制到 Codex 个人指令中。 |
| [会话模板](ai-instructions/codex-sessions.md) | 选择一个模板，复制到新会话的首条消息。 |
| [Sub2API 生图](ai-instructions/imagegen-sub2api.md) | 按文档配置后，在会话中描述要生成的图片。 |
| [批量修复 Bug](ai-instructions/bugfix.md) | 填入项目路径和 Bug 清单，复制指令执行。 |
| [Elasticsearch 技术方案](ai-solutions/Elasticsearch大数据量索引与蓝绿迁移通用方案.md) | 按需查阅索引设计与蓝绿迁移方案。 |
| [Codex 主题](ai-theme/README.md) | 双击 [start-themed.bat](ai-theme/start-themed.bat)，选择初音、暗金、水墨·护眼或默认外观。 |

## Codex 全局指令

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

## License

[MIT](LICENSE)
