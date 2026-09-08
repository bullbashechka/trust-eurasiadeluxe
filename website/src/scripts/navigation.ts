import { gsap } from "gsap";
const overlay = document.querySelector<HTMLElement>(".cloud-transition");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
let navigating = false;
function reset() {
  navigating = false;
  if (overlay)
    gsap.set(overlay, {
      autoAlpha: 0,
      pointerEvents: "none",
      backgroundColor: "rgba(245,243,237,0)",
    });
}
// Session marker spans ordinary document navigation and preserves normal browser history.
try {
  const target = sessionStorage.getItem("eurasia-transition");
  sessionStorage.removeItem("eurasia-transition");
  if (target === location.pathname && overlay && !reduced.matches) {
    gsap.set(overlay, { autoAlpha: 1, backgroundColor: "#f5f3ed" });
    gsap.set(overlay.querySelector("span"), { opacity: 1 });
    gsap.to(overlay, {
      autoAlpha: 0,
      duration: 0.65,
      delay: 0.08,
      onComplete: reset,
    });
    gsap.to(overlay.querySelectorAll(".mist"), {
      scale: 1.3,
      xPercent: (i) => (i % 2 ? 25 : -25),
      duration: 0.7,
    });
  }
} catch {
  reset();
}
window.addEventListener("pageshow", (event) => {
  if (event.persisted) reset();
});
window.addEventListener("pagehide", () => {
  navigating = false;
});
document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest<HTMLAnchorElement>("a[data-cloud]");
  if (
    !link ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    link.target === "_blank" ||
    reduced.matches ||
    !overlay
  )
    return;
  const target = new URL(link.href);
  if (target.origin !== location.origin) return;
  event.preventDefault();
  if (navigating) return;
  navigating = true;
  gsap.set(overlay, { autoAlpha: 1, pointerEvents: "auto" });
  gsap.set(overlay.querySelectorAll(".mist"), {
    scale: 1.3,
    xPercent: (i) => (i % 2 ? 65 : -65),
    opacity: 0,
  });
  const go = () => {
    try {
      sessionStorage.setItem("eurasia-transition", target.pathname);
    } catch {
      /* navigation works without storage */
    }
    location.assign(target.href);
  };
  gsap
    .timeline({ onComplete: go })
    .to(
      overlay.querySelectorAll(".mist"),
      {
        xPercent: 0,
        opacity: 1,
        scale: 1,
        duration: 0.52,
        stagger: 0.04,
        ease: "power2.out",
      },
      0,
    )
    .to(overlay, { backgroundColor: "#f5f3ed", duration: 0.2 }, 0.35)
    .to(overlay.querySelector("span"), { opacity: 1, duration: 0.2 }, 0.35);
  // Recover the current page if navigation is cancelled or fails.
  window.setTimeout(reset, 4000);
});
