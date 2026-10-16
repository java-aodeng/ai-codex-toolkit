// 此函数会序列化到页面执行；只检查资源和背景层，不修改应用布局。
export async function inspectThemeAppearance(themeId, styleId, heroDataUrl) {
  const previous = window.__heigeCodexThemeHealth;
  const hero = heroDataUrl ?? (previous?.themeId === themeId ? previous.hero : null);
  const result = (status, reason) => ({ status, reason });
  if (document.documentElement.dataset.heigeCodexSkin !== themeId ||
      !document.getElementById(styleId)?.textContent || !hero) {
    return result("missing", "主题样式或标记已丢失");
  }
  if (previous?.hero !== hero || !previous.decoded) {
    const image = new Image();
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => { image.src = ""; reject(new Error("图片加载超时")); }, 3000);
        image.onload = () => { clearTimeout(timer); resolve(); };
        image.onerror = () => { clearTimeout(timer); reject(new Error("图片无法解码")); };
        image.src = hero;
      });
      if (!image.naturalWidth || !image.naturalHeight) throw new Error("图片尺寸无效");
    } catch (error) {
      return result("invalid", `壁纸资源不可用：${error.message}`);
    }
  }
  window.__heigeCodexThemeHealth = { themeId, hero, decoded: true };
  const hosts = [...document.querySelectorAll("#root, [data-app-shell-frame]")];
  if (!hosts.some((element) => getComputedStyle(element).backgroundImage.includes(hero))) {
    return result("missing", "壁纸背景规则未生效或被覆盖");
  }
  if (document.visibilityState !== "visible") return result("pending", "窗口不可见，背景遮挡检查待窗口显示后进行");
  const main = document.querySelector('[data-app-shell-main-surface="default"]');
  if (!main) return result("pending", "当前页面不是常规会话视图");
  const visible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 &&
      rect.top < innerHeight && rect.left < innerWidth && style.display !== "none" && style.visibility === "visible";
  };
  if (!visible(main) || [...document.querySelectorAll('[aria-modal="true"], [role="dialog"]')].some(visible)) {
    return result("pending", "会话视图隐藏或有弹窗，暂不判断背景遮挡");
  }
  const bounds = main.getBoundingClientRect();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return result("pending", "当前环境无法检测背景透明度");
  for (let element = main; element; element = element.parentElement) {
    const style = getComputedStyle(element);
    if (style.backgroundImage.includes(hero)) return result("ok", "壁纸资源与主背景层检测通过");
    if (style.backgroundImage !== "none" || style.maskImage !== "none" || style.clipPath !== "none" ||
        style.filter !== "none" || style.mixBlendMode !== "normal") {
      return result("pending", "存在额外图层，无法可靠判断壁纸遮挡");
    }
    let opacity = 1;
    for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) opacity *= Number(getComputedStyle(ancestor).opacity);
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = style.backgroundColor;
    context.fillRect(0, 0, 1, 1);
    const rect = element.getBoundingClientRect();
    if (context.getImageData(0, 0, 1, 1).data[3] * opacity >= 250 &&
        rect.left <= bounds.left + 1 && rect.top <= bounds.top + 1 &&
        rect.right >= bounds.right - 1 && rect.bottom >= bounds.bottom - 1) {
      return result("blocked", "主背景被不透明容器遮挡，需要适配当前 Codex 界面");
    }
  }
  return result("pending", "当前视图未找到可确认的壁纸背景层");
}
