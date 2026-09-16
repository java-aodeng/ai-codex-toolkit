// 水墨主题独立生成样式，不继承暗金的配色或滚动裁切。
export function buildInkLandscapeCss({ colors, heroDataUrl }) {
  const scope = ':root[data-codex-window-type="electron"][data-heige-codex-skin="ink-landscape"]';
  return `/* HEIGE_CODEX_SKIN:ink-landscape */
${scope} {
  color-scheme: dark !important;
  --heige-accent: ${colors.accent};
  --heige-secondary: ${colors.secondary};
  --heige-surface: ${colors.surface};
  --heige-text: ${colors.text};
  --heige-raised: #344139;
  --app-shell-panel-background: transparent !important;
  --app-color-background-surface: var(--heige-surface) !important;
  --app-color-background-surface-under: var(--heige-surface) !important;
  --app-color-text-foreground: var(--heige-text) !important;
  --app-color-text-foreground-secondary: #b5c1b6 !important;
  --app-color-text-foreground-tertiary: #9eada1 !important;
  --color-surface: var(--heige-surface) !important;
  --color-surface-secondary: #303c35 !important;
  --color-surface-tertiary: var(--heige-raised) !important;
  --color-surface-elevated: var(--heige-raised) !important;
  --color-surface-elevated-secondary: var(--heige-raised) !important;
  --color-background-surface: var(--heige-surface) !important;
  --color-background-surface-under: var(--heige-surface) !important;
  --color-background-panel: var(--heige-surface) !important;
  --color-background-application-menu: var(--heige-surface) !important;
  --color-background-primary-soft: var(--heige-raised) !important;
  --color-background-elevated-primary: var(--heige-raised) !important;
  --color-background-elevated-primary-opaque: var(--heige-raised) !important;
  --color-background-elevated-secondary: #303c35 !important;
  --color-background-elevated-secondary-opaque: #303c35 !important;
  --color-background-control: var(--heige-raised) !important;
  --color-background-control-opaque: var(--heige-raised) !important;
  --color-background-editor-opaque: #26312b !important;
  --color-background-button-primary: var(--heige-accent) !important;
  --color-text-primary: var(--heige-text) !important;
  --color-text-foreground: var(--heige-text) !important;
  --color-text-secondary: #b5c1b6 !important;
  --color-text-tertiary: #9eada1 !important;
  --color-text-inverted: #253027 !important;
  --color-border: rgba(160, 180, 154, 0.24) !important;
}
${scope} #root {
  color: var(--heige-text);
  background: linear-gradient(rgba(32, 44, 37, 0.12), rgba(32, 44, 37, 0.12)),
    url(${JSON.stringify(heroDataUrl)}) center / cover no-repeat !important;
}
${scope} .app-shell-left-panel {
  background: rgba(37, 49, 42, 0.60) !important;
  border-right: 1px solid var(--color-border) !important;
  backdrop-filter: none !important;
}
${scope} main[class*="_MainContentSurface_"],
${scope} .main-surface,
${scope} .browser-main-surface,
${scope} .relative[class*="bg-[var(--app-shell-panel-background"],
${scope} [data-app-shell-focus-area="right-panel"] .bg-surface,
${scope} [data-app-shell-main-content-top-fade] {
  background: transparent !important;
  box-shadow: none !important;
}
${scope} [data-app-action-sidebar-thread-active="true"],
${scope} [data-app-shell-tab-strip-controller="right"] [data-tab-id][role="button"] {
  background: rgba(150, 174, 140, 0.16) !important;
  box-shadow: inset 2px 0 rgba(168, 184, 154, 0.6) !important;
}
${scope} [data-app-shell-tab-strip-controller="right"] [class*="--app-shell-tab-background"],
${scope} [data-app-shell-tab-strip-controller="right"] > [aria-hidden="true"]::after {
  background: transparent !important;
}
/* 输入区保留实底与原生遮挡，正文滚动到后面时不会透字。 */
${scope} [data-codex-composer-root] {
  --composer-layout-surface-background: transparent !important;
  --color-background-composer-action-bar: transparent !important;
}
${scope} [data-codex-composer-root] [data-composer-surface-variant],
${scope} .composer-surface-chrome,
${scope} [data-codex-composer-root] [data-composer-rail-variant] {
  background: #303c35 !important;
  color: var(--heige-text) !important;
  border-color: var(--color-border) !important;
  box-shadow: inset 0 1px rgba(189, 205, 179, 0.10) !important;
}
${scope} .thread-scroll-container .sticky.bottom-0 > .pointer-events-none.bg-gradient-to-t.from-surface.via-surface {
  background: linear-gradient(to top, var(--heige-surface), rgba(40, 52, 47, 0.88) 50%, transparent) !important;
}
${scope} [data-user-message-bubble],
${scope} [data-local-conversation-final-assistant] {
  background: rgba(37, 49, 42, 0.80) !important;
  color: var(--heige-text) !important;
  border-radius: 16px !important;
  box-shadow: none !important;
}
${scope} [data-codex-approval-surface] {
  background: var(--heige-raised) !important;
  border-color: var(--color-border) !important;
}
${scope} textarea, ${scope} [contenteditable="true"] {
  color: var(--heige-text) !important;
  caret-color: var(--heige-accent);
}
${scope} textarea::placeholder, ${scope} input::placeholder { color: #a2b0a4 !important; }
${scope} a { color: #b1c4a4 !important; }
${scope} pre, ${scope} pre code { background-color: #26312b !important; color: var(--heige-text) !important; }
${scope} :not(pre) > code { background: #354239 !important; color: #d3decd !important; }
${scope} ::selection { background: #52654f; color: #e1e9da; }
`;
}
