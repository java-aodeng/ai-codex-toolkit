// 基础配色交给原生主题；这里只增强壁纸和少量容器，不改输入框、代码块或消息布局。
export function buildInkLandscapeCss({ colors, heroDataUrl }) {
  const scope = ':root[data-heige-codex-skin="ink-landscape"]';
  return `/* HEIGE_CODEX_SKIN:ink-landscape */
${scope} {
  --heige-surface: ${colors.surface};
  --heige-wallpaper: linear-gradient(rgba(32, 44, 37, 0.12), rgba(32, 44, 37, 0.12)), url(${JSON.stringify(heroDataUrl)});
  --app-shell-panel-background: transparent !important;
  --codeblock-background-color: color-mix(in srgb, var(--heige-surface) 88%, black) !important;
}
${scope} #root {
  background: var(--heige-wallpaper) center / cover no-repeat fixed !important;
}
/* 左右容器使用同一层淡色遮罩，避免新版内部背景叠加变深。 */
${scope} [data-app-shell-left-panel-appearance],
${scope} [data-new-tab-scroll-root] {
  background: color-mix(in srgb, var(--heige-surface) 30%, transparent) !important;
  backdrop-filter: none !important;
}
${scope} [data-app-shell-left-panel-appearance] .sidebar-navigation {
  background: transparent !important;
}
${scope} [data-app-shell-main-surface],
${scope} .main-surface,
${scope} .browser-main-surface,
${scope} [data-app-shell-main-content-top-fade] > [aria-hidden="true"],
${scope} [data-app-shell-header-toolbar] > div {
  background: transparent !important;
  box-shadow: none !important;
}
/* 沿用原生输入区高度，用同一张固定壁纸遮住后面的正文，不测量或裁切消息节点。 */
${scope} [data-thread-scroll-footer] > .pointer-events-none,
${scope} [data-app-action-timeline-scroll] .sticky.bottom-0 > .pointer-events-none {
  background: transparent !important;
}
${scope} [data-thread-scroll-footer] [data-codex-composer-root] {
  position: relative;
  isolation: isolate;
}
${scope} [data-thread-scroll-footer] [data-codex-composer-root]::before {
  content: "";
  position: absolute;
  inset: -32px -100vw;
  z-index: -1;
  pointer-events: none;
  background: var(--heige-wallpaper) center / cover no-repeat fixed;
  mask-image: linear-gradient(to bottom, transparent, black 32px);
}
`;
}
