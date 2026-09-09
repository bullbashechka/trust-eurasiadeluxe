import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "lenis/dist/lenis.css";

let instance: Lenis | undefined;
let dispose: (() => void) | undefined;
let mountedBody: HTMLElement | undefined;

export function scrollPageTo(top: number, immediate = false) {
  if (instance) {
    instance.resize();
    instance.scrollTo(top, { immediate });
  } else {
    window.scrollTo({ top, behavior: immediate ? "instant" : "smooth" });
  }
}

export function mountSmoothScroll() {
  if (dispose && mountedBody === document.body) return;
  dispose?.();
  // The company page already owns a Lenis loop coupled to its animations.
  if (document.body.classList.contains("company-page")) return;
  mountedBody = document.body;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const abort = new AbortController();
  let frame = 0;
  let locked = false;
  const syncLock = () => {
    locked = !!document.querySelector("dialog[open]") || document.documentElement.hasAttribute("data-project-busy");
    document.documentElement.classList.toggle("site-scroll-locked", locked);
    if (locked) instance?.stop();
    else instance?.start();
  };
  const configure = () => {
    instance?.destroy();
    instance = reduced.matches ? undefined : new Lenis({
      duration: 1.05,
      smoothWheel: true,
      syncTouch: false,
      allowNestedScroll: true,
      prevent: node => !!node.closest("dialog"),
    });
    instance?.on("scroll", () => ScrollTrigger.update());
    syncLock();
  };
  configure();
  reduced.addEventListener("change", configure, { signal: abort.signal });
  const observer = new MutationObserver(syncLock);
  observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-project-busy"] });
  const tick = (time: number) => {
    instance?.raf(time);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  window.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || !(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>("a[href]");
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
    let target: HTMLElement | null;
    try { target = document.getElementById(decodeURIComponent(url.hash.slice(1))); }
    catch { return; }
    if (!target || target instanceof HTMLDialogElement) return;
    event.preventDefault();
    // Menu close and tour skip handlers run first on document.
    syncLock();
    if (locked) return;
    if (location.hash !== url.hash) history.pushState(null, "", url.hash);
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    scrollPageTo(target.getBoundingClientRect().top + scrollY - margin - padding, reduced.matches);
    if (link.classList.contains("skip-link")) {
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  }, { signal: abort.signal });
  dispose = () => {
    abort.abort();
    observer.disconnect();
    cancelAnimationFrame(frame);
    instance?.destroy();
    instance = undefined;
    document.documentElement.classList.remove("site-scroll-locked");
    mountedBody = undefined;
    dispose = undefined;
  };
}

export function unmountSmoothScroll() { dispose?.(); }
