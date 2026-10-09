import { execFile } from "node:child_process";
import { win32 } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { findCodexMainProcessIds } from "./electron-main-bridge.mjs";
import { fetchRendererTargets } from "./cdp-client.mjs";

const execFileAsync = promisify(execFile);

function powershellPath(env = process.env) {
  return win32.join(
    env.SystemRoot ?? "C:\\Windows",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
}

// 已有主题接口时直接复用；缺少接口时须经调用方明确确认才重启。取消返回 false。
export async function launchThemedCodex(port, {
  exec = execFileAsync,
  native = false,
  findProcesses = findCodexMainProcessIds,
  findTargets = fetchRendererTargets,
  confirmRestart,
} = {}) {
  if (process.platform !== "win32") throw new Error("主题启动器目前仅支持 Windows");
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("调试端口必须是 1024 到 65535 的整数");
  }
  const running = await findProcesses();
  if (running.length > 0) {
    let connected = false;
    try {
      const targets = await findTargets(port, { timeoutMs: 2_000 });
      connected = targets.some(({ url }) => url.startsWith("app://-/index.html") && !url.includes("avatar-overlay"));
    } catch {
      // 更新后的普通启动可能没有调试接口，交给用户选择是否重启。
    }
    if (connected) return null;
    if (!confirmRestart) {
      throw new Error("Codex 已运行但未开启主题接口，请从托盘完全退出后运行 start-themed.bat");
    }
    if (!(await confirmRestart())) return false;
    if (running.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
      throw new Error("无法确认 Codex 桌面进程，未执行重启");
    }
  }

  const args = [
    "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
    "-File", fileURLToPath(new URL("./activate-codex.ps1", import.meta.url)),
  ];
  if (running.length > 0) args.push("-RestartProcessIds", running.join(","));
  if (!native) args.push("-AppArguments", `--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1`);
  const { stdout } = await exec(
    powershellPath(),
    args,
    { encoding: "utf8", timeout: 15_000, windowsHide: true },
  );
  const processId = Number(String(stdout).trim());
  if (!Number.isInteger(processId) || processId <= 0) {
    throw new Error("Codex 应用包激活未返回有效进程，请从开始菜单确认应用能正常启动");
  }
  return processId;
}
