import { afterAll, expect, test } from "bun:test";
import { Window } from "happy-dom";

// Run separately from tour-ui, which mocks GSAP's module globally.
const page = new Window();
Object.assign(globalThis, {
  window: page,
  document: page.document,
  getComputedStyle: page.getComputedStyle.bind(page),
  innerWidth: 1440,
  requestAnimationFrame: page.requestAnimationFrame.bind(page),
  cancelAnimationFrame: page.cancelAnimationFrame.bind(page),
});
const { createSectionMotion } = await import("../src/scripts/company-sections");
const { gsap } = await import("gsap");

afterAll(() => {
  gsap.ticker.sleep();
  page.happyDOM.abort();
});

test("library SVG shapes reveal together and cleanup restores existing styles", () => {
  page.document.body.innerHTML = `<div><article class="advantage-card" style="color: red">
    <svg><rect width="10" height="10"></rect><line x1="0" x2="10"></line></svg>
    <h3>Architecture</h3><p>Details</p></article></div>`;
  const card = page.document.querySelector("article")!;
  const icon = card.querySelector("svg")!;
  const motion = createSectionMotion(card as unknown as HTMLElement);
  motion.seek(0);
  expect(Number(icon.style.opacity)).toBe(0);
  motion.seek(1);
  expect(Number(icon.style.opacity)).toBe(1);
  expect(card.querySelector("h3")!.style.opacity).toBe("1");
  motion.revert();
  expect(card.style.color).toBe("red");
  expect(card.style.clipPath).toBe("");
  expect(icon.style.opacity).toBe("");
  expect(icon.style.transform).toBe("");
});

test("rebuilding after a breakpoint change preserves completed content", () => {
  const card = page.document.querySelector("article")!;
  let motion = createSectionMotion(card as unknown as HTMLElement);
  motion.seek(1);
  motion.revert();
  Object.assign(globalThis, { innerWidth: 390 });
  motion = createSectionMotion(card as unknown as HTMLElement);
  motion.seek(1);
  expect(card.querySelector("h3")!.style.opacity).toBe("1");
  expect(card.querySelector("svg")!.style.opacity).toBe("1");
  motion.revert();
});
