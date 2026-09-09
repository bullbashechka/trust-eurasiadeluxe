import Lenis from "lenis";
import { createSectionMotion } from "./company-sections";
import "lenis/dist/lenis.css";
import { animate, createTimeline, stagger, svg } from "animejs";
import {
  companyVisit,
  revealProgress,
  validateCompanyForm,
} from "../data/company-form";

let dispose: (() => void) | undefined;
let mountedBody: HTMLElement | undefined;
const reloadPositionKey = "company:reload-position";
let reloadY: number | undefined;
try {
  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const saved = JSON.parse(sessionStorage.getItem(reloadPositionKey) ?? "null");
  if (navigation?.type === "reload" && saved?.url === location.href && Number.isFinite(saved.y)) {
    reloadY = Math.max(0, saved.y);
  }
} catch { /* Storage is optional. */ }

function mountCompany() {
  if (dispose && mountedBody === document.body) return;
  dispose?.();
  dispose = undefined;
  if (!document.body.classList.contains("company-page")) return;
  mountedBody = document.body;

  const abort = new AbortController();
  const { signal } = abort;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const header = document.querySelector<HTMLElement>("[data-company-header]")!;
  const menu = document.querySelector<HTMLElement>("#company-mobile-menu")!;
  const menuButton = document.querySelector<HTMLButtonElement>(
    ".company-menu-toggle",
  )!;
  const dialog = document.querySelector<HTMLDialogElement>(".company-dialog")!;
  const form = dialog.querySelector<HTMLFormElement>("form")!;
  const name = form.elements.namedItem("name") as HTMLInputElement;
  const phone = form.elements.namedItem("phone") as HTMLInputElement;
  const formContent = dialog.querySelector<HTMLElement>("[data-form-content]")!;
  const success = dialog.querySelector<HTMLElement>("[data-form-success]")!;
  let opener: HTMLElement | null = null;
  let menuOpen = false;
  let lastY = scrollY;
  let accumulated = 0;
  let lastDirection = 0;
  let frame = 0;
  let dead = false;
  let closing = false;
  let lenis: Lenis | undefined;
  const motions: { revert(): unknown }[] = [];
  function fitTitle() {
    document
      .querySelectorAll<HTMLElement>("[data-hero-title]")
      .forEach((span) => {
        span.style.setProperty(
          "--title-scale",
          String((span.parentElement!.clientWidth * 0.96) / span.scrollWidth),
        );
      });
  }
  fitTitle();
  void document.fonts.ready.then(() => {
    if (!dead) fitTitle();
  });
  window.addEventListener("resize", fitTitle, { signal });

  function configureScroll() {
    lenis?.destroy();
    lenis = reduced.matches
      ? undefined
      : new Lenis({ duration: 1.05, smoothWheel: true, syncTouch: false });
    document.documentElement.classList.toggle("company-smooth", !!lenis);
  }
  configureScroll();
  function setLocked() {
    const locked =
      dialog.open ||
      menuOpen ||
      document.documentElement.hasAttribute("data-project-busy");
    document.documentElement.classList.toggle("company-locked", locked);
    if (locked) lenis?.stop();
    else lenis?.start();
  }
  function closeMenu() {
    menuOpen = false;
    menu.hidden = true;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Открыть меню");
    setLocked();
  }
  menuButton.addEventListener(
    "click",
    () => {
      menuOpen = !menuOpen;
      menu.hidden = !menuOpen;
      menuButton.setAttribute("aria-expanded", String(menuOpen));
      menuButton.setAttribute(
        "aria-label",
        menuOpen ? "Закрыть меню" : "Открыть меню",
      );
      header.classList.remove("is-hidden");
      setLocked();
    },
    { signal },
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && menuOpen) {
        closeMenu();
        menuButton.focus();
      }
    },
    { signal },
  );
  window.addEventListener(
    "resize",
    () => {
      if (innerWidth >= 768 && menuOpen) closeMenu();
    },
    { signal },
  );

  function resetErrors() {
    for (const input of [name, phone]) {
      input.removeAttribute("aria-invalid");
      dialog.querySelector<HTMLElement>(`#${input.name}-error`)!.textContent =
        "";
    }
  }
  function openForm(source: HTMLElement) {
    if (dialog.open || closing) return;
    opener = source;
    closeMenu();
    formContent.hidden = false;
    success.hidden = true;
    resetErrors();
    dialog.showModal();
    setLocked();
    name.focus({ preventScroll: true });
    if (!reduced.matches)
      motions.push(
        animate(dialog, {
          opacity: [0, 1],
          translateY: [22, 0],
          duration: 300,
          ease: "outCubic",
        }),
      );
  }
  async function closeForm() {
    if (!dialog.open || closing) return;
    closing = true;
    if (!reduced.matches) {
      const motion = animate(dialog, {
        opacity: 0,
        translateY: 14,
        duration: 180,
        ease: "inQuad",
      });
      motions.push(motion);
      await motion;
    }
    if (dead) return;
    dialog.close();
    dialog.style.removeProperty("opacity");
    dialog.style.removeProperty("transform");
    closing = false;
    setLocked();
    opener?.focus({ preventScroll: true });
  }
  dialog
    .querySelector(".dialog-close")!
    .addEventListener("click", closeForm, { signal });
  success
    .querySelector("button")!
    .addEventListener("click", closeForm, { signal });
  dialog.addEventListener(
    "cancel",
    (event) => {
      event.preventDefault();
      void closeForm();
    },
    { signal },
  );
  let backdropDown = false;
  dialog.addEventListener(
    "pointerdown",
    (event) => {
      backdropDown = event.target === dialog;
    },
    { signal },
  );
  dialog.addEventListener(
    "click",
    (event) => {
      if (backdropDown && event.target === dialog) void closeForm();
    },
    { signal },
  );
  form.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      const result = validateCompanyForm(name.value, phone.value);
      for (const input of [name, phone]) {
        const error = result.errors[input.name as "name" | "phone"];
        dialog.querySelector<HTMLElement>(`#${input.name}-error`)!.textContent =
          error;
        input.setAttribute("aria-invalid", String(!!error));
      }
      if (!result.valid) {
        (result.errors.name ? name : phone).focus();
        return;
      }
      // Intentionally local: no request, browser storage, analytics or submitted values.
      form.reset();
      formContent.hidden = true;
      success.hidden = false;
      success.focus({ preventScroll: true });
      if (!reduced.matches)
        motions.push(
          animate(success, {
            opacity: [0, 1],
            translateY: [12, 0],
            duration: 350,
          }),
        );
    },
    { signal },
  );
  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const trigger = event.target.closest<HTMLElement>("[data-contact-open]");
      if (trigger) {
        event.preventDefault();
        openForm(trigger);
        return;
      }
      const link = event.target.closest<HTMLAnchorElement>('a[href^="#"]');
      if (
        !link ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const destination = document.getElementById(link.hash.slice(1));
      if (!destination) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      closeMenu();
      if (lenis)
        lenis.scrollTo(destination, { offset: -header.offsetHeight - 12 });
      else destination.scrollIntoView({ behavior: "instant" });
      // Replace rather than push: browser Back returns to the previous page, not every section.
      history.replaceState(history.state, "", link.hash);
    },
    { signal, capture: true },
  );
  document.addEventListener("company:lock", setLocked, { signal });

  const pendingReloadY = reloadY;
  reloadY = undefined;
  const restore = companyVisit.returning || pendingReloadY !== undefined;
  companyVisit.returning = false;
  if (restore) {
    const position = pendingReloadY ?? companyVisit.scrollY;
    window.scrollTo({ top: position, behavior: "instant" });
    lenis?.scrollTo(position, { immediate: true });
    lastY = scrollY;
    if (pendingReloadY !== undefined) {
      // A hard reload can initialize the router before fonts and layout settle.
      const loaded = document.readyState === "complete" ? Promise.resolve() : new Promise<void>(resolve => window.addEventListener("load", () => resolve(), { once: true, signal }));
      void Promise.all([loaded, document.fonts.ready]).then(() => {
        if (dead) return;
        fitTitle();
        window.scrollTo({ top: position, behavior: "instant" });
        lenis?.resize();
        lenis?.scrollTo(position, { immediate: true });
        lastY = scrollY;
      });
    }
  }
  const savePosition = () => {
    try {
      sessionStorage.setItem(reloadPositionKey, JSON.stringify({ url: location.href, y: scrollY }));
      // Preserve Astro's index and other navigation metadata.
      history.replaceState({ ...history.state, scrollX, scrollY }, "");
    } catch { /* Browser restoration still works when storage is unavailable. */ }
  };
  window.addEventListener("pagehide", savePosition, { signal });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") savePosition();
  }, { signal });
  const reveals = [
    ...document.querySelectorAll<HTMLElement>("[data-reveal]"),
  ].map((element) => {
    const progress = reduced.matches ? 1 : restore
      ? revealProgress(
          element.getBoundingClientRect().top,
          innerHeight,
          document.documentElement.scrollHeight - innerHeight - scrollY,
        )
      : 0;
    const motion = createSectionMotion(element);
    motions.push(motion);
    motion.seek(progress);
    return { element, progress, motion };
  });
  const blueprint = document.querySelector<SVGSVGElement>(
    ".company-blueprint svg",
  )!;
  const heroMotion = createTimeline({
    autoplay: false,
    defaults: { ease: "outCubic" },
  });
  heroMotion.add(
    ".title-mask",
    {
      translateY: ["40%", "0%"],
      opacity: [0, 1],
      duration: 950,
      delay: stagger(140),
    },
    0,
  );
  // Animate the actual vector geometry, including recessed window frames.
  // Filled faces arrive only after their outlines, never as a static underlay.
  const phases = [
    ["construction", 100], ["arc", 180], ["rear-volume", 450],
    ["facade", 550], ["windows", 850], ["rear-accent", 650],
    ["front-accent", 1100], ["registration", 1600], ["annotations", 1800],
  ] as const;
  for (const [id, start] of phases) {
    const layer = blueprint.querySelector<SVGGElement>(`#${id}`);
    if (!layer) continue;
    const paths = [...layer.querySelectorAll<SVGPathElement>("path")];
    const outlines = paths.filter(path =>
      !path.hasAttribute("stroke-dasharray") && getComputedStyle(path).stroke !== "none");
    if (outlines.length) heroMotion.add(svg.createDrawable(outlines), {
      draw: ["0 0", "0 1"], duration: 900,
      delay: stagger(Math.min(16, 450 / outlines.length)), ease: "inOutSine",
    }, start);
    paths.filter(path => path.hasAttribute("fill") && path.getAttribute("fill") !== "none")
      .forEach((path, index) => heroMotion.add(path, {
        fillOpacity: [0, Number(path.getAttribute("fill-opacity") ?? 1)],
        duration: 650, ease: "inOutSine",
      }, start + 950 + Math.min(index * 6, 300)));
    const details = layer.querySelectorAll("text, circle, path[stroke-dasharray]");
    details.forEach(detail => heroMotion.add(detail, {
      opacity: [0, Number(detail.getAttribute("opacity") ?? 1)], duration: 550,
    }, start));
  }
  motions.push(heroMotion);
  if (restore || reduced.matches) heroMotion.seek(heroMotion.duration);
  else {
    // Explicitly initialize delayed fills before revealing the SVG. Timeline
    // children scheduled later must not retain their static SVG fill on frame 1.
    blueprint.querySelectorAll<SVGPathElement>('path[fill]:not([fill="none"])').forEach(path => {
      if (!path.closest('defs')) path.style.fillOpacity = '0';
    });
    heroMotion.seek(0);
    heroMotion.play();
  }
  const blueprintContainer = blueprint.parentElement!;
  blueprintContainer.style.visibility = 'visible';
  blueprintContainer.removeAttribute('data-blueprint-pending');
  companyVisit.visited = true;

  let previousTime = 0;
  function tick(time: number) {
    if (dead) return;
    lenis?.raf(time);
    const delta = Math.min(64, time - previousTime || 16);
    previousTime = time;
    const locked =
      document.documentElement.classList.contains("company-locked");
    if (!locked) {
      const movement = scrollY - lastY;
      const direction = Math.sign(movement);
      if (direction && direction !== lastDirection) accumulated = 0;
      accumulated += movement;
      if (direction) lastDirection = direction;
      if (scrollY < 60) header.classList.remove("is-hidden");
      else if (Math.abs(accumulated) > 14)
        header.classList.toggle("is-hidden", accumulated > 0);
      lastY = scrollY;
    }
    for (const item of reveals) {
      const target = reduced.matches || item.element.contains(document.activeElement)
        ? 1
        : revealProgress(
            item.element.getBoundingClientRect().top,
            innerHeight,
            Math.max(
              0,
              document.documentElement.scrollHeight - innerHeight - scrollY,
            ),
          );
      item.progress += (target - item.progress) * (1 - Math.exp(-delta / 140));
      if (Math.abs(target - item.progress) < 0.001) item.progress = target;
      item.motion.seek(item.progress);
    }
    frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);
  reduced.addEventListener(
    "change",
    () => {
      configureScroll();
      if (reduced.matches) {
        heroMotion.pause();
        heroMotion.seek(heroMotion.duration);
        reveals.forEach((item) => {
          item.progress = 1;
          item.motion.seek(1);
        });
      }
      setLocked();
    },
    { signal },
  );
  dispose = () => {
    savePosition();
    dead = true;
    mountedBody = undefined;
    companyVisit.scrollY = scrollY;
    abort.abort();
    cancelAnimationFrame(frame);
    lenis?.destroy();
    motions.forEach((motion) => motion.revert());
    document.documentElement.classList.remove(
      "company-smooth",
      "company-locked",
    );
  };
}

document.addEventListener("astro:before-swap", () => {
  dispose?.();
  dispose = undefined;
});
document.addEventListener("astro:page-load", mountCompany);
window.addEventListener("pagehide", () => {
  dispose?.();
  dispose = undefined;
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    companyVisit.returning = true;
    mountCompany();
  }
});
mountCompany();
