import { navigate } from "astro:transitions/client";
import { animate } from "animejs";
import { companyVisit } from "../data/company-form";
import { abortable, fetchProjectHTML } from "../data/company-navigation";

type Phase = "idle" | "covering" | "preparing" | "revealing";
let phase: Phase = "idle";
let activeController: AbortController | undefined;
let curtainMotion: ReturnType<typeof animate> | undefined;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const curtain = () => document.querySelector<HTMLElement>("#project-curtain");
const errorBox = () => document.querySelector<HTMLElement>(".project-error");
function busy(value: boolean) {
  document.documentElement.toggleAttribute("data-project-busy", value);
  document.dispatchEvent(new Event("company:lock"));
}
function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

async function reveal(controller: AbortController) {
  if (activeController !== controller) return;
  const panel = curtain();
  if (panel && phase !== "idle") {
    phase = "revealing";
    curtainMotion = animate(panel, {
      translateX: "100%",
      duration: reduced.matches ? 0 : 650,
      ease: "inOutQuart",
    });
    await curtainMotion;
    if (activeController !== controller) return;
    panel.style.visibility = "hidden";
  }
  phase = "idle";
  busy(false);
}

async function openProject(source?: Element) {
  if (phase !== "idle") return;
  const panel = curtain();
  if (!panel) {
    location.assign("/eurasia-deluxe/");
    return;
  }
  errorBox()!.hidden = true;
  phase = "covering";
  companyVisit.scrollY = scrollY;
  busy(true);
  activeController = new AbortController();
  const controller = activeController;
  const deadline = window.setTimeout(
    () => controller.abort(new Error("Project loading timed out")),
    15000,
  );
  try {
    const photo = panel.querySelector("img")!;
    await abortable(photo.decode(), controller.signal);
    panel.style.visibility = "visible";
    curtainMotion = animate(panel, {
      translateX: ["100%", "0%"],
      duration: reduced.matches ? 0 : 650,
      ease: "inOutQuart",
    });
    await abortable(Promise.resolve(curtainMotion), controller.signal);
    controller.signal.throwIfAborted();
    phase = "preparing";
    const ready = new Promise<void>((resolve) =>
      document.addEventListener("astro:page-load", () => resolve(), {
        once: true,
        signal: controller.signal,
      }),
    );
    await navigate("/eurasia-deluxe/", {
      sourceElement: source,
      info: { companyCurtain: true },
    });
    await abortable(ready, controller.signal);
    await abortable(document.fonts.ready, controller.signal);
    await nextFrame();
    await nextFrame();
    await reveal(controller);
  } catch {
    if (activeController !== controller) return;
    curtainMotion?.cancel();
    await reveal(controller);
    if (activeController !== controller) return;
    const box = errorBox();
    if (box) {
      box.hidden = false;
      box
        .querySelector<HTMLButtonElement>("button")
        ?.focus({ preventScroll: true });
    }
  } finally {
    clearTimeout(deadline);
    controller.abort();
    if (activeController === controller) activeController = undefined;
  }
}

/** Prepare the entire destination before Astro swaps it, without its hard-navigation error fallback. */
document.addEventListener("astro:before-preparation", (event) => {
  const e = event;
  if (
    e.to.pathname === "/" &&
    e.from.pathname === "/eurasia-deluxe/" &&
    companyVisit.visited
  )
    companyVisit.returning = true;
  if (!e.info?.companyCurtain) {
    if (phase !== "idle") resetTransition();
    return;
  }
  e.loader = async () => {
    const signal = AbortSignal.any([e.signal, activeController!.signal]);
    const next = new DOMParser().parseFromString(
      await fetchProjectHTML(e.to, signal),
      "text/html",
    );
    if (
      !next.querySelector("main") ||
      !next.querySelector('[name="astro-view-transitions-enabled"]')
    )
      throw new Error("Invalid project document");
    const styles = [
      ...next.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
    ].map((link) => {
      const href = new URL(link.getAttribute("href")!, e.to).href;
      if ([...document.styleSheets].some((sheet) => sheet.href === href))
        return Promise.resolve();
      return abortable(
        new Promise<void>((resolve, reject) => {
          const preload = document.createElement("link");
          preload.rel = "preload";
          preload.as = "style";
          preload.href = href;
          preload.onload = () => {
            preload.remove();
            resolve();
          };
          preload.onerror = () => {
            preload.remove();
            reject(new Error("Styles unavailable"));
          };
          signal.addEventListener("abort", () => preload.remove(), {
            once: true,
          });
          document.head.append(preload);
        }),
        signal,
      );
    });
    const hero = next.querySelector<HTMLImageElement>(".project-hero-v2 img");
    const heroReady = hero
      ? (() => {
          const image = new Image();
          image.src = new URL(hero.getAttribute("src")!, e.to).href;
          return abortable(image.decode(), signal);
        })()
      : Promise.resolve();
    await Promise.all([...styles, heroReady]);
    signal.throwIfAborted();
    next.querySelectorAll("noscript").forEach((node) => node.remove());
    e.newDocument = next;
  };
});

document.addEventListener("astro:after-swap", () => {
  if (phase !== "idle") busy(true);
});
document.addEventListener(
  "click",
  (event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest("[data-project-dismiss]")) {
      errorBox()!.hidden = true;
      return;
    }
    if (event.target.closest("[data-project-retry]")) {
      void openProject();
      return;
    }
    const link = event.target.closest<HTMLAnchorElement>(
      "a[data-project-transition]",
    );
    if (
      !link ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      link.target === "_blank" ||
      link.hasAttribute("download")
    )
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void openProject(link);
  },
  { capture: true },
);
function resetTransition() {
  const controller = activeController;
  activeController = undefined;
  controller?.abort();
  curtainMotion?.cancel();
  curtainMotion = undefined;
  phase = "idle";
  const panel = curtain();
  if (panel) {
    panel.style.visibility = "hidden";
    panel.style.transform = "translateX(100%)";
  }
  busy(false);
}
reduced.addEventListener("change", () => {
  if (reduced.matches) curtainMotion?.complete();
});
window.addEventListener("pagehide", resetTransition);
window.addEventListener("pageshow", (event) => {
  if (event.persisted) resetTransition();
});
