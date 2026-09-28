import { execFile } from "node:child_process";
import { win32 } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { findCodexMainProcessIds } from "./electron-main-bridge.mjs";

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

// 通过 MSIX 激活应用并传递调试参数；已有窗口时不重启，避免中断正在进行的任务。
export async function launchThemedCodex(port, {
  exec = execFileAsync,
  native = false,
  findProcesses = findCodexMainProcessIds,
} = {}) {
  if (process.platform !== "win32") throw new Error("主题启动器目前仅支持 Windows");
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("调试端口必须是 1024 到 65535 的整数");
  }
  const running = await findProcesses();
  if (running.length > 0) return null;

  const args = [
    "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
    "-File", fileURLToPath(new URL("./activate-codex.ps1", import.meta.url)),
  ];
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
