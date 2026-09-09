import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { Window } from 'happy-dom';
import { isSelectionDrag, selectionOffset, wrapSelection } from '../src/scripts/selection-state';

let dragOptions: Record<string, Function>;
let killed = 0;
mock.module('gsap', () => ({ gsap: {
  registerPlugin() {}, killTweensOf() {},
  set(target: any, values: any) {
    for (const item of Array.isArray(target) ? target : [target]) {
      if (values.clearProps) item.style.removeProperty('transform');
      else if ('x' in values) item.style.transform = `translateX(${values.x}px)`;
    }
  },
  to(target: any, values: any) {
    target.position = values.position;
    values.onUpdate?.(); values.onComplete?.();
    return { kill() {} };
  },
} }));
mock.module('gsap/Draggable', () => ({ Draggable: {
  create(_proxy: unknown, options: Record<string, Function>) {
    dragOptions = options;
    return [{ kill() { killed++; } }];
  },
} }));
const { mountApartmentSelection } = await import('../src/scripts/apartment-selection');
let browser: Window;
let root: HTMLElement;
let dispose: (() => void) | undefined;
let reduced = false;

beforeEach(() => {
  browser = new Window();
  Object.defineProperty(browser.document, 'fonts', { value: { ready: Promise.resolve() } });
  reduced = false;
  Object.assign(globalThis, {
    window: browser, document: browser.document,
    matchMedia: () => ({ matches: reduced, addEventListener() {} }),
    ResizeObserver: class { observe() {} disconnect() {} },
  });
  browser.innerWidth = 390;
  browser.document.body.innerHTML = `<div data-apartment-selection>
    <div data-selection-viewport><div class="selection-grid">${[0, 1, 2].map(i => `<a href="/apartment-${i}" data-selection-card aria-label="Квартира ${i}" class="selection-card">Квартира ${i}</a>`).join('')}</div></div>
    <div data-selection-controls hidden><button data-selection-prev>Назад</button><span data-selection-counter></span><button data-selection-next>Вперёд</button><span data-selection-status></span></div></div>`;
  root = browser.document.querySelector('[data-apartment-selection]') as unknown as HTMLElement;
  const viewport = root.querySelector<HTMLElement>('[data-selection-viewport]')!;
  Object.defineProperty(viewport, 'clientWidth', { get: () => 327 });
  viewport.getBoundingClientRect = () => ({ width: 327 } as DOMRect);
  root.querySelectorAll('.selection-card').forEach(card => {
    Object.defineProperty(card, 'offsetWidth', { get: () => 275 });
    Object.defineProperty(card, 'offsetHeight', { get: () => 470 });
  });
});
afterEach(async () => { dispose?.(); dispose = undefined; await browser.happyDOM.abort(); });
const click = (selector: string) => root.querySelector<HTMLButtonElement>(selector)!.click();

describe('selection carousel', () => {
  test('wraps in both directions and recycles three unique slots', () => {
    expect(wrapSelection(-1, 3)).toBe(2);
    expect(wrapSelection(3, 3)).toBe(0);
    for (const position of [-4, -.5, 0, 1, 2, 3, 15]) {
      const offsets = [0, 1, 2].map(index => selectionOffset(index, position, 3));
      expect(new Set(offsets).size).toBe(3);
      expect(offsets.every(x => x >= -1.5 && x < 1.5)).toBe(true);
    }
  });
  test('distinguishes taps, horizontal drags and vertical scrolling', () => {
    expect(isSelectionDrag(8, 0)).toBe(false);
    expect(isSelectionDrag(9, 2)).toBe(true);
    expect(isSelectionDrag(-30, 4)).toBe(true);
    expect(isSelectionDrag(9, 50)).toBe(false);
  });
  test('arrows loop without cloning links; keyboard moves focus to the active card', () => {
    dispose = mountApartmentSelection(root);
    click('[data-selection-prev]');
    expect(root.dataset.selectionIndex).toBe('2');
    click('[data-selection-next]');
    expect(root.dataset.selectionIndex).toBe('0');
    const cards = root.querySelectorAll<HTMLAnchorElement>('[data-selection-card]');
    cards[0].focus();
    cards[0].dispatchEvent(new browser.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }) as unknown as Event);
    expect(root.dataset.selectionIndex).toBe('1');
    expect(browser.document.activeElement).toBe(cards[1] as never);
    expect(cards[0].getAttribute('aria-hidden')).toBe('true');
    expect(cards[1].hasAttribute('aria-hidden')).toBe(false);
    expect(cards.length).toBe(3);
  });
  test('suppresses the release click after dragging but allows a fresh tap', () => {
    reduced = true;
    dispose = mountApartmentSelection(root);
    dragOptions.onPress.call({ pointerX: 300, pointerY: 100 });
    dragOptions.onDrag.call({ pointerX: 100, pointerY: 102 });
    // Draggable dispatches release before dragend, with isDragging already false.
    dragOptions.onRelease.call({ isDragging: false });
    dragOptions.onDragEnd.call({ pointerX: 100, pointerY: 102 });
    expect(root.dataset.selectionIndex).toBe('1');
    const viewport = root.querySelector('[data-selection-viewport]')!;
    const release = new browser.MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 });
    viewport.dispatchEvent(release as unknown as Event);
    expect(release.defaultPrevented).toBe(true);
    dragOptions.onPress.call({ pointerX: 100, pointerY: 100 });
    const tap = new browser.MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 });
    viewport.dispatchEvent(tap as unknown as Event);
    expect(tap.defaultPrevented).toBe(false);
  });
  test('retains selection across desktop/mobile and respects compensated viewport', () => {
    dispose = mountApartmentSelection(root);
    click('[data-selection-next]');
    browser.innerWidth = 1440;
    browser.dispatchEvent(new browser.Event('resize'));
    expect(root.classList.contains('is-carousel')).toBe(false);
    expect(root.querySelector('[aria-hidden="true"]')).toBeNull();
    browser.document.documentElement.style.zoom = '2';
    browser.dispatchEvent(new browser.Event('resize'));
    expect(root.classList.contains('is-carousel')).toBe(true);
    expect(root.dataset.selectionIndex).toBe('1');
  });
  test('cleans listeners and draggable before remount; reduced motion still navigates', () => {
    reduced = true;
    const before = killed;
    dispose = mountApartmentSelection(root);
    dispose();
    click('[data-selection-next]');
    expect(root.dataset.selectionIndex).toBeUndefined();
    expect(killed).toBe(before + 1);
    dispose = mountApartmentSelection(root);
    click('[data-selection-next]');
    expect(root.dataset.selectionIndex).toBe('1');
  });
});
