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
const themeDirectories = { miku: "themes/miku", "dark-gold": "themes/dark-gold" };
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
    if (!Object.hasOwn(themeDirectories, theme)) throw new Error("已保存的主题不存在，请运行 switch-theme.bat 重新选择");
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
    console.log("1. 初音\n2. 暗金\n0. 取消");
    const answer = (await input.question("请选择主题 [1/2/0]：")).trim();
    if (answer === "0") return null;
    const key = { "1": "miku", "2": "dark-gold" }[answer];
    if (!key) throw new Error("请输入 1、2 或 0");
    return key;
  } finally {
    input.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? "apply";
  const port = parsePort(args);
  if (command === "switch") {
    const key = await chooseTheme(args);
    if (key === null) return;
    const theme = await loadTheme(key);
    const result = await applyTheme({ ...theme, port });
    await writeFile(selectionPath, JSON.stringify({ theme: key }) + "\n", "utf8");
    console.log(`已切换到 ${theme.manifest.name}，应用到 ${result.applied} 个窗口；下次启动自动恢复。`);
    return;
  }
  if (command === "apply") {
    const theme = await loadTheme(await selectedTheme());
    const result = await applyTheme({ ...theme, port });
    console.log(`主题 ${theme.manifest.id} 已实时应用到 ${result.applied} 个 Codex 窗口，无需重启。`);
    return;
  }
  if (command === "start") {
    const theme = await loadTheme(await selectedTheme());
    await launchThemedCodex(port);
    console.log("Codex 已启动，正在等待主题接口……");
    await waitForRendererTargets(port, { timeoutMs: 30_000 });
    const result = await applyTheme({ ...theme, port });
    console.log(`主题 ${theme.manifest.id} 已应用到 ${result.applied} 个 Codex 窗口。`);
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
