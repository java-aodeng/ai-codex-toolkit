// 序列化到 Codex 页面执行：仅补偿语言功能配置缺失，不修改语言偏好或安装文件。
export async function syncLocaleRecovery({ enabled = true, timeoutMs = 5000 } = {}) {
  const stateKey = "__heigeCodexLocaleRecovery";
  const layerName = "72216192";
  const previous = window[stateKey];
  if (!enabled) {
    previous?.dispose();
    return { status: "inactive" };
  }

  // 当前版本的语言 hook 缓存只依赖客户端身份；配置更新事件本身不能清掉旧值。
  function findLocaleBoundary() {
    const queue = [window.__codexRoot?._internalRoot?.current];
    const seen = new Set();
    const found = [];
    while (queue.length && seen.size < 50_000) {
      const node = queue.pop();
      if (!node || seen.has(node)) continue;
      seen.add(node);
      const source = typeof node.type === "function" ? node.type.toString() : "";
      if (source.includes("enable_i18n") && source.includes("localeOverride") && source.includes("initialMessages")) {
        found.push(node);
      }
      if (node.child) queue.push(node.child);
      if (node.sibling) queue.push(node.sibling);
    }
    return found.length === 1 ? found[0] : null;
  }

  const deadline = Date.now() + timeoutMs;
  let client;
  let boundary;
  do {
    client = window.__STATSIG__?.firstInstance;
    boundary = findLocaleBoundary();
    if (client?.loadingStatus === "Ready" && boundary) break;
    if (Date.now() >= deadline) {
      const error = new Error("语言组件或功能配置尚未就绪，暂未启用语言恢复");
      error.code = "LOCALE_NOT_READY";
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  } while (true);

  if (previous?.client === client && previous.adapter === client.overrideAdapter) {
    return { status: "active", locale: document.documentElement.lang };
  }
  previous?.dispose();
  if (!boundary.type.toString().includes(layerName)) {
    throw new Error("当前版本的语言功能层已变化，未修改语言配置");
  }
  if (typeof client.getLayer !== "function" || typeof client.$emt !== "function" ||
      typeof client.on !== "function" || typeof client.off !== "function" || !client._memoCache) {
    throw new Error("当前版本的语言配置接口不兼容，未修改语言设置");
  }
  const layer = client.getLayer(layerName, { disableExposureLog: true });
  const values = layer.__value ?? layer.value ?? {};
  if (layer.details?.reason !== "NoValues" || Object.hasOwn(values, "enable_i18n")) {
    return { status: "native", locale: document.documentElement.lang };
  }
  if (client.overrideAdapter != null) throw new Error("已有其它功能配置覆盖，未替换其语言配置");
  if (!Array.isArray(boundary.updateQueue?.memoCache?.data)) {
    throw new Error("当前版本的语言缓存结构不兼容，未修改语言设置");
  }

  const originalAdapter = client.overrideAdapter;
  const adapter = {
    getLayerOverride(current) {
      const value = current.__value ?? current.value ?? {};
      // 官方配置后来恢复时立即沿用；不覆盖明确关闭的值，也不影响其它功能层。
      if (current.name !== layerName || current.details?.reason !== "NoValues" || Object.hasOwn(value, "enable_i18n")) return null;
      const fallback = { ...value, enable_i18n: true };
      return {
        ...current, value: fallback, __value: fallback,
        get: (name, defaultValue) => name === "enable_i18n" ? true : current.get(name, defaultValue),
        details: { ...current.details, reason: "LocalOverride" },
      };
    },
  };

  function invalidateLocaleCache() {
    const current = findLocaleBoundary();
    for (const row of current?.updateQueue?.memoCache?.data ?? []) {
      if (Array.isArray(row)) row.fill(Symbol.for("react.memo_cache_sentinel"));
    }
  }
  function publish() {
    client._memoCache = {};
    invalidateLocaleCache();
    client.$emt({ name: "values_updated", status: client.loadingStatus });
  }
  const state = {
    client, adapter,
    dispose() {
      client.off("values_updated", invalidateLocaleCache);
      const ownsAdapter = client.overrideAdapter === adapter;
      if (ownsAdapter) client.overrideAdapter = originalAdapter;
      if (window[stateKey] === state) delete window[stateKey];
      if (ownsAdapter) publish();
    },
  };
  try {
    client.overrideAdapter = adapter;
    client.on("values_updated", invalidateLocaleCache);
    window[stateKey] = state;
    publish();
  } catch (error) {
    state.dispose();
    throw error;
  }
  return { status: "active", locale: document.documentElement.lang };
}
