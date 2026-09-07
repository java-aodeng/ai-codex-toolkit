# AI Theme

支持初音和暗金两套主题，不需要安装到 Codex，也不会修改 Codex 安装目录。

- 双击 `apply.bat`：向已开放调试端口的 Codex 实时应用主题，无需重启。
- 最新版 Codex 普通启动后不再开放运行时调试端口。请先从托盘完全退出 Codex，再双击 `start-themed.bat`；脚本会动态定位当前安装版本，启动 Codex 并自动应用主题。
- 双击 `pause.bat`：移除当前注入的主题并恢复原生界面。
- 双击 `switch-theme.bat`：输入 `1` 切换初音、`2` 切换暗金，`0` 取消；Codex 需要已经通过主题启动器启动。
- `apply.bat` 重新应用上次选择，`start-themed.bat` 启动后恢复上次选择；首次默认初音。
- 主题资源统一放在 `themes/`：初音在 `themes/miku/`，内部 ID 保留 `miku-488137`；暗金在 `themes/dark-gold/`。
- 每套 `theme.json` 的 `colors` 定义强调色、次强调色、底色与正文色；`mode: "dark"` 启用暗色阅读层，可选的 `logo` 和 `polaroid` 缺省时不显示装饰。
- 选择成功后保存在本地 `.selected-theme.json`，不提交 Git；暂停不会清除选择。命令行也可运行 `npm run switch -- --theme dark-gold` 或 `--theme miku`。
- 暗金背景由原始 3840×2160 PNG 缩放为 2560×1440 WebP，质量 85，约 350 KiB；原始图片保持不变。

Codex 更新或完全退出后，页面中的临时注入会被清除。后续通过 `start-themed.bat` 启动即可恢复主题；脚本不修改 Codex 安装目录。
