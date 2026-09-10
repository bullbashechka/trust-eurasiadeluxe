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
  const section = container.querySelector("section")!;
  section.getBoundingClientRect = () => ({ top: 0, bottom: 600, height: 600, left: 0, right: 1000, width: 1000, x: 0, y: 0, toJSON() {} });
  await act(async () => currentWindow.dispatchEvent(new currentWindow.Event("scroll")));
  expect(section.dataset.ready).toBe("true");
  expect(container.querySelector(".tour-start")).toBeNull();
}

test("a neighboring video cannot unlock an unready current scene", async () => {
  await mount();
  await enter();
  await act(async () => container.querySelectorAll("video")[1].dispatchEvent(new currentWindow.Event("loadeddata") as unknown as Event));
  expect(container.querySelector(".tour-start")).toBeNull();
  await act(async () => container.querySelector("video")!.dispatchEvent(new currentWindow.Event("loadeddata") as unknown as Event));
  await startTour();
});

test("late loading starts the tour automatically after reaching its viewport", async () => {
  await mount();
  await enter();
  const section = container.querySelector("section")!;
  expect(section.style.height).toContain("420svh");
  const reservedHeight = section.style.height;
  section.getBoundingClientRect = () => ({ top: -20, bottom: 580, height: 600, left: 0, right: 1000, width: 1000, x: 0, y: -20, toJSON() {} });
  await act(async () => container.querySelector("video")!.dispatchEvent(new currentWindow.Event("loadeddata") as unknown as Event));
  expect(section.dataset.ready).toBe("true");
  expect(section.style.height).toBe(reservedHeight);
  expect(container.querySelector(".tour-start")).toBeNull();
});

test("short screens use playback without an extended scroll section", async () => {
  currentWindow.innerHeight = 390;
  await mount();
  expect(container.querySelector("section")?.dataset.mode).toBe("play");
  expect(container.querySelector("section")?.dataset.compact).toBe("true");
  expect(container.querySelector("section")?.style.height).toBe("auto");
  expect(container.querySelector<HTMLButtonElement>(".tour-control")?.hidden).toBe(true);
});

test("mobile tour uses compact playback and room controls", async () => {
  currentWindow.innerWidth = 390;
  currentWindow.innerHeight = 800;
  await mount();
  await enter();
  const section = container.querySelector("section")!;
  expect(section.dataset.mode).toBe("play");
  expect(section.dataset.mobile).toBe("true");
  expect(section.style.height).toBe("auto");

  const previous = container.querySelector<HTMLButtonElement>('[aria-label="Предыдущая сцена"]')!;
  const next = container.querySelector<HTMLButtonElement>('[aria-label="Следующая сцена"]')!;
  const toggle = container.querySelector<HTMLButtonElement>('[aria-label="Воспроизвести"]')!;
  expect(previous.disabled).toBe(true);
  expect(next.disabled).toBe(false);

  await act(async () => next.click());
  expect(container.querySelector(".tour-mobile-topline .tour-counter")?.textContent).toBe("02 / 8");
  const livingRoom = Array.from(container.querySelectorAll<HTMLButtonElement>(".tour-mobile-chapters button")).find(button => button.textContent === "Гостиная")!;
  await act(async () => livingRoom.click());
  expect(container.querySelector(".tour-mobile-topline .tour-counter")?.textContent).toBe("03 / 8");

  await act(async () => toggle.click());
  expect(container.querySelector('[aria-label="Пауза"]')).not.toBeNull();
});

test("mobile plan control pauses playback and opens the existing dialog", async () => {
  currentWindow.innerWidth = 390;
  await act(async () => root.render(<ApartmentTour scenes={apartments[0].scenes} area="36,67" plan={apartments[0].plan}/>));
  await enter();
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Воспроизвести"]')!.click());
  expect(container.querySelector('[aria-label="Пауза"]')).not.toBeNull();
  await act(async () => container.querySelector<HTMLButtonElement>(".tour-mobile-topline button")!.click());
  expect(container.querySelector("dialog")?.open).toBe(true);
  expect(container.querySelector('[aria-label="Воспроизвести"]')).not.toBeNull();
});

test("opening a plan pauses playback and closing restores the opener", async () => {
  await act(async () => root.render(<ApartmentTour scenes={apartments[0].scenes} area="36,67" plan={apartments[0].plan}/>));
  await enter();
  await click("Обычное воспроизведение");
  await click("Смотреть");
  expect(container.textContent).toContain("Пауза");
  await click("Планировка");
  expect(container.querySelector("dialog")?.open).toBe(true);
  expect(container.textContent).not.toContain("Пауза");
  await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Закрыть планировку"]')!.click());
  expect(container.querySelector("dialog")?.open).toBe(false);
  expect(document.activeElement?.textContent).toBe("Планировка");
});

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
  const retry = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Повторить загрузку"),
  );
  expect(retry?.disabled).toBe(false);
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

test("photograph mode remains available before a media failure", async () => {
  await mount();
  await enter();
  await click("Смотреть фотографии");
  expect(container.querySelector("section")?.dataset.mode).toBe("photos");
  expect(container.querySelectorAll("video").length).toBe(0);
  await click("Вернуться к видео");
  expect(container.querySelector("section")?.dataset.mode).toBe("play");
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
