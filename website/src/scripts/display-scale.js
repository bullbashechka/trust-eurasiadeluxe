// The browser exposes DPR, not absolute page zoom. Remember this tab's initial
// DPR per screen; never assume that a HiDPI / Windows-scaled screen starts at 1.
(() => {
  if (window.__eurasiaDisplayScale) return;
  window.__eurasiaDisplayScale = true;
  const key = 'eurasia-display-baseline-v1';
  let baselines = {};
  const mediaQueries = new WeakMap();
  try { baselines = JSON.parse(sessionStorage.getItem(key) || '{}') || {}; } catch {}
  if (typeof baselines !== 'object' || Array.isArray(baselines)) baselines = {};
  function update() {
    const screenKey = `${screen.width}x${screen.height}`;
    const dpr = window.devicePixelRatio || 1;
    if (!(Number.isFinite(baselines[screenKey]) && baselines[screenKey] > 0)) {
      baselines[screenKey] = dpr;
      try { sessionStorage.setItem(key, JSON.stringify(baselines)); } catch {}
    }
    const scale = Math.max(1, baselines[screenKey] / dpr);
    document.documentElement.style.setProperty('--display-scale', String(scale));
    document.documentElement.style.zoom = String(scale);
    // Media queries use the unscaled viewport. Move their width thresholds by
    // the same factor so zooming out cannot accidentally switch to desktop UI.
    function adjustRules(rules) {
      for (const rule of rules) {
        if (rule.type === 4) {
          if (!mediaQueries.has(rule)) mediaQueries.set(rule, rule.conditionText);
          rule.media.mediaText = mediaQueries.get(rule).replace(
            /((?:min|max)-width\s*:\s*)([\d.]+)(px|em|rem)/g,
            (_, prefix, value, unit) => `${prefix}${Number(value) * scale}${unit}`,
          );
        }
        if (rule.cssRules) adjustRules(rule.cssRules);
      }
    }
    for (const sheet of document.styleSheets) {
      try { adjustRules(sheet.cssRules); } catch { /* Cross-origin CSS stays native. */ }
    }
  }
  update();
  window.addEventListener('resize', update);
  window.addEventListener('load', update);
  document.addEventListener('DOMContentLoaded', update);
  document.addEventListener('astro:after-swap', update);
  document.addEventListener('astro:page-load', update);
})();
