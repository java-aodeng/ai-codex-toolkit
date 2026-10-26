// 序列化到页面执行：通过原生设置服务生成整套配色，备份仅存于本机应用存储。
export async function syncNativeAppearance(palette) {
  const storageKey = "heige-codex-native-appearance-v1";
  const modeKey = "appearanceTheme";
  const paletteKey = "appearanceDarkChromeTheme";
  const keys = [paletteKey, modeKey];
  const raw = localStorage.getItem(storageKey);
  let backup = raw ? JSON.parse(raw) : null;
  if (!palette && !backup) return;
  if (backup && backup.version !== 1) throw new Error("原生主题备份版本不匹配，未修改外观设置");

  async function bounded(operation, label) {
    let timer;
    try {
      return await Promise.race([
        Promise.resolve().then(operation),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label}超时`)), 5000); }),
      ]);
    } finally { clearTimeout(timer); }
  }

  // 新版设置服务从应用自己的 RPC 入口导出；从当前入口脚本发现地址，不绑定构建哈希。
  async function findSettingsService() {
    const isRpc = (value) => {
      try { const url = new URL(value); return url.protocol === "app:" && url.host === "-" && /^\/assets\/rpc-[\w-]+\.js$/.test(url.pathname); }
      catch { return false; }
    };
    const urls = performance.getEntriesByType("resource").map(({ name }) => name);
    urls.push(...[...document.querySelectorAll('link[rel="modulepreload"][href]')].map(({ href }) => href));
    let rpcUrl = urls.find(isRpc);
    if (!rpcUrl) {
      const entry = [...document.scripts].map(({ src }) => src).find((value) => {
        try { const url = new URL(value); return url.protocol === "app:" && url.host === "-" && /^\/assets\/index-[\w-]+\.js$/.test(url.pathname); }
        catch { return false; }
      });
      if (!entry) return null;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      try {
        const response = await fetch(entry, { signal: controller.signal });
        if (!response.ok) throw new Error("无法读取应用设置入口");
        const source = await response.text();
        const filename = source.match(/["'`]((?:\.\/)?rpc-[\w-]+\.js)["'`]/)?.[1];
        if (!filename) return null;
        rpcUrl = new URL(filename, entry).href;
      } finally { clearTimeout(timer); }
    }
    const module = await bounded(() => import(rpcUrl), "加载原生设置服务");
    const service = module.appServices?.settings;
    return service && typeof service.read === "function" && typeof service.write === "function" ? service : null;
  }

  let service;
  let discoveryError;
  try { service = await findSettingsService(); } catch (error) { discoveryError = error; }
  if (!service && typeof window.electronBridge?.sendMessageFromView !== "function") {
    throw new Error(discoveryError?.message ?? "当前应用未提供原生外观设置接口");
  }

  function normalize(value) {
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalize(value[key])]));
    }
    return value;
  }
  const same = (left, right) => JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));

  async function request(method, params) {
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();
      const cleanup = () => {
        clearTimeout(timer);
        window.removeEventListener("message", receive);
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("原生外观设置响应超时，请稍后重试"));
      }, 5_000);
      function receive(event) {
        const response = event.data;
        if ((event.source != null && event.source !== window) || response?.type !== "fetch-response" || response.requestId !== requestId) return;
        cleanup();
        try {
          if (response.responseType !== "success" || response.status < 200 || response.status >= 300) {
            throw new Error(`原生外观设置失败：${response.error ?? response.status}`);
          }
          resolve("body" in response ? response.body : JSON.parse(response.bodyJsonString));
        } catch (error) {
          reject(error);
        }
      }
      window.addEventListener("message", receive);
      Promise.resolve().then(() => window.electronBridge.sendMessageFromView({
        type: "fetch", requestId, method: "POST",
        url: `vscode://codex/${method}`, body: JSON.stringify(params),
      })).catch((error) => { cleanup(); reject(error); });
    });
  }

  async function readSetting(key) {
    if (!service) {
      const snapshot = await request("get-setting", { key });
      return { snapshot, effective: snapshot.value };
    }
    const result = await bounded(() => service.read(key), "读取原生外观设置");
    // 未设置且没有默认值时，RPC 会省略两个 undefined 字段，返回空对象。
    if (!result || typeof result !== "object" || Array.isArray(result) ||
        Object.keys(result).some((key) => key !== "configured" && key !== "effective")) {
      throw new Error("原生设置返回格式不兼容");
    }
    // 保留旧备份结构；未配置的值用空对象表示，恢复时清除覆盖而不是写死默认值。
    return { snapshot: result.configured === undefined ? {} : { value: result.configured }, effective: result.effective };
  }
  async function writeSetting(key, snapshot) {
    if (service) await bounded(() => service.write(key, snapshot.value), "写入原生外观设置");
    else await request("set-setting", { key, ...snapshot });
  }
  const current = {};
  const effective = {};
  for (const key of keys) {
    const result = await readSetting(key);
    current[key] = result.snapshot;
    effective[key] = result.effective;
  }
  if (!palette) {
    // 用户自行调整过的设置不覆盖；未变的设置恢复到启用水墨之前的值。
    for (const key of [...keys].reverse()) {
      if (backup.applied[key] && same(current[key], backup.applied[key])) {
        await writeSetting(key, backup.original[key]);
      }
    }
    localStorage.removeItem(storageKey);
    return;
  }

  if (![palette.accent, palette.ink, palette.surface].every((value) => /^#[0-9a-f]{6}$/i.test(value)) ||
      !Number.isInteger(palette.contrast) || palette.contrast < 0 || palette.contrast > 100 ||
      typeof palette.opaqueWindows !== "boolean") {
    throw new Error("水墨主题的原生配色参数无效");
  }
  backup ??= { version: 1, original: {}, applied: {} };
  for (const key of keys) {
    if (!backup.applied[key] || !same(current[key], backup.applied[key])) backup.original[key] = current[key];
  }
  const existing = effective[paletteKey] ?? {};
  const desired = {
    [paletteKey]: { value: {
      ...existing,
      fonts: existing.fonts ?? { code: null, ui: null },
      semanticColors: existing.semanticColors ?? { diffAdded: "#00c853", diffRemoved: "#ff5f38", skill: palette.accent },
      ...palette,
      accentSource: "custom",
    } },
    [modeKey]: { value: "dark" },
  };
  for (const key of keys) {
    backup.applied[key] = desired[key];
    localStorage.setItem(storageKey, JSON.stringify(backup));
    if (!same(current[key], desired[key])) await writeSetting(key, desired[key]);
  }
}
