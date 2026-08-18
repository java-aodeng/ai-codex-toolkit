import { readFile } from "node:fs/promises";
import { extname } from "node:path";

import { CdpSession, fetchRendererTargets, waitForRendererTargets } from "./cdp-client.mjs";
import { LEGACY_MENU_ID, STYLE_ID } from "./constants.mjs";
import { evaluateCodexWindowsViaMainInspector } from "./electron-main-bridge.mjs";
import { buildSkinCss } from "./skin-css.mjs";

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};
const OVERLAY_MARKER = "avatar-overlay";

function isMainTarget(target) {
  return typeof target.url === "string" && !target.url.includes(OVERLAY_MARKER);
}

async function waitForMainTargets(port, { timeoutMs = 20_000 } = {}) {
  const targets = await waitForRendererTargets(port, { timeoutMs });
  const mainTargets = targets.filter(isMainTarget);
  if (mainTargets.length === 0) {
    throw new Error("没有发现 Codex 主窗口 renderer");
  }
  return mainTargets;
}

async function evaluateTargets(targets, expression) {
  const ok = [];
  const failed = [];
  for (const target of targets) {
    const session = new CdpSession(target.webSocketDebuggerUrl);
    try {
      await session.open();
      ok.push({ id: target.id, value: await session.evaluate(expression) });
    } catch (error) {
      failed.push({ id: target.id, error: error instanceof Error ? error.message : String(error) });
    } finally {
      session.close();
    }
  }
  return { ok, failed };
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

// Windows 商店版默认没有 renderer 调试端口，需要经 Electron 主进程桥接到现有窗口。
async function evaluateWithFallback({ port, expression, includeOverlay, operation }) {
  let primaryError;
  try {
    const targets = includeOverlay
      ? await fetchRendererTargets(port, { timeoutMs: 1_000 })
      : await waitForMainTargets(port, { timeoutMs: 1_000 });
    const result = await evaluateTargets(targets, expression);
    if (result.ok.length === 0) {
      throw new Error(
        targets.length > 0
          ? `全部 ${targets.length} 个窗口处理失败：${result.failed.map(({ error }) => error).join("；")}`
          : "没有发现 Codex 窗口",
      );
    }
    return { ...result, transport: "renderer-cdp" };
  } catch (error) {
    primaryError = error;
  }

  if (process.platform !== "win32") throw primaryError;
  try {
    return {
      ...(await evaluateCodexWindowsViaMainInspector(expression, { includeOverlay })),
      transport: "electron-main-inspector",
    };
  } catch (fallbackError) {
    throw new Error(
      `${operation}失败：渲染调试端口不可用（${errorMessage(primaryError)}）；` +
        `主进程实时注入也失败（${errorMessage(fallbackError)}）`,
      { cause: new AggregateError([primaryError, fallbackError]) },
    );
  }
}

async function assetDataUrl(path, field) {
  if (!path) return null;
  const mime = MIME[extname(path).toLowerCase()];
  if (!mime) throw new Error(`不支持的 ${field} 图片类型`);
  const bytes = await readFile(path);
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

function buildApplyExpression(css, themeId) {
  return `(() => {
    document.getElementById(${JSON.stringify(LEGACY_MENU_ID)})?.remove();
    try { delete window.__heigeCodexSkin; } catch { window.__heigeCodexSkin = undefined; }
    let style = document.getElementById(${JSON.stringify(STYLE_ID)});
    if (!style) {
      style = document.createElement("style");
      style.id = ${JSON.stringify(STYLE_ID)};
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = ${JSON.stringify(css)};
    document.documentElement.dataset.heigeCodexSkin = ${JSON.stringify(themeId)};
    return true;
  })()`;
}

export async function applyTheme({ manifest, heroPath, logoPath, polaroidPath, port }) {
  const css = buildSkinCss({
    theme: manifest,
    heroDataUrl: await assetDataUrl(heroPath, "hero"),
    logoDataUrl: await assetDataUrl(logoPath, "logo"),
    polaroidDataUrl: await assetDataUrl(polaroidPath, "polaroid"),
  });
  const result = await evaluateWithFallback({
    port,
    expression: buildApplyExpression(css, manifest.id),
    includeOverlay: false,
    operation: "主题应用",
  });
  return {
    applied: result.ok.length,
    failed: result.failed.map(({ id }) => id),
    transport: result.transport,
  };
}

export async function removeTheme({ port }) {
  const expression = `(() => {
    document.getElementById(${JSON.stringify(STYLE_ID)})?.remove();
    document.getElementById(${JSON.stringify(LEGACY_MENU_ID)})?.remove();
    delete document.documentElement.dataset.heigeCodexSkin;
    try { delete window.__heigeCodexSkin; } catch { window.__heigeCodexSkin = undefined; }
    return true;
  })()`;
  const result = await evaluateWithFallback({
    port,
    expression,
    includeOverlay: true,
    operation: "主题暂停",
  });
  return {
    removed: result.ok.length,
    failed: result.failed.map(({ id }) => id),
    transport: result.transport,
  };
}
