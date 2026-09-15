// 初音专属兼容层：只在当前主题匹配时覆盖新版 Codex 的原生表面变量。
export const mikuCompatibilityCss = `
:root[data-codex-window-type="electron"][data-heige-codex-skin="miku-488137"] {
  --color-surface: var(--heige-surface) !important;
  --color-surface-secondary: var(--heige-raised-soft) !important;
  --color-surface-tertiary: var(--heige-raised) !important;
  --color-surface-elevated: var(--heige-raised) !important;
  --app-shell-panel-background: transparent !important;
  --color-text-primary: var(--heige-text) !important;
  --color-text-secondary: color-mix(in srgb, var(--heige-text) 72%, transparent) !important;
  --color-text-tertiary: color-mix(in srgb, var(--heige-text) 58%, transparent) !important;
}
/* 设置和侧边聊天的外层透出壁纸，控件继续使用初音的浅蓝底色。 */
:root[data-heige-codex-skin="miku-488137"] .relative[class*="bg-[var(--app-shell-panel-background"],
:root[data-heige-codex-skin="miku-488137"] [data-app-shell-focus-area="right-panel"] .bg-surface {
  background: transparent !important;
}
:root[data-heige-codex-skin="miku-488137"] [data-app-shell-tab-strip-controller="right"] [data-tab-id][role="button"],
:root[data-heige-codex-skin="miku-488137"] [data-app-shell-tab-strip-controller="right"] [class*="--app-shell-tab-background"] {
  background: color-mix(in srgb, var(--heige-surface) 75%, transparent) !important;
}
/* 保留输入区的文字遮挡，只把白色渐变替换为初音底色。无需滚动裁切脚本。 */
:root[data-heige-codex-skin="miku-488137"] .thread-scroll-container .sticky.bottom-0 > .pointer-events-none.bg-gradient-to-t.from-surface.via-surface {
  background: linear-gradient(to top, var(--heige-surface), color-mix(in srgb, var(--heige-surface) 86%, transparent) 50%, transparent) !important;
}
`;
