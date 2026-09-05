import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { win32 } from "node:path";
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

export async function findCodexExecutable({ env = process.env, exec = execFileAsync } = {}) {
  if (process.platform !== "win32") throw new Error("主题启动器目前仅支持 Windows");

  const command = [
    "$package = Get-AppxPackage -Name 'OpenAI.Codex' -ErrorAction Stop",
    "$exe = Join-Path $package.InstallLocation 'app\\ChatGPT.exe'",
    "[Console]::Out.Write($exe)",
  ].join("; ");
  const { stdout } = await exec(
    powershellPath(env),
    ["-NoProfile", "-NonInteractive", "-Command", command],
    { encoding: "utf8", timeout: 10_000, windowsHide: true },
  );
  const executable = String(stdout).trim();
  if (!executable) throw new Error("没有找到已安装的 Codex Windows 应用");
  await access(executable);
  return executable;
}

export async function launchThemedCodex(port, { exec = execFileAsync } = {}) {
  const running = await findCodexMainProcessIds();
  if (running.length > 0) {
    throw new Error(
      "Codex 正在运行，但最新版未开放主题调试端口。请先从托盘完全退出 Codex，再运行 start-themed.bat。",
    );
  }

  const executable = await findCodexExecutable({ exec });
  const command = `Start-Process -FilePath '${executable.replaceAll("'", "''")}' -ArgumentList '--remote-debugging-port=${port}'`;
  await exec(
    powershellPath(),
    ["-NoProfile", "-NonInteractive", "-Command", command],
    { encoding: "utf8", timeout: 10_000, windowsHide: true },
  );
  return executable;
}
