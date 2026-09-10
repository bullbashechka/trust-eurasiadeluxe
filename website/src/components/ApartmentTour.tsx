import { useEffect, useRef, useState, type CSSProperties } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Scene } from "../data/apartments";
import Icon from "./Icon";
import { scrollPageTo } from "../scripts/smooth-scroll";
import { tourFrame } from "../data/timeline";

type Mode = "scroll" | "play" | "photos";
interface LayerProps {
  scene: Scene;
  source?: string;
  time: number;
  opacity: number;
  mode: Mode;
  active: boolean;
  playing: boolean;
  onError: () => void;
  onSlow: () => void;
  onEnd: () => void;
  onBlocked: () => void;
  onReady: () => void;
}

function MediaLayer({
  scene,
  source,
  time,
  opacity,
  mode,
  active,
  playing,
  onError,
  onSlow,
  onEnd,
  onBlocked,
  onReady,
}: LayerProps) {
  const video = useRef<HTMLVideoElement>(null);
  const target = useRef(time);
  const callbacks = useRef({ onError, onSlow, onEnd, onBlocked, onReady });
  callbacks.current = { onError, onSlow, onEnd, onBlocked, onReady };
  const [ready, setReady] = useState(false);
  const seek = useRef<() => void>(() => {});
  target.current = time;

  useEffect(() => {
    const element = video.current;
    if (!element || !source || mode === "photos") return;
    let slowTimer: ReturnType<typeof setTimeout> | undefined;
    const loadTimer = setTimeout(() => callbacks.current.onError(), 12000);
    let disposed = false;
    setReady(false);
    const clearSlow = () => {
      if (slowTimer) clearTimeout(slowTimer);
      slowTimer = undefined;
    };
    const update = () => {
      if (
        disposed ||
        mode !== "scroll" ||
        element.readyState < 1 ||
        element.seeking
      )
        return;
      const desired = Math.min(
        target.current * element.duration,
        Math.max(0, element.duration - 1 / 24),
      );
      if (
        !Number.isFinite(desired) ||
        Math.abs(element.currentTime - desired) < 1 / 48
      )
        return;
      try {
        element.currentTime = desired;
        clearSlow();
        const reportSlow = () => {
          if (disposed) return;
          callbacks.current.onSlow();
          if (element.seeking) slowTimer = setTimeout(reportSlow, 1800);
        };
        slowTimer = setTimeout(reportSlow, 1800);
      } catch {
        callbacks.current.onError();
      }
    };
    const loaded = () => {
      clearTimeout(loadTimer);
      setReady(true);
      callbacks.current.onReady();
      update();
    };
    const seeked = () => {
      clearSlow();
      setReady(true);
      callbacks.current.onReady();
      update();
    };
    const error = () => {
      clearTimeout(loadTimer);
      clearSlow();
      setReady(false);
      callbacks.current.onError();
    };
    element.addEventListener("loadeddata", loaded);
    element.addEventListener("loadedmetadata", update);
    element.addEventListener("seeked", seeked);
    element.addEventListener("error", error);
    seek.current = update;
    if (element.readyState >= 2) loaded();
    return () => {
      disposed = true;
      clearTimeout(loadTimer);
      clearSlow();
      element.pause();
      element.removeEventListener("loadeddata", loaded);
      element.removeEventListener("loadedmetadata", update);
      element.removeEventListener("seeked", seeked);
      element.removeEventListener("error", error);
      seek.current = () => {};
    };
  }, [source, mode]);

  useEffect(() => {
    seek.current();
  }, [time]);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (mode === "play" && active && playing && source) {
      void element.play().catch(() => callbacks.current.onBlocked());
    } else element.pause();
  }, [mode, active, playing, source]);

  return (
    <div
      className={`tour-layer${ready ? " ready" : ""}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <img
        src={scene.poster}
        alt=""
        width="1736"
        height="1192"
        loading="lazy"
      />
      {active && source && !ready && (
        <span className="media-loading">Загружаем видео…</span>
      )}
      {source && mode !== "photos" && (
        <video
          ref={video}
          src={source}
          muted
          playsInline
          preload="auto"
          onEnded={() => callbacks.current.onEnd()}
        />
      )}
    </div>
  );
}

export default function ApartmentTour({
  scenes,
  area,
  plan = "",
}: {
  scenes: Scene[];
  area: string;
  plan?: string;
}) {
  const section = useRef<HTMLElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const [mode, setMode] = useState<Mode>("scroll");
  const [frame, setFrame] = useState(() => tourFrame(0, scenes.length));
  const [near, setNear] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [shortViewport, setShortViewport] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failures, setFailures] = useState<Record<string, boolean>>({});
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState("");
  const [tourReady, setTourReady] = useState(false);
  const planDialog = useRef<HTMLDialogElement>(null);
  const planOpener = useRef<HTMLButtonElement | null>(null);
  const slowCount = useRef(0);
  const reduced = useRef(false);
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const current = scenes[frame.index];
  const hasFailed = Boolean(failures[current.id]);
  const chapters = scenes.flatMap((scene, index) =>
    index === 0 || scene.room !== scenes[index - 1].room
      ? [{ room: scene.room, index }]
      : [],
  );
  const activeChapter =
    chapters.findLast((chapter) => chapter.index <= frame.index)?.index ?? 0;

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => {
      reduced.current = motion.matches;
      if (motion.matches) {
        setMode("photos");
        setPlaying(false);
      }
    };
    const syncSize = () => {
      const scale = Number(document.documentElement.style.zoom) || 1;
      const isMobile = window.innerWidth / scale <= 760;
      setMobile(isMobile);
      const short = window.innerHeight / scale < 520;
      setShortViewport(short);
      if (motion.matches) {
        setMode("photos");
        setPlaying(false);
      } else if (short || isMobile) {
        setMode(current => current === "scroll" ? "play" : current);
        setPlaying(false);
      }
    };
    syncMotion();
    syncSize();
    motion.addEventListener("change", syncMotion);
    window.addEventListener("resize", syncSize);
    const observer = new IntersectionObserver(
      ([entry]) => {
        setNear(entry.isIntersecting);
        if (!entry.isIntersecting) setPlaying(false);
      },
      { rootMargin: "400px 0px" },
    );
    if (section.current) observer.observe(section.current);
    const pause = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pause);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", syncMotion);
      window.removeEventListener("resize", syncSize);
      document.removeEventListener("visibilitychange", pause);
    };
  }, []);

  useEffect(() => {
    if (mode !== "scroll" || shortViewport || !section.current) return;
    const controller = ScrollTrigger.create({
      trigger: section.current,
      start: "top top",
      end: "bottom bottom",
      invalidateOnRefresh: true,
      onUpdate: (self) => setFrame(tourFrame(self.progress, scenes.length)),
      onRefresh: (self) => setFrame(tourFrame(self.progress, scenes.length)),
    });
    trigger.current = controller;
    controller.refresh();
    let active = true;
    const refresh = () => {
      if (active) ScrollTrigger.refresh(true);
    };
    void document.fonts?.ready.then(refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      active = false;
      controller.kill();
      trigger.current = null;
      window.removeEventListener("pageshow", refresh);
    };
  }, [mode, scenes.length, shortViewport]);

  function openPlan(opener: HTMLButtonElement) {
    setPlaying(false);
    planOpener.current = opener;
    planDialog.current?.showModal();
  }

  useEffect(() => {
    const open = (event: Event) => {
      if (!(event.target instanceof window.Element)) return;
      if (event.target.closest('a[href="#details"]')) {
        setPlaying(false);
      }
      const button = event.target.closest<HTMLButtonElement>('[data-apartment-plan-open]');
      if (button && plan) openPlan(button);
    };
    document.addEventListener('click', open);
    return () => document.removeEventListener('click', open);
  }, [plan]);

  function changeMode(next: Mode) {
    const top = section.current
      ? section.current.getBoundingClientRect().top + window.scrollY
      : window.scrollY;
    const selected = frameRef.current.index;
    setPlaying(false);
    setMode(next);
    setFrame({ index: selected, time: 0, blend: 0 });
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      const controller = trigger.current;
      const destination =
        next === "scroll" && controller
          ? controller.start +
            (controller.end - controller.start) * (selected / scenes.length)
          : top;
      scrollPageTo(destination, true);
    });
  }

  function retryCurrent() {
    setFailures((old) => ({ ...old, [current.id]: false }));
    setAttempt((value) => value + 1);
    setNotice("");
    setPlaying(false);
  }

  function togglePhotos() {
    if (mode === "photos") {
      if (hasFailed) retryCurrent();
      changeMode("play");
      return;
    }
    changeMode("photos");
  }

  function togglePlayback() {
    if (hasFailed) {
      retryCurrent();
      return;
    }
    setNotice("");
    if (mode === "photos") {
      setMode("play");
      setPlaying(true);
      return;
    }
    setPlaying((value) => !value);
  }

  function choose(index: number) {
    setNotice("");
    if (mode === "scroll" && trigger.current) {
      const controller = trigger.current;
      scrollPageTo(
          controller.start +
          (controller.end - controller.start) * (index / scenes.length),
        reduced.current,
      );
    } else {
      setFrame({ index, time: 0, blend: 0 });
      setPlaying(false);
    }
  }

  function onSlow() {
    if (mode !== "scroll") return;
    slowCount.current += 1;
    if (slowCount.current >= 3) {
      setNotice(
        "Перемотка работает медленно. Можно посмотреть видео обычным способом.",
      );
      changeMode("play");
    }
  }

  return (
    <section
      ref={section}
      className="tour-section"
      id="tour"
      aria-label={`Экскурсия по квартире ${area} м²`}
      data-mode={mode}
      data-ready={tourReady}
      data-compact={shortViewport}
      data-mobile={mobile}
      style={
        {
          height:
            mode === "scroll" && !shortViewport
              ? `calc(${Math.min(5, 1 + scenes.length * 0.4) * 100}svh / var(--display-scale, 1))`
              : "auto",
        } as CSSProperties
      }
    >
      <div className="tour-sticky">
        <div
          className="tour-view"
          role="group"
          aria-label={`${current.room}. ${current.caption}`}
        >
          {scenes.map(
            (scene, index) =>
              Math.abs(index - frame.index) <= 1 && (
                <MediaLayer
                  key={`${scene.id}-${attempt}`}
                  scene={scene}
                  source={
                    near && mode !== "photos" && !failures[scene.id]
                      ? mobile
                        ? scene.mobile
                        : scene.desktop
                      : undefined
                  }
                  time={
                    index < frame.index
                      ? 1
                      : index === frame.index
                        ? frame.time
                        : 0
                  }
                  opacity={
                    index === frame.index
                      ? 1
                      : index === frame.index + 1
                        ? frame.blend
                        : 0
                  }
                  mode={mode}
                  active={index === frame.index}
                  playing={playing}
                  onError={() =>
                    setFailures((old) => ({ ...old, [scene.id]: true }))
                  }
                  onSlow={onSlow}
                  onBlocked={() => {
                    setPlaying(false);
                    setNotice("Нажмите «Смотреть», чтобы запустить видео.");
                  }}
                  onReady={() => {
                    if (!tourReady && index === frameRef.current.index) {
                      setTourReady(true);
                    }
                  }}
                  onEnd={() => {
                    if (mode !== "play" || index !== frame.index) return;
                    if (index < scenes.length - 1)
                      setFrame({ index: index + 1, time: 0, blend: 0 });
                    else setPlaying(false);
                  }}
                />
              ),
          )}
          <div className="tour-topline">
            <span className="tour-badge">EURASIA DE LUXE · {area} М²</span>
            <div className="tour-top-actions">{plan && <button type="button" onClick={event => openPlan(event.currentTarget)}>Планировка</button>}<a href="#details" onClick={() => setPlaying(false)}>Пропустить тур</a><span className="tour-counter">{String(frame.index + 1).padStart(2, "0")} / {scenes.length}</span></div>
          </div>
          <div className="tour-mobile-topline">
            {plan && <button type="button" onClick={event => openPlan(event.currentTarget)}>Планировка</button>}
            <span className="tour-counter">{String(frame.index + 1).padStart(2, "0")} / {scenes.length}</span>
          </div>
          {!tourReady && !hasFailed && near && mode === "scroll" && <div className="tour-wait" role="status">Подготавливаем прогулку…</div>}
          <aside className="tour-mobile-controls" aria-label="Управление экскурсией">
            <nav className="tour-mobile-chapters" aria-label="Помещения квартиры">
              {chapters.map((chapter) => (
                <button
                  key={chapter.index}
                  aria-current={activeChapter === chapter.index}
                  onClick={() => choose(chapter.index)}
                >
                  {chapter.room}
                </button>
              ))}
            </nav>
            {(hasFailed || notice) && (
              <div className="tour-mobile-message" role="status">
                <span>{hasFailed ? "Видео не загрузилось." : notice}</span>
                {hasFailed && <button type="button" onClick={retryCurrent}>Повторить</button>}
              </div>
            )}
            <div className="tour-mobile-playback">
              <button
                type="button"
                aria-label="Предыдущая сцена"
                disabled={frame.index === 0}
                onClick={() => choose(frame.index - 1)}
              >
                <Icon name="arrow-left"/>
              </button>
              <button
                className="tour-mobile-toggle"
                type="button"
                aria-label={hasFailed ? "Повторить загрузку" : playing ? "Пауза" : "Воспроизвести"}
                onClick={togglePlayback}
              >
                <Icon name={playing ? "pause" : "play"}/>
              </button>
              <button
                type="button"
                aria-label="Следующая сцена"
                disabled={frame.index === scenes.length - 1}
                onClick={() => choose(frame.index + 1)}
              >
                <Icon name="arrow-right"/>
              </button>
            </div>
            <div
              className="tour-progress tour-mobile-progress"
              role="progressbar"
              aria-label="Прогресс экскурсии"
              aria-valuemin={0}
              aria-valuemax={scenes.length}
              aria-valuenow={frame.index + 1}
            >
              <span style={{ transform: `scaleX(${(frame.index + frame.time) / scenes.length})` }}/>
            </div>
          </aside>
        </div>
        <aside className="tour-sidebar" aria-label="Управление экскурсией">
          <div className="sidebar-top">
            <p className="eyebrow">ВАША ПРОГУЛКА ПО ДОМУ</p>
            <nav className="chapter-nav" aria-label="Помещения квартиры">
              {chapters.map((chapter, index) => (
                <button
                  key={chapter.index}
                  aria-current={activeChapter === chapter.index}
                  onClick={() => choose(chapter.index)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {chapter.room}
                </button>
              ))}
            </nav>
          </div>
          <div>
            <h3 aria-live="polite">{current.room}</h3>
            <p className="caption">{current.caption}</p>
            {(hasFailed || notice) && (
              <div className="tour-message" role="status">
                <span>
                  {hasFailed
                    ? "Видео не загрузилось. Фотография и переходы по комнатам доступны."
                    : notice}
                </span>
                {hasFailed && mode === "scroll" && (
                  <button type="button" onClick={retryCurrent}>
                    Повторить загрузку
                  </button>
                )}
              </div>
            )}
            <button
              className="tour-control"
              hidden={shortViewport}
              onClick={() => {
                setNotice("");
                changeMode(mode === "scroll" ? "play" : "scroll");
              }}
            >
              {mode === "scroll"
                ? "Обычное воспроизведение"
                : "Управлять прокруткой"}
            </button>
            {mode !== "scroll" && (
              <div className="play-controls">
                <button
                  aria-label="Предыдущая сцена"
                  disabled={frame.index === 0}
                  onClick={() => choose(frame.index - 1)}
                >
                  <Icon name="arrow-left"/>
                </button>
                <button
                  onClick={togglePlayback}
                >
                  {hasFailed
                    ? "Повторить загрузку"
                    : playing
                      ? "Пауза"
                      : "Смотреть"}
                </button>
                <button
                  aria-label="Следующая сцена"
                  disabled={frame.index === scenes.length - 1}
                  onClick={() => choose(frame.index + 1)}
                >
                  <Icon name="arrow-right"/>
                </button>
              </div>
            )}
            <button className="tour-photo-control" type="button" onClick={togglePhotos}>
              {mode === "photos" ? "Вернуться к видео" : "Смотреть фотографии"}
            </button>
            <div
              className="tour-progress"
              role="progressbar"
              aria-label="Прогресс экскурсии"
              aria-valuemin={0}
              aria-valuemax={scenes.length}
              aria-valuenow={frame.index + 1}
            >
              <span
                style={{
                  transform: `scaleX(${(frame.index + frame.time) / scenes.length})`,
                }}
              />
            </div>
            <p className="tour-hint">
              {mode === "scroll"
                ? "Листайте, чтобы двигаться по квартире.\nОстановитесь, чтобы рассмотреть детали."
                : mode === "photos"
                  ? "Фотографии интерьера. Выберите комнату или сцену."
                  : "Видео по главам. Вы управляете просмотром."}
            </p>
            <a className="tour-finish-link" href="#details">
              К характеристикам <Icon name="arrow-up-right"/>
            </a>
          </div>
        </aside>
      </div>
      {plan && <dialog ref={planDialog} className="tour-plan-dialog" aria-label={`Планировка квартиры ${area} м²`} onClose={() => planOpener.current?.focus({ preventScroll: true })} onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
        <button type="button" aria-label="Закрыть планировку" onClick={() => planDialog.current?.close()}><Icon name="x"/></button>
        <img src={plan} alt={`Планировка квартиры ${area} м²`} width="800" height="750" />
      </dialog>}
    </section>
  );
}
