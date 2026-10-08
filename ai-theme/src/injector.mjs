import { readFile } from "node:fs/promises";
import { extname } from "node:path";

import { CdpSession, fetchRendererTargets, waitForRendererTargets } from "./cdp-client.mjs";
import { LEGACY_MENU_ID, STYLE_ID } from "./constants.mjs";
import { evaluateCodexWindowsViaMainInspector } from "./electron-main-bridge.mjs";
import { buildSkinCss } from "./skin-css.mjs";
import { startSkinLayout } from "./skin-layout.mjs";

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
      ok.push({ id: target.id, value: await session.evaluate(expression, { timeoutMs: 20_000 }) });
    } catch (error) {
      failed.push({
        id: target.id,
        error: error instanceof Error ? error.message : String(error),
        evaluationFailed: error?.name === "CdpEvaluationError",
      });
    } finally {
      session.close();
    }
  }
  return { ok, failed };
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

// 调试连接不可用时尝试旧版 Electron 桥接；页面脚本异常保留真实原因。
async function evaluateWithFallback({ port, expression, includeOverlay, operation }) {
  let primaryError;
  let result;
  try {
    const targets = includeOverlay
      ? await fetchRendererTargets(port, { timeoutMs: 1_000 })
      : await waitForMainTargets(port, { timeoutMs: 1_000 });
    result = await evaluateTargets(targets, expression);
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

  if (result?.failed.some(({ evaluationFailed }) => evaluationFailed)) {
    throw new Error(`${operation}失败：${errorMessage(primaryError)}`, { cause: primaryError });
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
        `主进程实时注入也失败（${errorMessage(fallbackError)}）。` +
        "新版 Codex 正常启动后可能无法补开调试接口。请保存当前工作，从托盘完全退出，" +
        "再直接运行 start-themed.bat 选择主题，不要先从普通快捷方式启动 Codex。",
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

// 此函数会序列化到页面执行；新版本可能先开放调试目标，再创建文档节点。
async function waitForThemeDocument(timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (!document.documentElement || !document.head || !document.body || document.readyState === "loading") {
    if (Date.now() >= deadline) {
      throw new Error("等待 Codex 页面文档就绪超时，请待窗口加载完成后重新应用主题");
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

function buildApplyExpression(css, themeId, themeMode) {
  return `(async () => {
    await (${waitForThemeDocument.toString()})();
    document.getElementById(${JSON.stringify(LEGACY_MENU_ID)})?.remove();
    window.__heigeCodexSkin?.cleanup?.();
    try { delete window.__heigeCodexSkin; } catch { window.__heigeCodexSkin = undefined; }
    let style = document.getElementById(${JSON.stringify(STYLE_ID)});
    if (!style) {
      style = document.createElement("style");
      style.id = ${JSON.stringify(STYLE_ID)};
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = ${JSON.stringify(css)};
    // 同步原生配色，避免暗色壁纸混用浅色文字和面板；重复应用时保留最初模式。
    const root = document.documentElement;
    if (!root.hasAttribute("data-heige-codex-original-theme")) {
      root.dataset.heigeCodexOriginalTheme = root.getAttribute("data-theme") ?? "";
    }
    root.dataset.theme = ${JSON.stringify(themeMode)};
    document.documentElement.dataset.heigeCodexSkin = ${JSON.stringify(themeId)};
    ${themeMode === "dark" ? `window.__heigeCodexSkin = { cleanup: (${startSkinLayout.toString()})() };` : ""}
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
    expression: buildApplyExpression(css, manifest.id, manifest.mode === "dark" ? "dark" : "light"),
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
  const expression = `(async () => {
    await (${waitForThemeDocument.toString()})();
    document.getElementById(${JSON.stringify(STYLE_ID)})?.remove();
    document.getElementById(${JSON.stringify(LEGACY_MENU_ID)})?.remove();
    const root = document.documentElement;
    if (root.hasAttribute("data-heige-codex-original-theme")) {
      const originalTheme = root.dataset.heigeCodexOriginalTheme;
      if (originalTheme) root.dataset.theme = originalTheme;
      else root.removeAttribute("data-theme");
      delete root.dataset.heigeCodexOriginalTheme;
    }
    delete document.documentElement.dataset.heigeCodexSkin;
    window.__heigeCodexSkin?.cleanup?.();
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
