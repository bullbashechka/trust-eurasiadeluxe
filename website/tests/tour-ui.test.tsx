import { test, expect, beforeEach, afterEach, mock } from "bun:test";
import { Window } from "happy-dom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

let scrollUpdate: ((self: { progress: number }) => void) | undefined;
let reduced = false;
let near: ((entries: { isIntersecting: boolean }[]) => void) | undefined;
let currentWindow: Window;
let root: Root;
let container: HTMLDivElement;
const controller = { start: 100, end: 900, refresh() {}, kill() {} };
mock.module("gsap", () => ({ gsap: { registerPlugin() {} } }));
mock.module("gsap/ScrollTrigger", () => ({
  ScrollTrigger: {
    create(options: { onUpdate: typeof scrollUpdate }) {
      scrollUpdate = options.onUpdate;
      return controller;
    },
    refresh() {},
  },
}));
const { default: ApartmentTour } =
  await import("../src/components/ApartmentTour");
const { apartments } = await import("../src/data/apartments");

beforeEach(() => {
  currentWindow = new Window({ url: "http://localhost:4323" });
  Object.assign(globalThis, {
    window: currentWindow,
    document: currentWindow.document,
    navigator: currentWindow.navigator,
    HTMLElement: currentWindow.HTMLElement,
    HTMLVideoElement: currentWindow.HTMLVideoElement,
    IS_REACT_ACT_ENVIRONMENT: true,
    requestAnimationFrame: (callback: () => void) => setTimeout(callback, 0),
    cancelAnimationFrame: (id: ReturnType<typeof setTimeout>) =>
      clearTimeout(id),
    matchMedia: (query: string) => ({
      matches: query.includes("reduce") && reduced,
      addEventListener() {},
      removeEventListener() {},
    }),
    IntersectionObserver: class {
      constructor(callback: typeof near) {
        near = callback;
      }
      observe() {}
      disconnect() {}
    },
  });
  currentWindow.scrollTo = () => {};
  currentWindow.HTMLMediaElement.prototype.play = async function () {
    return;
  };
  currentWindow.HTMLMediaElement.prototype.pause = function () {};
  container = currentWindow.document.createElement(
    "div",
  ) as unknown as HTMLDivElement;
  currentWindow.document.body.appendChild(container as never);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  await currentWindow.happyDOM.abort();
  reduced = false;
});
async function mount() {
  await act(async () =>
    root.render(<ApartmentTour scenes={apartments[0].scenes} area="36,67" />),
  );
}
async function enter() {
  await act(async () => near?.([{ isIntersecting: true }]));
}
async function click(text: string) {
  const button = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent?.includes(text),
  );
  expect(button).toBeDefined();
  await act(async () => {
    button!.click();
    await new Promise((r) => setTimeout(r, 5));
  });
}
async function startTour() {
  await click("Начать прогулку");
}

test("videos load near the tour, bounded to current and neighboring scenes", async () => {
  await mount();
  expect(container.querySelectorAll("video").length).toBe(0);
  await enter();
  expect(container.querySelectorAll("video").length).toBe(2);
  await act(async () => container.querySelector("video")?.dispatchEvent(new currentWindow.Event("loadeddata") as unknown as Event));
  await startTour();
  await act(async () => scrollUpdate?.({ progress: 0.45 }));
  expect(container.querySelectorAll("video").length).toBe(3);
  await act(async () => near?.([{ isIntersecting: false }]));
  expect(container.querySelectorAll("video").length).toBe(0);
});

test("reduced motion starts with photographs and does not download videos", async () => {
  reduced = true;
  await mount();
  await enter();
  expect(container.querySelector("section")?.dataset.mode).toBe("photos");
  expect(container.querySelectorAll("video").length).toBe(0);
  expect(container.querySelector("section")?.style.height).toBe("auto");
});

test("failed media retains poster, provides retry, then photograph fallback", async () => {
  await mount();
  await enter();
  const first = container.querySelector("video")!;
  await act(async () =>
    first.dispatchEvent(new currentWindow.Event("error") as unknown as Event),
  );
  expect(container.textContent).toContain("Видео не загрузилось");
  expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
  await click("Повторить");
  expect(container.textContent).not.toContain("Видео не загрузилось");
  expect(container.querySelectorAll("video").length).toBe(2);
  await act(async () =>
    container
      .querySelector("video")!
      .dispatchEvent(new currentWindow.Event("error") as unknown as Event),
  );
  await click("Смотреть фотографии");
  expect(container.querySelector("section")?.dataset.mode).toBe("photos");
  expect(container.querySelectorAll("video").length).toBe(0);
});

test("normal playback mode preserves selected scene and can return to scroll", async () => {
  await mount();
  await enter();
  await act(async () => container.querySelector("video")?.dispatchEvent(new currentWindow.Event("loadeddata") as unknown as Event));
  await startTour();
  await act(async () => scrollUpdate?.({ progress: 0.3 }));
  expect(container.querySelector("h3")?.textContent).toBe("Гостиная");
  await click("Обычное воспроизведение");
  expect(container.querySelector("section")?.dataset.mode).toBe("play");
  expect(container.querySelector("h3")?.textContent).toBe("Гостиная");
  await click("Управлять прокруткой");
  expect(container.querySelector("section")?.dataset.mode).toBe("scroll");
});
