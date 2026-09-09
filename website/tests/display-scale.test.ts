import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../src/scripts/display-scale.js', import.meta.url), 'utf8');
function setup(dpr = 1, stored: string | null = null, blocked = false) {
  const events = new Map<string, () => void>();
  const style = { zoom: '', setProperty() {} };
  const window = { devicePixelRatio: dpr, addEventListener: (name: string, fn: () => void) => events.set(name, fn) };
  const screen = { width: 1920, height: 1080 };
  const media = { type: 4, conditionText: '(max-width: 640px)', media: { mediaText: '(max-width: 640px)' } };
  const context = {
    window, screen,
    document: { styleSheets: [{ cssRules: [media] }], documentElement: { style }, addEventListener: (name: string, fn: () => void) => events.set(name, fn) },
    sessionStorage: {
      getItem() { if (blocked) throw Error('Storage disabled'); return stored; },
      setItem(_key: string, value: string) { if (blocked) throw Error('Storage disabled'); stored = value; },
    },
  };
  runInNewContext(source, context);
  return { window, screen, style, media, events, stored: () => stored, rerun: () => runInNewContext(source, context) };
}
describe('site display scale', () => {
  test('compensates zoom out without suppressing zoom in on a scaled Windows display', () => {
    const app = setup(1.25);
    expect(app.style.zoom).toBe('1');
    app.window.devicePixelRatio = 1;
    app.events.get('resize')!();
    expect(app.style.zoom).toBe('1.25');
    app.window.devicePixelRatio = 1.5;
    app.events.get('resize')!();
    expect(app.style.zoom).toBe('1');
  });
  test('retains baseline after reload and restores styles after Astro navigation', () => {
    const initial = setup();
    const app = setup(0.8, initial.stored());
    expect(app.style.zoom).toBe('1.25');
    app.style.zoom = '';
    app.events.get('astro:after-swap')!();
    expect(app.style.zoom).toBe('1.25');
    app.rerun();
    expect(app.events.size).toBe(5);
  });
  test('uses a new baseline on a different screen', () => {
    const app = setup();
    app.screen.width = 2560;
    app.window.devicePixelRatio = 1.5;
    app.events.get('resize')!();
    expect(app.style.zoom).toBe('1');
  });
  test('keeps responsive thresholds stable during zoom out and restores them for zoom in', () => {
    const app = setup();
    app.window.devicePixelRatio = 0.5;
    app.events.get('resize')!();
    expect(app.media.media.mediaText).toBe('(max-width: 1280px)');
    app.events.get('resize')!();
    expect(app.media.media.mediaText).toBe('(max-width: 1280px)');
    app.window.devicePixelRatio = 1.25;
    app.events.get('resize')!();
    expect(app.media.media.mediaText).toBe('(max-width: 640px)');
  });
  test('works with unavailable or corrupt storage', () => {
    for (const app of [setup(1, null, true), setup(1, '{broken'), setup(1, '[]')]) {
      app.window.devicePixelRatio = 0.5;
      app.events.get('resize')!();
      expect(app.style.zoom).toBe('2');
    }
  });
});
