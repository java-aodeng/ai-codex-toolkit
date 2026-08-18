#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_CDP_PORT } from "./constants.mjs";
import { applyTheme, removeTheme } from "./injector.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const themeRoot = join(root, "theme");
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

async function resolveAsset(manifest, field, required = false) {
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

async function loadTheme() {
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
    heroPath: await resolveAsset(manifest, "hero", true),
    logoPath: await resolveAsset(manifest, "logo"),
    polaroidPath: await resolveAsset(manifest, "polaroid"),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? "apply";
  const port = parsePort(args);
  if (command === "apply") {
    const theme = await loadTheme();
    const result = await applyTheme({ ...theme, port });
    console.log(`主题 ${theme.manifest.id} 已实时应用到 ${result.applied} 个 Codex 窗口，无需重启。`);
    return;
  }
  if (command === "pause") {
    const result = await removeTheme({ port });
    console.log(`主题已从 ${result.removed} 个 Codex 窗口移除。`);
    return;
  }
  throw new Error(`未知命令：${command}，仅支持 apply 或 pause`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
