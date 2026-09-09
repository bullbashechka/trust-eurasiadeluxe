import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { isSelectionDrag, selectionOffset, wrapSelection } from './selection-state';

export function mountApartmentSelection(root: HTMLElement) {
  const viewport = root.querySelector<HTMLElement>('[data-selection-viewport]')!;
  const grid = root.querySelector<HTMLElement>('.selection-grid')!;
  const cards = [...root.querySelectorAll<HTMLAnchorElement>('[data-selection-card]')];
  const controls = root.querySelector<HTMLElement>('[data-selection-controls]')!;
  const counter = root.querySelector<HTMLElement>('[data-selection-counter]')!;
  const status = root.querySelector<HTMLElement>('[data-selection-status]')!;
  const previous = root.querySelector<HTMLButtonElement>('[data-selection-prev]')!;
  const next = root.querySelector<HTMLButtonElement>('[data-selection-next]')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const abort = new AbortController();
  const { signal } = abort;
  const state = { position: 0 };
  let target = 0;
  let active = 0;
  let mobile = false;
  let step = 1;
  let center = 0;
  let layoutKey = '';
  let suppressUntil = 0;
  let drag: Draggable | undefined;
  let tween: gsap.core.Tween | undefined;
  let pressX = 0;
  let pressY = 0;
  let pressPosition = 0;
  let dragged = false;
  let coordinateScale = 1;
  const proxy = document.createElement('div');
  proxy.setAttribute('aria-hidden', 'true');
  proxy.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none;';

  function accessibility(announce = false) {
    const focusWasOnCard = cards.some(card => card.contains(document.activeElement));
    cards.forEach((card, index) => {
      const hidden = mobile && index !== active;
      card.inert = hidden;
      if (hidden) card.setAttribute('aria-hidden', 'true');
      else card.removeAttribute('aria-hidden');
    });
    if (mobile && focusWasOnCard) cards[active].focus({ preventScroll: true });
    root.dataset.selectionIndex = String(active);
    counter.textContent = `${active + 1} / ${cards.length}`;
    if (announce) status.textContent = `Квартира ${active + 1} из ${cards.length}: ${cards[active].getAttribute('aria-label')}`;
  }

  function render() {
    cards.forEach((card, index) => {
      gsap.set(card, { x: center + selectionOffset(index, state.position, cards.length) * step });
    });
  }

  function goTo(position: number) {
    if (!mobile) return;
    tween?.kill();
    target = position;
    active = wrapSelection(position, cards.length);
    accessibility(true);
    const finish = () => {
      state.position = target = active;
      render();
    };
    if (reduced.matches) {
      state.position = position;
      finish();
    } else {
      tween = gsap.to(state, { position, duration: .35, ease: 'power2.out', onUpdate: render, onComplete: finish });
    }
  }

  function clearLayout() {
    tween?.kill();
    drag?.kill();
    drag = undefined;
    proxy.remove();
    gsap.killTweensOf(cards);
    gsap.set(cards, { clearProps: 'transform' });
    cards.forEach(card => { card.inert = false; card.removeAttribute('aria-hidden'); });
    grid.style.removeProperty('height');
    root.classList.remove('is-carousel');
    controls.hidden = true;
  }

  function syncLayout() {
    const scale = Number(document.documentElement.style.zoom) || 1;
    const nextMobile = window.innerWidth / scale < 1024;
    const key = `${nextMobile}:${viewport.clientWidth}:${scale}`;
    if (key === layoutKey) return;
    layoutKey = key;
    const controlsFocused = controls.contains(document.activeElement);
    clearLayout();
    mobile = nextMobile;
    state.position = target = active;
    if (!mobile) {
      if (controlsFocused) cards[active].focus({ preventScroll: true });
      accessibility();
      return;
    }
    gsap.registerPlugin(Draggable);
    root.classList.add('is-carousel');
    controls.hidden = false;
    const width = cards[0].offsetWidth;
    step = width + 16;
    center = (viewport.clientWidth - width) / 2;
    grid.style.height = `${Math.max(...cards.map(card => card.offsetHeight)) + 24}px`;
    render();
    accessibility();
    root.append(proxy);
    [drag] = Draggable.create(proxy, {
      type: 'x', trigger: viewport, dragClickables: true, minimumMovement: 8,
      allowNativeTouchScrolling: true, allowContextMenu: true,
      cursor: 'grab', activeCursor: 'grabbing',
      onPress(this: Draggable) {
        tween?.kill();
        suppressUntil = 0;
        dragged = false;
        pressX = this.pointerX;
        pressY = this.pointerY;
        pressPosition = state.position;
        coordinateScale = viewport.getBoundingClientRect().width / viewport.clientWidth || 1;
      },
      onDrag(this: Draggable) {
        dragged = true;
        state.position = pressPosition - (this.pointerX - pressX) / coordinateScale / step;
        render();
      },
      onDragEnd(this: Draggable) {
        if (isSelectionDrag(this.pointerX - pressX, this.pointerY - pressY)) suppressUntil = performance.now() + 500;
        goTo(Math.round(state.position));
      },
      onRelease() {
        if (!dragged) goTo(target);
      },
    });
  }

  previous.addEventListener('click', () => goTo(target - 1), { signal });
  next.addEventListener('click', () => goTo(target + 1), { signal });
  root.addEventListener('keydown', event => {
    if (!mobile || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    goTo(target + (event.key === 'ArrowRight' ? 1 : -1));
  }, { signal });
  viewport.addEventListener('click', event => {
    if (event.detail !== 0 && performance.now() < suppressUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, { capture: true, signal });
  const onMotion = () => { if (mobile) goTo(target); };
  reduced.addEventListener('change', onMotion, { signal });
  window.addEventListener('resize', syncLayout, { signal });
  const resize = new ResizeObserver(syncLayout);
  resize.observe(viewport);
  root.classList.add('is-enhanced');
  syncLayout();
  void document.fonts.ready.then(() => {
    if (signal.aborted) return;
    layoutKey = '';
    syncLayout();
  });
  return () => {
    abort.abort();
    resize.disconnect();
    clearLayout();
    root.classList.remove('is-enhanced');
    delete root.dataset.selectionIndex;
  };
}
