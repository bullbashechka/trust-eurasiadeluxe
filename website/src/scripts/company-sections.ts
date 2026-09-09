import { gsap } from "gsap";

/** Paused compositions driven by the page's single smooth-scroll loop.
 * Keep trigger boxes stationary, including while playing backwards.
 */
export function createSectionMotion(element: HTMLElement) {
  const timeline = gsap.timeline({ paused: true, defaults: { ease: "power2.out", duration: 1 } });
  const context = gsap.context(() => {
    const headings = element.querySelectorAll(".company-heading > span, .company-heading:not(:has(> span))");
    const rules = element.querySelectorAll(".terracotta-rule, .company-eyebrow > span");
    const copy = element.querySelectorAll(".about-copy, .company-side-note, .company-project-copy > .company-eyebrow");
    // Clip instead of replacing the deliberately condensed type's transform.
    if (headings.length) timeline.fromTo(headings,
      { clipPath: "inset(100% 0% 0% 0%)", opacity: 0 },
      { clipPath: "inset(0% 0% 0% 0%)", opacity: 1, stagger: 0.13 }, 0);
    if (rules.length) timeline.fromTo(rules, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 0.7 }, 0.2);
    if (copy.length) timeline.fromTo(copy, { y: 22, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08 }, 0.25);

    if (element.classList.contains("about-image")) {
      timeline.fromTo(element, { clipPath: "inset(0% 100% 0% 0% round 9px)" },
        { clipPath: "inset(0% 0% 0% 0% round 9px)", duration: 1.3 }, 0);
      timeline.fromTo(element.querySelector("img"), { scale: 1.14 }, { scale: 1, duration: 1.5 }, 0);
    }
    if (element.classList.contains("advantage-card")) {
      const index = Array.from(element.parentElement!.children).indexOf(element);
      // Individual triggers keep the vertical mobile cards independent.
      const delay = innerWidth / (Number(document.documentElement.style.zoom) || 1) >= 768 ? index * 0.12 : 0;
      timeline.fromTo(element, { clipPath: "inset(100% 0% 0% 0% round 10px)" },
        { clipPath: "inset(0% 0% 0% 0% round 10px)", duration: 0.85 }, delay);
      timeline.fromTo(element.querySelectorAll("h3, p"), { y: 30, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.12 }, delay + 0.18);
      const path = element.querySelector<SVGPathElement>("svg path");
      if (path) {
        const length = path.getTotalLength();
        timeline.fromTo(path, { strokeDasharray: length, strokeDashoffset: length },
          { strokeDashoffset: 0, duration: 1.1, ease: "none" }, delay + 0.1);
      }
      // Equal duration means the desktop cards genuinely arrive in sequence.
      timeline.to({}, { duration: 0.01 }, 1.65);
    }
    const project = element.querySelector(".company-project-image");
    if (project) timeline.fromTo(project,
      { clipPath: "inset(0% 100% 0% 0% round 10px)" },
      { clipPath: "inset(0% 0% 0% 0% round 10px)", duration: 1.3 }, 0);
    const buttons = element.querySelectorAll(".company-button");
    if (buttons.length) timeline.fromTo(buttons, { x: 28, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.8 }, 0.35);
    const eyebrow = element.querySelector(":scope > .company-eyebrow");
    if (eyebrow) timeline.fromTo(eyebrow, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0);
  }, element);
  return {
    seek(progress: number) { timeline.progress(progress); },
    revert() { context.revert(); timeline.kill(); },
  };
}
