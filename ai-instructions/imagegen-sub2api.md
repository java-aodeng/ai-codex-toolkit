# Codex 通过 Sub2API 配置生图

请在当前 Windows 电脑上将 Codex 配置为通过用户提供的 Sub2API 中转站生成图片，并直接完成配置和验证，不要只提供教程。

## 一、执行输入

- 中转站根地址使用用户本次提供的 `<SUB2API_ROOT>`，本指令文件中不保存固定地址。
- 如果用户尚未提供根地址，先向用户索取，再执行任何配置修改。
- 如果根地址使用公网 HTTP，先明确提示 API Key 可能以未加密方式传输，并获得用户确认后再继续。

## 二、Codex 主模型配置

修改 `%USERPROFILE%\.codex\config.toml` 中与主模型直接相关的必要字段：

- `model_provider = "OpenAI"`
- `model = "gpt-5.6-sol"`
- `wire_api = "responses"`
- `requires_openai_auth = true`
- 主模型 `base_url` 使用 `<SUB2API_ROOT>`，末尾不要添加 `/v1`。

修改前必须为 `config.toml` 创建带时间戳的备份。只修改必要字段，不覆盖或重写其它已有配置，并在完成后报告备份文件的绝对路径。

## 三、生图配置

- 图片模型使用 `gpt-image-2`。
- 设置 Windows 用户级环境变量 `OPENAI_BASE_URL=<SUB2API_ROOT>/v1`。
- 优先从 `%USERPROFILE%\.codex\auth.json` 读取已有的 `OPENAI_API_KEY`。
- 如果 `auth.json` 中没有可用密钥，再要求用户输入。
- 任何输出、日志、命令回显和最终报告都不得显示完整 API Key；必要时仅显示是否已读取或经过脱敏的末尾少量字符。
- 图片统一保存到 `D:\work\output\imagegen`；目录不存在时创建，已有同名文件时生成新文件名，不得覆盖。

## 四、技能、脚本与依赖

- 检查 Codex 实际使用的 `imagegen` 技能和 `image_gen.py` 脚本位置，不假定安装目录固定。
- 找到该脚本实际使用的 Python 解释器和环境，不假定 Python 路径固定。
- 检查并安装缺少的 `openai` 和 `pillow` 依赖，避免安装到无关 Python 环境。
- 确保 Codex 和生图脚本允许访问用户提供的中转站。
- 需要写入用户目录、安装依赖或调整联网权限时，直接申请必要授权并继续完成。

## 五、Dry-run 验证

使用 `image_gen.py` 执行一次 `--dry-run`，确认：

- `OPENAI_API_KEY` 已成功读取，但不得输出完整密钥。
- 最终请求地址为 `<SUB2API_ROOT>/v1/images/generations`。
- 图片模型为 `gpt-image-2`。
- dry-run 不发送正式生图请求，不产生图片生成费用。

如果脚本原生不支持 `--dry-run`，先检查其帮助信息和实现，再使用不会发起正式请求的等价方式验证配置；禁止为了验证而产生费用。

## 六、完成报告

dry-run 成功后，向用户报告：

- Codex 主模型配置结果。
- 生图模型、环境变量和最终接口路径。
- API Key 是否成功读取，只报告状态，不显示完整密钥。
- `config.toml` 备份位置。
- 使用的 `imagegen`、`image_gen.py` 和 Python 环境。
- 安装或确认的依赖。
- 是否需要重启 Codex 或重新登录 Windows 会话才能读取用户级环境变量。

配置和 dry-run 阶段不得执行会产生费用的正式生图请求。配置完成后的生图授权按下方全局规则执行。

## 七、推荐的 Codex 全局规则

首次配置和 dry-run 验证成功后，将以下内容加入 Codex 全局指令。全局规则中不写固定中转地址，实际地址统一由 Windows 用户环境变量 `OPENAI_BASE_URL` 提供。

```text
## 图片生成规则

当我明确要求生成或编辑图片时，视为我已明确选择并确认使用 `$imagegen` 的 CLI/API 备用模式：

- 不尝试内置 `image_gen`，直接使用 `image_gen.py`。
- 图片模型固定使用 `gpt-image-2`，并读取 Windows 用户环境变量 `OPENAI_BASE_URL` 和 `OPENAI_API_KEY`。
- 每次明确的图片请求，仅授权生成指定数量的图片及对应的一次可能产生费用的 API 请求，无需再次确认。
- 不自动增加图片数量或生成额外变体；失败后如需再次发起可能计费的请求，必须先征得确认。
- 如果环境变量、脚本或依赖不可用，先报告问题，不得自动切换到内置 `image_gen` 或其它图片模型。
- 任何回复、命令输出和日志中都不得显示完整 API Key。
- 图片保存到 `D:\work\output\imagegen`，不得覆盖已有文件。
- 生成完成后直接展示图片，并提供绝对文件路径。
```

这段全局规则只负责日常生图的模式选择、计费边界和输出约束。仅在首次配置、更换中转站或排查生图环境时读取本指令文件，不要在每次图片请求中重复执行配置流程。
