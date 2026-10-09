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
  if (typeof window.electronBridge?.sendMessageFromView !== "function") {
    throw new Error("当前应用未提供原生外观设置接口，未应用自定义配色");
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

  const current = {};
  for (const key of keys) current[key] = await request("get-setting", { key });
  if (!palette) {
    // 用户自行调整过的设置不覆盖；未变的设置恢复到启用水墨之前的值。
    for (const key of [...keys].reverse()) {
      if (backup.applied[key] && same(current[key], backup.applied[key])) {
        await request("set-setting", { key, ...backup.original[key] });
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
  const existing = current[paletteKey].value ?? {};
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
    if (!same(current[key], desired[key])) await request("set-setting", { key, ...desired[key] });
  }
}
