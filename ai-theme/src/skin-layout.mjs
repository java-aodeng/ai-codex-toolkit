// 此函数会序列化到 renderer 中运行，不能依赖模块外部变量。
export function startSkinLayout() {
  const property = '--heige-thread-clip-bottom';
  const records = new Map();
  const observed = new Set();
  let frame = 0;
  let disposed = false;

  function restore(element, record) {
    if (record.value) element.style.setProperty(property, record.value, record.priority);
    else element.style.removeProperty(property);
  }

  function update() {
    frame = 0;
    if (disposed) return;
    const active = new Set();
    const targets = new Set();
    const measurements = [];
    for (const scroll of document.querySelectorAll('.thread-scroll-container')) {
      const footer = scroll.querySelector(':scope > [data-thread-scroll-footer="true"]');
      const content = [...scroll.children].find(child =>
        child.querySelector(':scope > [data-thread-user-message-navigation-content]'));
      if (!footer || !content) continue;
      active.add(content);
      targets.add(scroll);
      targets.add(footer);
      const surface = footer.querySelector('[data-codex-composer-root] [data-composer-surface-variant]') || footer;
      targets.add(surface);
      targets.add(content);
      if (!records.has(content)) records.set(content, {
        value: content.style.getPropertyValue(property),
        priority: content.style.getPropertyPriority(property),
      });
      const body = content.getBoundingClientRect();
      const input = surface.getBoundingClientRect();
      // 贴着输入框实际顶边裁切，不额外预留空隙。
      const bottom = input.height > 0 && body.width > 0
        ? Math.min(body.height, Math.max(0, body.bottom - input.top)) : 0;
      measurements.push([content, bottom.toFixed(2) + 'px']);
    }
    for (const [element, record] of records) {
      if (!active.has(element)) {
        restore(element, record);
        records.delete(element);
      }
    }
    for (const element of observed) {
      if (!targets.has(element)) {
        resizeObserver.unobserve(element);
        observed.delete(element);
      }
    }
    for (const element of targets) {
      if (!observed.has(element)) {
        observed.add(element);
        resizeObserver.observe(element);
      }
    }
    for (const [element, value] of measurements) {
      if (element.style.getPropertyValue(property) !== value) element.style.setProperty(property, value);
    }
  }

  function schedule() {
    if (!disposed && !frame) frame = requestAnimationFrame(update);
  }

  const resizeObserver = new ResizeObserver(schedule);
  // 处理新消息、切换任务、打开侧边聊天；不监听自身写入的 style 属性。
  const mutationObserver = new MutationObserver(schedule);
  mutationObserver.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
  document.addEventListener('scroll', schedule, { capture: true, passive: true });
  window.addEventListener('resize', schedule);
  update();

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    document.removeEventListener('scroll', schedule, true);
    window.removeEventListener('resize', schedule);
    for (const [element, record] of records) restore(element, record);
    records.clear();
    observed.clear();
  };
}
