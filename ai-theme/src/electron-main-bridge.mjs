import { execFile } from "node:child_process";
import { win32 } from "node:path";
import { promisify } from "node:util";

import { CdpSession } from "./cdp-client.mjs";

const execFileAsync = promisify(execFile);
const DEFAULT_INSPECTOR_PORT = 9229;
const CODEX_PAGE_PREFIX = "app://-/index.html";
const OVERLAY_MARKER = "avatar-overlay";

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function validatePort(port) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new TypeError("inspectorPort must be an integer from 1024 through 65535");
  }
}

export async function fetchElectronInspectorTarget(
  port = DEFAULT_INSPECTOR_PORT,
  { fetchImpl = globalThis.fetch, timeoutMs = 750 } = {},
) {
  validatePort(port);
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();
  try {
    const response = await fetchImpl(`http://127.0.0.1:${port}/json/list`, {
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Node Inspector discovery returned HTTP ${response.status}`);
    const targets = await response.json();
    if (!Array.isArray(targets)) throw new Error("Node Inspector discovery returned malformed JSON");
    const target = targets.find(
      (candidate) =>
        candidate &&
        typeof candidate.webSocketDebuggerUrl === "string" &&
        candidate.webSocketDebuggerUrl.length > 0,
    );
    if (!target) throw new Error("Node Inspector has no debuggable target");
    return target;
  } finally {
    clearTimeout(timer);
  }
}

export async function findCodexMainProcessIds({
  platform = process.platform,
  env = process.env,
  exec = execFileAsync,
} = {}) {
  if (platform !== "win32") return [];

  const powershell = win32.join(
    env.SystemRoot ?? "C:\\Windows",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
  const command = [
    "$all = @(Get-CimInstance Win32_Process -Filter \"Name='ChatGPT.exe' or Name='Codex.exe'\" -ErrorAction Stop)",
    "$all = @($all | Where-Object { -not $_.CommandLine -or $_.CommandLine -notmatch '(^|\\s)--type=' })",
    "$preferred = @($all | Where-Object { $_.ExecutablePath -match '\\\\OpenAI\\.Codex_' -or $_.ExecutablePath -match '\\\\(ChatGPT|Codex)\\\\(ChatGPT|Codex)\\.exe$' })",
    "if ($preferred.Count -gt 0) { $all = $preferred }",
    "$all | Sort-Object @{ Expression = { if ($_.ExecutablePath -match '\\\\OpenAI\\.Codex_') { 0 } else { 1 } } }, ProcessId | Select-Object -ExpandProperty ProcessId",
  ].join("; ");
  const { stdout } = await exec(
    powershell,
    ["-NoProfile", "-NonInteractive", "-Command", command],
    { encoding: "utf8", timeout: 5_000, windowsHide: true },
  );
  return String(stdout)
    .split(/\r?\n/)
    .map((line) => Number(line.trim()))
    .filter((pid) => Number.isInteger(pid) && pid > 0);
}

async function waitForInspectorTarget(
  port,
  {
    fetchTarget = fetchElectronInspectorTarget,
    timeoutMs = 3_000,
    pollMs = 100,
  } = {},
) {
  const deadline = Date.now() + timeoutMs;
  let lastError = new Error("Node Inspector target is not available");
  while (Date.now() < deadline) {
    try {
      return await fetchTarget(port, { timeoutMs: Math.min(500, Math.max(1, deadline - Date.now())) });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  throw new Error(`Node Inspector did not open on port ${port}: ${lastError.message}`, {
    cause: lastError,
  });
}

export function buildElectronBridgeExpression(
  rendererExpression,
  { includeOverlay = false, closeInspector = false } = {},
) {
  if (typeof rendererExpression !== "string") {
    throw new TypeError("rendererExpression must be a string");
  }

  const closeInspectorScript = closeInspector
    ? `
    const closeTimer = setTimeout(() => {
      try { mainModule.require("node:inspector").close(); } catch {}
    }, 750);
    closeTimer.unref?.();`
    : "";

  return `(async () => {
    const mainModule = process.mainModule;
    if (!mainModule?.require) throw new Error("Electron main module loader is unavailable");
    const { BrowserWindow } = mainModule.require("electron");
    if (!BrowserWindow?.getAllWindows) throw new Error("Electron BrowserWindow API is unavailable");
    const windows = BrowserWindow.getAllWindows().filter((window) => {
      if (window.isDestroyed()) return false;
      const url = window.webContents.getURL();
      return url.startsWith(${JSON.stringify(CODEX_PAGE_PREFIX)}) &&
        (${includeOverlay ? "true" : `!url.includes(${JSON.stringify(OVERLAY_MARKER)})`});
    });
    const ok = [];
    const failed = [];
    for (const window of windows) {
      const id = String(window.id);
      try {
        const value = await window.webContents.executeJavaScript(${JSON.stringify(rendererExpression)}, true);
        ok.push({ id, value });
      } catch (error) {
        failed.push({ id, error: error?.message ?? String(error) });
      }
    }${closeInspectorScript}
    return { ok, failed, processId: process.pid };
  })()`;
}

export async function evaluateCodexWindowsViaMainInspector(
  rendererExpression,
  {
    includeOverlay = false,
    inspectorPort = DEFAULT_INSPECTOR_PORT,
    deps = {},
  } = {},
) {
  const platform = deps.platform ?? process.platform;
  if (platform !== "win32") {
    throw new Error("Electron main-process fallback is only available on Windows");
  }

  const fetchTarget = deps.fetchElectronInspectorTarget ?? fetchElectronInspectorTarget;
  let target;
  let activated = false;
  try {
    target = await fetchTarget(inspectorPort);
  } catch {
    const findProcessIds = deps.findCodexMainProcessIds ?? findCodexMainProcessIds;
    const processIds = await findProcessIds({ platform });
    if (processIds.length === 0) throw new Error("No running Codex Desktop main process was found");

    const debugProcess = deps.debugProcess ?? process._debugProcess?.bind(process);
    if (typeof debugProcess !== "function") {
      throw new Error("This Node.js runtime cannot activate the Electron main-process inspector");
    }
    const waitForTarget = deps.waitForInspectorTarget ?? waitForInspectorTarget;
    const failures = [];
    for (const processId of processIds) {
      try {
        debugProcess(processId);
        target = await waitForTarget(inspectorPort, { fetchTarget });
        activated = true;
        break;
      } catch (error) {
        failures.push(`${processId}: ${errorMessage(error)}`);
      }
    }
    if (!target) {
      throw new Error(`Could not activate the Codex main-process inspector (${failures.join("; ")})`);
    }
  }

  const Session = deps.Session ?? CdpSession;
  const session = new Session(target.webSocketDebuggerUrl, {
    commandTimeoutMs: deps.commandTimeoutMs ?? 20_000,
    connectTimeoutMs: deps.connectTimeoutMs ?? 5_000,
    domains: ["Runtime"],
  });
  try {
    await session.open();
    const result = await session.evaluate(
      buildElectronBridgeExpression(rendererExpression, {
        includeOverlay,
        closeInspector: activated,
      }),
      { timeoutMs: deps.commandTimeoutMs ?? 20_000 },
    );
    if (!result || !Array.isArray(result.ok) || !Array.isArray(result.failed)) {
      throw new Error("Electron main-process bridge returned an invalid result");
    }
    if (result.ok.length === 0) {
      const detail = result.failed.map(({ error }) => error).filter(Boolean).join("; ");
      throw new Error(detail || "No Codex main window was available for theme injection");
    }
    return result;
  } finally {
    session.close();
  }
}
