import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFile, stat, writeFile } from "node:fs/promises";
import { createConnection, createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = fileURLToPath(new URL("./cli.mjs", import.meta.url));
export const watchLogPath = (port) => join(root, `.theme-watch-${port}.log`);
const endpoint = (port) => `\\\\.\\pipe\\codex-theme-${createHash("sha256").update(root.toLowerCase()).digest("hex").slice(0, 16)}-${port}`;

// 等正在进行的恢复结束后再切换/移除主题，避免后台把旧主题写回来。
export async function stopThemeWatch(port) {
  await new Promise((resolve, reject) => {
    const socket = createConnection(endpoint(port));
    let response = "";
    const timer = setTimeout(() => socket.destroy(new Error("等待主题自动恢复进程停止超时，请稍后重试")), 60_000);
    socket.on("connect", () => socket.write("stop\n"));
    socket.on("data", (data) => { response += data.toString(); });
    socket.on("end", () => response === "stopped" ? resolve() : reject(new Error("自动恢复进程未确认停止")));
    socket.on("error", (error) => ["ENOENT", "ECONNREFUSED"].includes(error.code) ? resolve() : reject(error));
    socket.on("close", () => clearTimeout(timer));
  });
}

export async function startThemeWatch(port) {
  const child = spawn(process.execPath, [cliPath, "watch", "--port", String(port)], {
    detached: true, windowsHide: true, stdio: ["ignore", "ignore", "ignore", "ipc"],
  });
  await new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => finish(new Error("主题已加载，但自动恢复进程未能就绪")), 5000);
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.removeListener("exit", onExit);
      child.removeListener("error", finish);
      child.removeListener("message", onMessage);
      if (child.connected) child.disconnect();
      // 仅清理本次未能就绪的子进程，不按名称关闭其它进程或 Codex。
      if (error && child.pid) child.kill();
      child.unref();
      error ? reject(error) : resolve();
    };
    const onExit = () => finish(new Error("自动恢复进程提前退出"));
    const onMessage = (message) => finish(message?.ready ? null : new Error(message?.error || "自动恢复进程启动失败"));
    child.once("exit", onExit);
    child.once("error", finish);
    child.once("message", onMessage);
  });
}

// 每轮串行检查；壁纸与配色共用主题恢复次数，语言单独计数。
export async function monitorTheme({ readTheme, loadTheme, inspect, apply, recoverLocale, report, signal,
  sleep = (ms) => delay(ms, undefined, { signal }), now = Date.now, intervalMs = 3000, disconnectMs = 120_000 }) {
  let disconnectedAt;
  let lastKey;
  let theme;
  const windows = new Map();
  while (!signal.aborted) {
    const key = await readTheme();
    if (key === "none") break;
    if (key !== lastKey) { theme = await loadTheme(key); lastKey = key; windows.clear(); }
    let health;
    try {
      health = await inspect(theme);
      disconnectedAt = undefined;
    } catch {
      disconnectedAt ??= now();
      if (now() - disconnectedAt >= disconnectMs) {
        await report("接口持续不可用，已停止自动恢复。请运行 start-themed.bat 重新开启主题接口。");
        break;
      }
      await report("主题接口断开，等待重新连接；不会重启 Codex。");
    }
    if (health && !signal.aborted) {
      const observed = [...health.windows, ...health.failed.map(({ id }) => ({ id, status: "missing" }))];
      for (const id of windows.keys()) if (!observed.some((window) => window.id === id)) windows.delete(id);
      const recover = [];
      const localeRecover = [];
      let problem = false;
      for (const window of observed) {
        const state = windows.get(window.id) ?? { attempts: 0, nextAppearanceRetryAt: 0, localeAttempts: 0, fault: "" };
        windows.set(window.id, state);
        if (window.status === "blocked" || window.status === "invalid") {
          problem = true;
          // 连续两次出现同一问题才记录，避免把页面切换瞬态当成兼容错误。
          if (state.fault === window.reason) await report(`需要处理：${window.reason}。已停止对此窗口重复注入。`);
          state.fault = window.reason;
        } else if (window.status === "missing" || window.appearanceWarning) {
          problem = true;
          state.fault = "";
          if (state.attempts >= 3) {
            await report(`主题恢复已尝试三次，暂停重试：${window.appearanceWarning ?? window.reason ?? "窗口样式缺失"}。请重新运行 start-themed.bat。`);
          } else if (window.status === "missing" || now() >= state.nextAppearanceRetryAt) {
            state.attempts++;
            // 配色服务可能晚于壁纸就绪，延长后续尝试的间隔，避免启动期间用完次数。
            state.nextAppearanceRetryAt = now() + state.attempts * 10_000;
            recover.push(window.id);
          } else {
            await report(window.appearanceWarning);
          }
        } else {
          state.attempts = 0;
          state.nextAppearanceRetryAt = 0;
          state.fault = "";
        }
        if (window.localeStatus === "waiting" || window.localeStatus === "loading") {
          problem = true;
          if (window.localeStatus === "waiting") state.localeAttempts = 0;
          await report(window.localeWarning);
        } else if (["missing", "failed"].includes(window.localeStatus) && !recover.includes(window.id)) {
          problem = true;
          if (state.localeAttempts < 3) { state.localeAttempts++; localeRecover.push(window.id); }
          else await report(`语言恢复已尝试三次：${window.localeWarning}。请重新应用主题查看详情。`);
        } else if (window.localeStatus === "ready") {
          state.localeAttempts = 0;
        }
      }
      if (recover.length) {
        try {
          await apply(theme, recover);
          await report("已重新应用主题，将继续检查壁纸与配色。");
        } catch (error) {
          await report(`自动恢复失败（每个窗口最多尝试三次）：${error.message}`);
        }
      }
      if (localeRecover.length) {
        try {
          await recoverLocale(localeRecover);
          await report("已请求语言恢复，等待实际翻译加载完成。");
        } catch (error) {
          await report(`语言恢复失败（每个窗口最多尝试三次）：${error.message}`);
        }
      }
      if (!recover.length && !localeRecover.length && !problem) {
        const pending = health.windows.find(({ status }) => status === "pending");
        const warnings = [...new Set(health.windows.map(({ localeWarning }) => localeWarning).filter(Boolean))];
        const warningNote = warnings.length ? `；${warnings.join("；")}` : "";
        const localeNote = health.windows.some(({ localeStatus }) => localeStatus === "ready") ? " 所选界面语言检查通过。" : "";
        await report((pending
          ? `主题已加载，效果检测待确认：${pending.reason}`
          : "壁纸资源与主背景层检测通过，自动恢复运行中。") + warningNote + localeNote);
      }
    }
    try { await sleep(intervalMs); } catch (error) { if (!signal.aborted) throw error; }
  }
}

export async function runThemeWatch({ port, ...options }) {
  const controller = new AbortController();
  const clients = new Set();
  let lastMessage;
  const report = async (message) => {
    if (message === lastMessage) return;
    lastMessage = message;
    const path = watchLogPath(port);
    // 本机状态日志限制体积，不把页面内容或图片写入日志。
    if ((await stat(path).catch(() => null))?.size > 64 * 1024) await writeFile(path, "", "utf8");
    await appendFile(path, `${new Date().toISOString()} ${message}\n`, "utf8");
  };
  const server = createServer((socket) => {
    clients.add(socket);
    socket.on("close", () => clients.delete(socket));
    socket.on("error", () => {});
    socket.setTimeout(60_000, () => socket.destroy());
    let input = "";
    socket.on("data", (data) => {
      input += data.toString();
      if (input === "stop\n") controller.abort();
      else if (input.length > 16 || input.includes("\n")) socket.destroy();
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(endpoint(port), resolve);
  });
  if (process.send) process.send({ ready: true });
  try {
    await monitorTheme({ ...options, report, signal: controller.signal });
  } catch (error) {
    await report(`自动恢复已停止：${error.message}`);
  } finally {
    for (const socket of clients) socket.end("stopped");
    await new Promise((resolve) => server.close(resolve));
  }
}
