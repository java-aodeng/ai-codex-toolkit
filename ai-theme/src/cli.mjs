#!/usr/bin/env node
import { readFile, stat, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_CDP_PORT } from "./constants.mjs";
import { launchThemedCodex } from "./codex-launcher.mjs";
import { waitForRendererTargets } from "./cdp-client.mjs";
import { applyTheme, removeTheme } from "./injector.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const themeDirectories = { miku: "themes/miku", "dark-gold": "themes/dark-gold", "ink-landscape": "themes/ink-landscape", facai: "themes/facai" };
const selectionPath = join(root, ".selected-theme.json");
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function parsePort(args) {
  const index = args.indexOf("--port");
  const raw = index >= 0 ? args[index + 1] : process.env.HEIGE_CODEX_SKIN_PORT;
  const port = raw === undefined ? DEFAULT_CDP_PORT : Number(raw);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("调试端口必须是 1024 到 65535 的整数");
  }
  return port;
}

async function resolveAsset(themeRoot, manifest, field, required = false) {
  const value = manifest[field];
  if (value == null && !required) return null;
  if (typeof value !== "string" || !value || isAbsolute(value)) {
    throw new Error(`theme.json 的 ${field} 必须是主题目录内的相对图片路径`);
  }
  if (!IMAGE_EXTENSIONS.has(extname(value).toLowerCase())) {
    throw new Error(`theme.json 的 ${field} 图片格式不受支持`);
  }
  const path = resolve(themeRoot, value);
  const relation = relative(themeRoot, path);
  if (relation.startsWith("..") || isAbsolute(relation)) {
    throw new Error(`theme.json 的 ${field} 不能指向主题目录外`);
  }
  const info = await stat(path);
  if (!info.isFile() || info.size === 0) throw new Error(`${field} 图片不存在或为空`);
  return path;
}

async function loadTheme(key) {
  if (!Object.hasOwn(themeDirectories, key)) throw new Error(`未知主题：${key}`);
  const themeRoot = join(root, themeDirectories[key]);
  const manifest = JSON.parse(await readFile(join(themeRoot, "theme.json"), "utf8"));
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("theme.json 必须是 JSON 对象");
  }
  if (typeof manifest.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.id)) {
    throw new Error("theme.json 的 id 格式无效");
  }
  if (!manifest.colors || typeof manifest.colors !== "object") {
    throw new Error("theme.json 缺少 colors 配色");
  }
  return {
    manifest,
    heroPath: await resolveAsset(themeRoot, manifest, "hero", true),
    logoPath: await resolveAsset(themeRoot, manifest, "logo"),
    polaroidPath: await resolveAsset(themeRoot, manifest, "polaroid"),
  };
}

async function selectedTheme() {
  try {
    const { theme } = JSON.parse(await readFile(selectionPath, "utf8"));
    if (theme !== "none" && !Object.hasOwn(themeDirectories, theme)) throw new Error("已保存的主题不存在，请运行 start-themed.bat 重新选择");
    return theme;
  } catch (error) {
    if (error.code === "ENOENT") return "miku";
    throw error;
  }
}

async function chooseTheme(args) {
  const index = args.indexOf("--theme");
  if (index >= 0) return args[index + 1];
  const input = createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log("1. 初音\n2. 暗金\n3. Codex 默认（不使用主题）\n4. 水墨·护眼\n5. 发财\n0. 取消");
    const answer = (await input.question("请选择主题 [1/2/3/4/5/0]：")).trim();
    if (answer === "0") return null;
    const key = { "1": "miku", "2": "dark-gold", "3": "none", "4": "ink-landscape", "5": "facai" }[answer];
    if (!key) throw new Error("请输入 1、2、3、4、5 或 0");
    return key;
  } finally {
    input.close();
  }
}

async function confirmThemeRestart() {
  if (!process.stdin.isTTY) {
    throw new Error("Codex 已运行但未开启主题接口。请在交互终端运行 start-themed.bat，或从托盘完全退出 Codex 后重试。");
  }
  const input = createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log("Codex 已运行，但没有开启主题接口（更新后自动启动也会出现此情况）。");
    console.log("重启会关闭所有 Codex 窗口并中断运行中的任务，请先保存未发送内容并等待任务结束。");
    return (await input.question("输入 R 重启并应用所选外观，直接回车取消：")).trim().toLowerCase() === "r";
  } finally {
    input.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? "apply";
  const port = parsePort(args);
  if (command === "switch" || command === "start") {
    const key = await chooseTheme(args);
    if (key === null) return;
    const theme = key === "none" ? null : await loadTheme(key);
    const launched = command === "start"
      ? await launchThemedCodex(port, { native: key === "none", confirmRestart: confirmThemeRestart })
      : null;
    if (launched === false) {
      console.log("已取消，未重启 Codex，也未更改主题选择。");
      return;
    }
    if (key === "none") {
      // 原生启动无需调试端口；已有窗口则清除样式和布局监听。
      if (!launched) {
        const result = await removeTheme({ port });
        if (result.failed.length) throw new Error("部分窗口未能恢复默认外观，请重试；未保存主题选择。");
      }
      await writeFile(selectionPath, JSON.stringify({ theme: key }) + "\n", "utf8");
      console.log("已恢复 Codex 默认外观，不使用自定义主题。");
      return;
    }
    // 已运行时直接切换；新启动时等待窗口就绪后再应用所选主题。
    if (launched) {
      console.log("Codex 已启动，正在等待主题接口……");
      await waitForRendererTargets(port, { timeoutMs: 30_000 });
    }
    const result = await applyTheme({ ...theme, port });
    await writeFile(selectionPath, JSON.stringify({ theme: key }) + "\n", "utf8");
    console.log(`主题 ${theme.manifest.name} 已应用到 ${result.applied} 个 Codex 窗口。`);
    return;
  }
  if (command === "apply") {
    const key = await selectedTheme();
    if (key === "none") {
      const result = await removeTheme({ port });
      if (result.failed.length) throw new Error("部分窗口未能恢复默认外观，请重试。");
      console.log("已恢复 Codex 默认外观，不使用自定义主题。");
      return;
    }
    const theme = await loadTheme(key);
    const result = await applyTheme({ ...theme, port });
    console.log(`主题 ${theme.manifest.id} 已实时应用到 ${result.applied} 个 Codex 窗口，无需重启。`);
    return;
  }
  if (command === "pause") {
    const result = await removeTheme({ port });
    console.log(`主题已从 ${result.removed} 个 Codex 窗口移除。`);
    return;
  }
  throw new Error(`未知命令：${command}，仅支持 apply、start、switch 或 pause`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
