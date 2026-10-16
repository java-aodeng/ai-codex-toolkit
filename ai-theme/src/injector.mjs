import { readFile } from "node:fs/promises";
import { extname } from "node:path";

import { CdpSession, fetchRendererTargets, waitForRendererTargets } from "./cdp-client.mjs";
import { LEGACY_MENU_ID, STYLE_ID } from "./constants.mjs";
import { evaluateCodexWindowsViaMainInspector } from "./electron-main-bridge.mjs";
import { buildSkinCss } from "./skin-css.mjs";
import { startSkinLayout } from "./skin-layout.mjs";
import { syncNativeAppearance } from "./native-appearance.mjs";
import { overlayCss } from "./overlay-css.mjs";
import { inspectThemeAppearance } from "./theme-health.mjs";

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};
const OVERLAY_MARKER = "avatar-overlay";
const OVERLAY_STYLE_ID = `${STYLE_ID}-overlay`;

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
      ok.push({ id: target.id, value: await session.evaluate(expression, { timeoutMs: 40_000 }) });
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
async function evaluateWithFallback({ port, expression, includeOverlay, operation, allowMainInspector = true, targetIds }) {
  let primaryError;
  let result;
  try {
    let targets = includeOverlay
      ? await fetchRendererTargets(port, { timeoutMs: 1_000 })
      : await waitForMainTargets(port, { timeoutMs: 1_000 });
    if (targetIds) {
      targets = targets.filter(({ id }) => targetIds.includes(id));
      // 自动恢复可能只涉及新出现的宠物悬浮窗口。
      if (!targets.length) return { ok: [], failed: [], transport: "renderer-cdp" };
    }
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
  if (!allowMainInspector || process.platform !== "win32") throw primaryError;
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

function buildApplyExpression(css, themeId, themeMode, nativePalette, heroDataUrl) {
  return `(async () => {
    await (${waitForThemeDocument.toString()})();
    await (${syncNativeAppearance.toString()})(${JSON.stringify(nativePalette)});
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
    // 使用原生配色的主题由应用维护模式，其它主题保留原有临时切换方式。
    const root = document.documentElement;
    if (${Boolean(nativePalette)}) {
      // 原生设置已写入；同时清除上一主题留在当前窗口的临时浅色模式。
      root.dataset.theme = "dark";
      delete root.dataset.heigeCodexOriginalTheme;
    } else {
      if (!root.hasAttribute("data-heige-codex-original-theme")) {
        root.dataset.heigeCodexOriginalTheme = root.getAttribute("data-theme") ?? "";
      }
      root.dataset.theme = ${JSON.stringify(themeMode)};
    }
    document.documentElement.dataset.heigeCodexSkin = ${JSON.stringify(themeId)};
    ${themeMode === "dark" && !nativePalette ? `window.__heigeCodexSkin = { cleanup: (${startSkinLayout.toString()})() };` : ""}
    const health = await (${inspectThemeAppearance.toString()})(${JSON.stringify(themeId)}, ${JSON.stringify(STYLE_ID)}, ${JSON.stringify(heroDataUrl)});
    if (["missing", "invalid", "blocked"].includes(health.status)) throw new Error(health.reason);
    return health;
  })()`;
}

// 悬浮层只注入通知样式，不套用主窗口壁纸，也不改变宠物交互。
async function applyOverlayAppearance(port, transport, targetIds) {
  const expression = `(async () => {
    if (!location.search.includes(${JSON.stringify(OVERLAY_MARKER)})) return false;
    await (${waitForThemeDocument.toString()})();
    let style = document.getElementById(${JSON.stringify(OVERLAY_STYLE_ID)});
    if (!style) {
      style = document.createElement("style");
      style.id = ${JSON.stringify(OVERLAY_STYLE_ID)};
      document.head.appendChild(style);
    }
    style.textContent = ${JSON.stringify(overlayCss)};
    document.documentElement.dataset.heigeCodexOverlay = "light";
    return true;
  })()`;
  try {
    const result = transport === "renderer-cdp"
      ? await evaluateTargets((await fetchRendererTargets(port)).filter((target) => !isMainTarget(target) && (!targetIds || targetIds.includes(target.id))), expression)
      : await evaluateCodexWindowsViaMainInspector(expression, { includeOverlay: true });
    if (result.failed.length) throw new Error(result.failed.map(({ error }) => error).join("；"));
  } catch (error) {
    throw new Error(`主窗口主题已应用，但宠物通知外观更新失败：${errorMessage(error)}`, { cause: error });
  }
}

export async function applyTheme({ manifest, heroPath, logoPath, polaroidPath, port, rendererOnly = false, targetIds }) {
  // 原生对比度和窗口透明度来自主题清单；字体及语义色保留用户配置。
  if (manifest.nativeAppearance && manifest.mode !== "dark") {
    throw new Error("原生配色配置目前仅适用于深色主题");
  }
  const nativePalette = manifest.nativeAppearance ? {
    accent: manifest.colors.accent, ink: manifest.colors.text, surface: manifest.colors.surface,
    contrast: manifest.nativeAppearance.contrast, opaqueWindows: manifest.nativeAppearance.opaqueWindows,
  } : null;
  const heroDataUrl = await assetDataUrl(heroPath, "hero");
  const css = buildSkinCss({
    theme: manifest,
    heroDataUrl,
    logoDataUrl: await assetDataUrl(logoPath, "logo"),
    polaroidDataUrl: await assetDataUrl(polaroidPath, "polaroid"),
  });
  const result = await evaluateWithFallback({
    port,
    expression: buildApplyExpression(css, manifest.id, manifest.mode === "dark" ? "dark" : "light", nativePalette, heroDataUrl),
    includeOverlay: false,
    operation: "主题应用",
    allowMainInspector: !rendererOnly,
    targetIds,
  });
  if (result.failed.length) {
    throw new Error(`部分窗口主题应用或检测失败：${result.failed.map(({ error }) => error).join("；")}`);
  }
  await applyOverlayAppearance(port, result.transport, targetIds);
  return {
    applied: result.ok.length,
    failed: result.failed.map(({ id }) => id),
    transport: result.transport,
    pending: result.ok.filter(({ value }) => value?.status === "pending").length,
  };
}

// 后台检查仅使用已有调试接口，不尝试开启主进程 inspector 或重启应用。
export async function inspectTheme({ manifest, port }) {
  const targets = await fetchRendererTargets(port, { timeoutMs: 1500 });
  const mainTargets = targets.filter(isMainTarget);
  if (!mainTargets.length) throw new Error("尚未发现 Codex 主窗口");
  const expression = `(${inspectThemeAppearance.toString()})(${JSON.stringify(manifest.id)}, ${JSON.stringify(STYLE_ID)})`;
  const result = await evaluateTargets(mainTargets, expression);
  const overlays = await evaluateTargets(targets.filter((target) => !isMainTarget(target)),
    `Boolean(document.getElementById(${JSON.stringify(OVERLAY_STYLE_ID)})?.textContent && document.documentElement.dataset.heigeCodexOverlay === "light")`);
  return {
    windows: [
      ...result.ok.map(({ id, value }) => ({ id, ...value })),
      ...overlays.ok.map(({ id, value }) => ({ id, status: value ? "ok" : "missing", reason: "宠物通知样式丢失" })),
    ],
    failed: [...result.failed, ...overlays.failed],
  };
}

export async function removeTheme({ port }) {
  const expression = `(async () => {
    await (${waitForThemeDocument.toString()})();
    if (!location.search.includes(${JSON.stringify(OVERLAY_MARKER)})) await (${syncNativeAppearance.toString()})(null);
    document.getElementById(${JSON.stringify(STYLE_ID)})?.remove();
    document.getElementById(${JSON.stringify(OVERLAY_STYLE_ID)})?.remove();
    delete document.documentElement.dataset.heigeCodexOverlay;
    document.getElementById(${JSON.stringify(LEGACY_MENU_ID)})?.remove();
    const root = document.documentElement;
    if (root.hasAttribute("data-heige-codex-original-theme")) {
      const originalTheme = root.dataset.heigeCodexOriginalTheme;
      if (originalTheme) root.dataset.theme = originalTheme;
      else root.removeAttribute("data-theme");
      delete root.dataset.heigeCodexOriginalTheme;
    }
    delete document.documentElement.dataset.heigeCodexSkin;
    delete window.__heigeCodexThemeHealth;
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
