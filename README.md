# ai-codex-toolkit

`ai-codex-toolkit` 集中维护日常使用的 AI 编码规范、Codex 会话模板、场景化执行指令、技术方案和桌面主题，便于跨项目复用和换电脑后恢复配置。

## 快速导航

| 我想做什么 | 从这里开始 |
| --- | --- |
| 创建查资料、翻译、SQL、日志分析等专用会话 | [快速创建会话](ai-instructions/codex-sessions.md) |
| 让 AI 按统一规范开发和排查本地项目 | [编码规范](ai-rules/coding-standards.mdc)，读取时机见下方全局指令示例 |
| 通过 Sub2API 配置并测试生图 | [GPT Image 2.5 Sunburst 生图指令](ai-instructions/imagegen-sub2api.md) |
| 按 Bug 清单逐条排查、修复并回填 | [批量修复指令](ai-instructions/bugfix.md) |
| 设计 Elasticsearch 大数据量索引与迁移方案 | [索引与蓝绿迁移方案](ai-solutions/Elasticsearch大数据量索引与蓝绿迁移通用方案.md) |
| 启动或切换初音、暗金主题 | [主题使用说明](ai-theme/README.md) |

按当前任务选择入口即可；会话模板逐条复制使用，场景指令按需执行，不在每个新会话中加载整个仓库。

## 目录结构

```text
ai-codex-toolkit/
├── ai-rules/             # AI 编码规范目录
│   └── coding-standards.mdc  # 通用编码规范和协作约定
├── ai-instructions/      # 会话模板与场景化执行指令
│   ├── codex-sessions.md     # 常用会话的单条创建指令与路径说明
│   ├── bugfix.md             # AI 批量排查和修复 Bug 的执行指令
│   └── imagegen-sub2api.md   # Sunburst 生图配置、真实测试与日常规则
├── ai-solutions/         # 技术方案目录
│   └── Elasticsearch大数据量索引与蓝绿迁移通用方案.md  # 可复用的 Elasticsearch 迁移方案
└── ai-theme/             # Codex 主题目录
    ├── start-themed.bat      # 启动 Codex 并恢复上次主题
    ├── apply.bat             # 实时重新应用当前主题
    ├── switch-theme.bat      # 选择初音或暗金主题
    ├── pause.bat             # 移除主题并恢复原生界面
    ├── src/                  # 主题加载、启动和运行时注入代码
    └── themes/               # 主题配置及图片资源
        ├── miku/             # 初音主题
        └── dark-gold/        # 暗金主题
```

## 初次使用或换电脑

1. 将仓库克隆或放到工作目录，当前示例统一使用 `D:\work\ai-codex-toolkit`。路径不同时，调整全局指令和会话模板中的仓库路径；业务项目路径单独按实际位置调整。
2. 将下方通用全局指令合并到 Codex 的个人指令中，保留已有的其它偏好，不重复追加同一套规则。
3. 打开 [快速创建会话](ai-instructions/codex-sessions.md)，选择一个模板，复制到新会话的首条消息中。涉及本地文件的会话选择对应项目；服务器日志会话需提供可用的 SSH 连接方式。
4. 按需配置生图或使用主题启动器。在新电脑检查并恢复生图所需的环境变量、密钥与运行环境；仅复制仓库不会自动迁移这些配置。主题启动器需要 PATH 中可用的 Node.js。

换电脑需调整的本地项目、输出目录和远程日志路径，集中列在 [会话模板的路径说明](ai-instructions/codex-sessions.md#换电脑时调整路径)中。

## AI 编码规范

[`ai-rules/coding-standards.mdc`](ai-rules/coding-standards.mdc) 是通用编码规范的统一入口，包含协作约定、项目识别方式和按技术栈生效的专项要求。实际任务还需遵循适用的项目 `AGENTS.md`，按需加载并复用已读取的规则。

通用全局指令负责规则入口、读取时机和改动边界；具体编码要求在规范文件中维护。查资料、翻译等会话按各自模板执行，不自动加载编码规范。

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

## 场景化指令

### 快速创建会话

[`codex-sessions.md`](ai-instructions/codex-sessions.md) 收录六类常用会话：`查资料`、`翻译`、`SQL-编写`、`服务器log分析`、`local-本地混合用`、`image`。每类提供一个可独立复制的代码块，包含会话名称、用途、读取范围和操作边界。

该文件是模板清单，读取它不会批量创建会话。`服务器log分析` 模板在已有 SSH 连接时开始检查最近 24 小时日志；`image` 模板会按生图指令初始化并实际测试一张图片，其余模板先完成命名，再等待具体任务。

### Sub2API 生图

[`imagegen-sub2api.md`](ai-instructions/imagegen-sub2api.md) 使用 `gpt-image-2.5-sunburst`，默认 `max` 质量，支持按中转站能力选择 Images 或 Responses API。执行流程包括本地检查、一次真实生图测试和保存日常规则；图片、结果报告与派生图片统一输出到 `D:\work\output\imagegen` 或其任务子目录。

新会话直接复制会话模板中的 `image` 指令，或使用生图文件末尾的“新会话执行用语”。指令已包含当前中转地址的持续传输授权，包括已知晓的 HTTP 明文传输，同一地址后续不重复确认；正式测试可能消耗中转额度，失败后不自动追加计费重试。

中转地址与密钥从本机环境配置读取，仓库不保存密钥，也不依赖仓库内的专用生图脚本。目标模型是否可用需由当前中转站验证；不支持时报告原因，不自动降级。日常生图复用已配置规则，不反复初始化；仅要求阅读、分析或修改指令文件时不执行生图。

### 批量排查与修复 Bug

[`bugfix.md`](ai-instructions/bugfix.md) 用于从浏览器中的 Bug 清单逐条复现、定位、修复、验证并回填结果，每个实际修复单独创建 Git 提交。执行前按任务调整项目路径、清单筛选条件、处理人和日期，并准备好清单及本地测试页面。

该指令会修改源码并操作外部清单，应在用户要求执行批量修复时使用，不作为默认开发规范加载。

## 技术方案

[`ai-solutions/Elasticsearch大数据量索引与蓝绿迁移通用方案.md`](ai-solutions/Elasticsearch大数据量索引与蓝绿迁移通用方案.md) 用于指导 Elasticsearch 大数据量场景下的索引设计、数据同步、蓝绿切换、校验和回滚。

## Codex 主题

[`ai-theme`](ai-theme) 提供初音和暗金两套 Codex 桌面端主题，共用启动、注入和切换逻辑，不需要安装到 Codex，也不会修改 Codex 安装目录。当前启动脚本适用于 Windows 商店版 Codex，需要 PATH 中可用的 Node.js。

### 启动与切换

1. 从托盘完全退出 Codex，再运行 [`start-themed.bat`](ai-theme/start-themed.bat)，脚本会定位当前安装版本，以调试端口启动并自动加载主题。
2. 运行 [`switch-theme.bat`](ai-theme/switch-theme.bat)，输入 `1` 选择初音、`2` 选择暗金，`0` 取消；同一次运行期间切换立即生效，无需重启。
3. 修改样式后运行 [`apply.bat`](ai-theme/apply.bat) 重新应用当前主题；运行 [`pause.bat`](ai-theme/pause.bat) 临时恢复原生界面。

首次默认初音；切换成功后记住选择，下次通过 `start-themed.bat` 启动时自动恢复。选择保存在本地 `ai-theme/.selected-theme.json`，不提交 Git，暂停主题不会清除选择。

普通方式启动的部分新版 Codex 无法直接注入，需要完全退出后改用 `start-themed.bat` 启动。Codex 更新或完全退出会清除临时注入；后续继续使用主题启动器，新建窗口后可运行 `apply.bat` 重新应用。

### 主题资源

- [`themes/miku`](ai-theme/themes/miku)：保留初音背景、Logo 和贴图，内部主题 ID 为 `miku-488137`。
- [`themes/dark-gold`](ai-theme/themes/dark-gold)：左侧带星空的暗金壁纸与暗色配色，背景使用 2560×1440 WebP，约 427 KiB。
- 各主题的 `theme.json` 维护配色与图片路径；共用样式在 [`src/skin-css.mjs`](ai-theme/src/skin-css.mjs)。

完整说明见 [`ai-theme/README.md`](ai-theme/README.md)。换电脑后需重新选择主题；该目录是附加工具，普通代码任务不需要读取。

## 维护约定

- 通用工程要求放在 `ai-rules`；会话首条消息和任务执行流程放在 `ai-instructions`；技术方案放在 `ai-solutions`；主题代码与资源放在 `ai-theme`。
- 新增或调整入口时同步更新本 README；详细参数与完整流程在各自文件中维护。
- 不将 API Key、登录令牌、单次测试报告或临时生图输出提交到仓库。需要作为主题资源维护的图片放入对应主题目录；日常生图输出按生图指令统一保存。

## License

[MIT](LICENSE)
