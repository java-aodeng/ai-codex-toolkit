// 悬浮通知独立于主窗口配色，在其它软件上方也保持轻量、可读。
// 活动材质标记覆盖展开与折叠，点击区域标记仅在展开时存在。
export const overlayCss = `
:root[data-heige-codex-overlay="light"] [data-avatar-overlay-material-variant="activity"],
:root[data-heige-codex-overlay="light"] [data-avatar-overlay-hit-region="mascot-badge"],
:root[data-heige-codex-overlay="light"] [data-avatar-overlay-hit-region="activity-dismiss"] {
  --color-text: #1f2e23 !important;
  --color-text-secondary: #304035 !important;
  --color-background-activity-control: rgba(255, 255, 255, 0.45) !important;
  --color-background-activity-control-hover: rgba(226, 235, 228, 0.94) !important;
  --color-background-activity-stop-hover: rgba(249, 225, 221, 0.94) !important;
  --color-text-activity-control: #47574c !important;
  --color-text-activity-control-active: #26372c !important;
  color: var(--color-text) !important;
  background: rgba(255, 255, 255, 0.45) !important;
  border-color: rgba(255, 255, 255, 0.50) !important;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.06) !important;
}
/* 折叠时保留原生堆叠提示，统一浅底避免半透明卡片重叠后出现色差。 */
:root[data-heige-codex-overlay="light"]:has([data-avatar-overlay-stacked-behind-primary="true"]) [data-avatar-overlay-material-variant="activity"] {
  background: #f4f8f5 !important;
}
:root[data-heige-codex-overlay="light"] [data-avatar-overlay-stacked-behind-primary="true"] {
  box-shadow: none !important;
}
`;
