# Chrome DevTools MCP

## 安装配置

请在当前电脑安装并配置 Chrome DevTools MCP，供 Codex 操作 Chrome，直接完成以下安装和验证。

1. 检查操作系统、Node.js、npm、Chrome 和现有 Codex MCP 配置。
2. 按 Chrome DevTools MCP 与 Codex 的官方文档安装，核对当前 npm 稳定版本和 Node.js 要求，固定安装并验证通过的版本。
3. 我授权下载和安装这个 MCP 所需的官方 npm 依赖。若缺少 Node.js 或 Chrome，先说明缺少项及安装方案。
4. 添加到实际使用的用户级 Codex 配置，让不同项目都能使用。优先定位 `CODEX_HOME`，否则使用当前用户的 `.codex/config.toml`；修改前备份。已有同名配置时检查并复用，不重复添加。
5. 只做必要改动，保留配置编码、注释及其它设置。不修改模型、Sub2API 地址、API Key、认证方式或其它 MCP，不输出密钥，也不要求填写 Sub2API 密钥。
6. 关闭 MCP 使用统计和性能分析中的 CrUX 外部查询，设置合理的启动超时；具体参数以安装版本的官方文档为准。
7. 默认由 MCP 启动独立 Chrome，使用独立且可持久保存登录状态的配置目录；不自动接管日常 Chrome，不开放公网调试端口。
8. 验证 Codex 可识别配置，以及 MCP 初始化和工具列表。工具加载后，用空白页验证浏览器连接；分别说明已通过和待完成的验证，不仅凭配置已保存宣称安装成功。
9. 告知安装版本、配置及备份路径、是否需要重启 Codex，以及后续使用方法。不要直接关闭正在运行的任务。

我授权读取、备份和修改完成上述任务所必需的用户级 Codex 配置。直接完成已授权范围内的操作，不要只给教程。

## 使用

若安装结果提示需要，重启 Codex。后续明确说“使用 Chrome DevTools MCP”，再描述任务：

```text
使用 Chrome DevTools MCP 打开 https://example.com，检查页面是否正常。
```

```text
使用 Chrome DevTools MCP 打开 http://localhost:3000，检查控制台报错和失败的网络请求，先分析原因，不修改代码。
```

```text
使用 Chrome DevTools MCP 打开【管理后台地址】。我会手动登录，登录完成后你再检查页面。
```

独立 Chrome 不继承日常 Chrome 的登录状态，首次使用需手动登录。
