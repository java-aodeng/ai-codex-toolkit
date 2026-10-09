// 悬浮通知独立于主窗口配色，在其它软件上方也保持轻量、可读。
export const overlayCss = `
:root[data-heige-codex-overlay="light"] [data-avatar-overlay-hit-region="activity-pill"],
:root[data-heige-codex-overlay="light"] [data-avatar-overlay-hit-region="mascot-badge"] {
  --color-text: #29372f !important;
  --color-text-secondary: rgba(41, 55, 47, 0.78) !important;
  --color-background-activity-control: rgba(255, 255, 255, 0.45) !important;
  --color-background-activity-control-hover: rgba(226, 235, 228, 0.94) !important;
  --color-background-activity-stop-hover: rgba(249, 225, 221, 0.94) !important;
  --color-text-activity-control: #47574c !important;
  --color-text-activity-control-active: #26372c !important;
  color: var(--color-text) !important;
  background: rgba(255, 255, 255, 0.72) !important;
  border-color: rgba(255, 255, 255, 0.88) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.10) !important;
}
`;
