// 发财主题独立配色，不继承其它主题的样式或滚动裁切。
export function buildFacaiCss({ colors, heroDataUrl }) {
  const scope = ':root[data-codex-window-type="electron"][data-heige-codex-skin="facai"]';
  return `/* HEIGE_CODEX_SKIN:facai */
${scope} {
  color-scheme: light !important;
  --heige-accent: ${colors.accent};
  --heige-secondary: ${colors.secondary};
  --heige-surface: ${colors.surface};
  --heige-text: ${colors.text};
  --heige-raised: #f7eedf;
  --app-shell-panel-background: transparent !important;
  --app-color-background-surface: var(--heige-surface) !important;
  --app-color-background-surface-under: var(--heige-surface) !important;
  --app-color-text-foreground: var(--heige-text) !important;
  --app-color-text-foreground-secondary: #705e49 !important;
  --app-color-text-foreground-tertiary: #857058 !important;
  --color-surface: var(--heige-surface) !important;
  --color-surface-secondary: #efe2ca !important;
  --color-surface-tertiary: var(--heige-raised) !important;
  --color-surface-elevated: var(--heige-raised) !important;
  --color-surface-elevated-secondary: var(--heige-raised) !important;
  --color-background-surface: var(--heige-surface) !important;
  --color-background-surface-under: var(--heige-surface) !important;
  --color-background-panel: var(--heige-surface) !important;
  --color-background-application-menu: var(--heige-raised) !important;
  --color-background-primary-soft: #ecddc3 !important;
  --color-background-elevated-primary: var(--heige-raised) !important;
  --color-background-elevated-primary-opaque: var(--heige-raised) !important;
  --color-background-elevated-secondary: #efe2ca !important;
  --color-background-elevated-secondary-opaque: #efe2ca !important;
  --color-background-control: #ecddc3 !important;
  --color-background-control-opaque: #ecddc3 !important;
  --color-background-editor-opaque: #f5ebd9 !important;
  --color-background-button-primary: var(--heige-accent) !important;
  --color-text-primary: var(--heige-text) !important;
  --color-text-foreground: var(--heige-text) !important;
  --color-text-secondary: #705e49 !important;
  --color-text-tertiary: #857058 !important;
  --color-text-inverted: #fff5e4 !important;
  --color-border: rgba(139, 102, 54, 0.25) !important;
}
${scope} #root {
  color: var(--heige-text);
  background: url(${JSON.stringify(heroDataUrl)}) center / cover no-repeat !important;
}
${scope} .app-shell-left-panel {
  background: rgba(242, 232, 214, 0.78) !important;
  border-right: 1px solid var(--color-border) !important;
  backdrop-filter: none !important;
}
${scope} [data-app-shell-header-layout="thread-edge-scroll"] [data-app-shell-header-toolbar] > div,
${scope} main[class*="_MainContentSurface_"],
${scope} .main-surface,
${scope} .browser-main-surface,
${scope} .relative[class*="bg-[var(--app-shell-panel-background"],
${scope} [data-app-shell-focus-area="right-panel"] .bg-surface,
${scope} [data-app-shell-main-content-top-fade] {
  background: transparent !important;
  box-shadow: none !important;
}
${scope} [data-app-action-sidebar-thread-active="true"] {
  background: rgba(173, 66, 45, 0.12) !important;
  box-shadow: inset 2px 0 var(--heige-accent) !important;
}
${scope} [data-app-shell-tab-strip-controller="right"] [data-tab-id][role="button"] {
  background: rgba(247, 238, 223, 0.88) !important;
}
${scope} [data-app-shell-tab-strip-controller="right"] [data-tab-id][role="button"]:has([role="tab"][aria-selected="true"]) {
  box-shadow: inset 0 -2px var(--heige-accent) !important;
}
${scope} [data-app-shell-tab-strip-controller="right"] [class*="--app-shell-tab-background"],
${scope} [data-app-shell-tab-strip-controller="right"] > [aria-hidden="true"]::after {
  background: transparent !important;
}
/* 首页、对话输入框和项目行共用暖米色实底。 */
${scope} [data-codex-composer-root] {
  --color-background-composer-action-bar: transparent !important;
}
${scope} [data-codex-composer-root] [data-composer-surface-variant],
${scope} .composer-surface-chrome,
${scope} [data-codex-composer-root] [data-composer-rail-variant] {
  --composer-layout-surface-background: transparent !important;
  background: #efe2ca !important;
  color: var(--heige-text) !important;
  border-color: var(--color-border) !important;
  box-shadow: inset 0 1px rgba(255, 246, 229, 0.7) !important;
}
/* 保留原生滚动布局与遮挡，避免纯白底部和输入区透字。 */
${scope} .thread-scroll-container .sticky.bottom-0 > .pointer-events-none.bg-gradient-to-t.from-surface.via-surface {
  background: linear-gradient(to top, var(--heige-surface), rgba(242, 232, 214, 0.94) 50%, transparent) !important;
}
${scope} [data-user-message-bubble],
${scope} [data-local-conversation-final-assistant] {
  background: rgba(247, 238, 223, 0.94) !important;
  color: var(--heige-text) !important;
  border-radius: 16px !important;
  border-color: var(--color-border) !important;
  box-shadow: none !important;
}
/* 过程回复也有局部阅读底板，不让壁纸中的墨字与正文重叠。 */
${scope} [data-markdown-text-style="assistant-message"]:not([data-local-conversation-final-assistant] *) {
  background: rgba(247, 238, 223, 0.94) !important;
  color: var(--heige-text) !important;
  border-radius: 12px;
  padding: 8px 12px;
}
${scope} [data-codex-approval-surface] {
  background: var(--heige-raised) !important;
  border-color: var(--color-border) !important;
}
${scope} textarea, ${scope} [contenteditable="true"] {
  color: var(--heige-text) !important;
  caret-color: var(--heige-accent);
}
${scope} textarea::placeholder, ${scope} input::placeholder { color: #857058 !important; }
${scope} a { color: #98402d !important; }
${scope} pre, ${scope} pre code { background-color: #f5ebd9 !important; color: var(--heige-text) !important; }
${scope} :not(pre) > code { background: #e8dcc5 !important; color: #694126 !important; }
${scope} ::selection { background: #ddc294; color: #463529; }
`;
}
