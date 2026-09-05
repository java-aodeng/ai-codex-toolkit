# AI Theme

这是从 HeiGe Codex Skin Studio 拆出的单主题版本，不需要安装到 Codex，也不会修改 Codex 安装目录。

- 双击 `apply.bat`：向已开放调试端口的 Codex 实时应用主题，无需重启。
- 最新版 Codex 普通启动后不再开放运行时调试端口。请先从托盘完全退出 Codex，再双击 `start-themed.bat`；脚本会动态定位当前安装版本，启动 Codex 并自动应用主题。
- 双击 `pause.bat`：移除当前注入的主题并恢复原生界面。
- 修改 `theme/theme.json` 和同目录图片即可维护主题。

Codex 更新或完全退出后，页面中的临时注入会被清除。后续通过 `start-themed.bat` 启动即可恢复主题；脚本不修改 Codex 安装目录。
