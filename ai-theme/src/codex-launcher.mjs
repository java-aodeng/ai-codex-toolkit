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

// 返回新启动的程序路径；已有 Codex 时返回 null，由调用方应用或移除主题。
export async function launchThemedCodex(port, { exec = execFileAsync, native = false } = {}) {
  const running = await findCodexMainProcessIds();
  if (running.length > 0) return null;

  const executable = await findCodexExecutable({ exec });
  const argumentsOption = native ? "" : ` -ArgumentList '--remote-debugging-port=${port}'`;
  const command = `Start-Process -FilePath '${executable.replaceAll("'", "''")}'${argumentsOption}`;
  await exec(
    powershellPath(),
    ["-NoProfile", "-NonInteractive", "-Command", command],
    { encoding: "utf8", timeout: 10_000, windowsHide: true },
  );
  return executable;
}
