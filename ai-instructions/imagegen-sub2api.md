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

未经用户再次明确确认，不得执行会产生费用的正式生图请求。
