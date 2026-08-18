import { HEX_COLOR } from "./constants.mjs";

const DEFAULT_COLORS = {
  accent: "#24c9d7",
  secondary: "#ef8fd3",
  surface: "#f7fbff",
  text: "#17344f",
};

function color(value, fallback) {
  const result = value ?? fallback;
  if (!HEX_COLOR.test(result)) throw new Error(`无效主题颜色：${result}`);
  return result;
}

function copy(value, fallback = "") {
  return JSON.stringify(typeof value === "string" ? value : fallback);
}

const DATA_URL = /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i;

export function buildSkinCss({ theme, heroDataUrl, logoDataUrl = null, polaroidDataUrl = null }) {
  if (!DATA_URL.test(heroDataUrl)) {
    throw new Error("hero 必须是本地 PNG、JPEG 或 WebP 数据");
  }
  if (logoDataUrl !== null && !DATA_URL.test(logoDataUrl)) {
    throw new Error("logo 必须是本地 PNG、JPEG 或 WebP 数据");
  }
  if (polaroidDataUrl !== null && !DATA_URL.test(polaroidDataUrl)) {
    throw new Error("polaroid 必须是本地 PNG、JPEG 或 WebP 数据");
  }
  const colors = {
    accent: color(theme.colors?.accent, DEFAULT_COLORS.accent),
    secondary: color(theme.colors?.secondary, DEFAULT_COLORS.secondary),
    surface: color(theme.colors?.surface, DEFAULT_COLORS.surface),
    text: color(theme.colors?.text, DEFAULT_COLORS.text),
  };
  const id = String(theme.id ?? "custom").replace(/[^a-z0-9_-]/gi, "");

  return `/* HEIGE_CODEX_SKIN:${id} */
:root[data-codex-window-type="electron"] {
  color-scheme: light !important;
  --heige-accent: ${colors.accent};
  --heige-secondary: ${colors.secondary};
  --heige-surface: ${colors.surface};
  --heige-text: ${colors.text};
  --heige-raised: color-mix(in srgb, var(--heige-surface) 88%, white);
  --heige-raised-soft: color-mix(in srgb, var(--heige-surface) 94%, white);
  --color-background-surface: color-mix(in srgb, var(--heige-surface) 90%, transparent) !important;
  --color-background-panel: var(--heige-raised-soft) !important;
  --color-background-application-menu: var(--heige-raised) !important;
  --color-background-primary-soft: var(--heige-raised) !important;
  --color-background-elevated-primary: var(--heige-raised) !important;
  --color-background-elevated-primary-opaque: var(--heige-raised) !important;
  --color-background-elevated-secondary: var(--heige-raised-soft) !important;
  --color-background-elevated-secondary-opaque: var(--heige-raised-soft) !important;
  --color-background-editor-opaque: var(--heige-raised) !important;
  --color-background-control: var(--heige-raised) !important;
  --color-background-control-opaque: var(--heige-raised) !important;
  --color-background-surface-under: var(--heige-surface) !important;
  --color-background-button-primary: var(--heige-accent) !important;
  --color-text-foreground: var(--heige-text) !important;
  --color-border: color-mix(in srgb, var(--heige-accent) 45%, transparent) !important;
}

#root {
  color: var(--heige-text) !important;
  background:
${polaroidDataUrl === null ? "" : `    url(${JSON.stringify(polaroidDataUrl)}) right 20px bottom 24px / 200px 300px no-repeat fixed,
`}
    linear-gradient(90deg, color-mix(in srgb, var(--heige-surface) 96%, transparent) 0 22%, transparent 46%),
    linear-gradient(180deg, transparent 0 45%, color-mix(in srgb, var(--heige-surface) 78%, transparent) 78% 100%),
${id === "miku-488137" ? `    linear-gradient(180deg, color-mix(in srgb, var(--heige-text) 6%, transparent), color-mix(in srgb, var(--heige-text) 9%, transparent)),
` : ""}
    url(${JSON.stringify(heroDataUrl)}) right center / cover no-repeat fixed !important;
  background-attachment: scroll !important;
}

#root::before {
  position: fixed;
  z-index: 20;
  top: 76px;
  left: max(380px, 24vw);
  content: ${copy(theme.copy?.brand)};
  color: var(--heige-accent);
  font: 800 clamp(16px, 2vw, 30px)/1.2 ui-rounded, system-ui;
  text-shadow: 0 2px 10px white;
  pointer-events: none;
}

#root::after {
  position: fixed;
  z-index: 20;
  top: 120px;
  left: max(380px, 24vw);
  max-width: 42vw;
  content: ${copy(theme.copy?.headline)};
  color: var(--heige-text);
  font: 750 clamp(18px, 2.7vw, 42px)/1.15 ui-rounded, system-ui;
  text-shadow: 0 2px 12px white;
  pointer-events: none;
}

.app-shell-left-panel {
  background: color-mix(in srgb, var(--heige-surface) 96%, var(--heige-text)) !important;
  border-right: 1px solid color-mix(in srgb, var(--heige-accent) 45%, transparent) !important;
  backdrop-filter: none !important;
}

/* 新版 Codex 主内容区使用带哈希的 CSS Modules 类名。 */
main[class*="_MainContentSurface_"],
.main-surface,
.browser-main-surface {
  background:
    radial-gradient(ellipse 88% 108% at 50% 48%,
      color-mix(in srgb, var(--heige-surface) 44%, transparent) 0%,
      color-mix(in srgb, var(--heige-surface) 32%, transparent) 62%,
      transparent 100%) !important;
  box-shadow:
    inset 24px 0 34px -34px color-mix(in srgb, var(--heige-text) 14%, transparent),
    inset -24px 0 34px -34px color-mix(in srgb, var(--heige-text) 14%, transparent) !important;
}

[data-codex-composer-root] [data-composer-surface-variant="default"],
.composer-surface-chrome,
[data-user-message-bubble],
[data-local-conversation-final-assistant],
[data-codex-approval-surface] {
  color: var(--heige-text) !important;
  border-color: color-mix(in srgb, var(--heige-accent) 28%, var(--heige-surface)) !important;
  border-radius: 18px !important;
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--heige-surface) 94%, white),
      color-mix(in srgb, var(--heige-surface) 92%, var(--heige-accent))) !important;
  box-shadow:
    0 4px 14px color-mix(in srgb, var(--heige-text) 7%, transparent),
    inset 0 1px 0 color-mix(in srgb, white 48%, transparent) !important;
}

[data-codex-composer-root] [data-composer-surface-variant="default"] {
  background: var(--heige-raised) !important;
}

[data-app-action-sidebar-thread-active="true"] {
  background: linear-gradient(90deg, color-mix(in srgb, var(--heige-accent) 22%, transparent), color-mix(in srgb, var(--heige-secondary) 16%, transparent)) !important;
}
${logoDataUrl === null ? "" : `
/* 侧栏工作区标题换品牌 Logo，按钮仍可点开模式切换 */
.app-shell-left-panel button[aria-haspopup="menu"][aria-label*="ChatGPT"] {
  background: url(${JSON.stringify(logoDataUrl)}) left center / contain no-repeat !important;
  width: 214px;
  height: 78px !important;
  margin: 4px 0 0;
}
.app-shell-left-panel button[aria-haspopup="menu"][aria-label*="ChatGPT"] > span,
.app-shell-left-panel button[aria-haspopup="menu"][aria-label*="ChatGPT"] > svg {
  visibility: hidden;
}
`}`;
}
