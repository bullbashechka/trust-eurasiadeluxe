import { useEffect, useRef, useState, type CSSProperties } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Scene } from "../data/apartments";
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
  const [playing, setPlaying] = useState(false);
  const [failures, setFailures] = useState<Record<string, boolean>>({});
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState("");
  const [tourReady, setTourReady] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const planDialog = useRef<HTMLDialogElement>(null);
  const slowCount = useRef(0);
  const reduced = useRef(false);
  const frameRef = useRef(frame);
  const readyBeforeEntry = useRef(false);
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
    const syncSize = () => setMobile(window.innerWidth / (Number(document.documentElement.style.zoom) || 1) <= 640);
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
    const activateWhenEntered = () => {
      const element = section.current;
      if (!element || !tourReady || !readyBeforeEntry.current) return;
      const rect = element.getBoundingClientRect();
      if (rect.top <= 1 && rect.bottom > 0) setTourActive(true);
    };
    window.addEventListener("scroll", activateWhenEntered, { passive: true });
    activateWhenEntered();
    const pause = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pause);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", syncMotion);
      window.removeEventListener("resize", syncSize);
      document.removeEventListener("visibilitychange", pause);
      window.removeEventListener("scroll", activateWhenEntered);
    };
  }, [tourReady]);

  useEffect(() => {
    if (mode !== "scroll" || !tourReady || !tourActive || !section.current) return;
    const controller = ScrollTrigger.create({
      trigger: section.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => setFrame(tourFrame(self.progress, scenes.length)),
      onRefresh: (self) => setFrame(tourFrame(self.progress, scenes.length)),
    });
    trigger.current = controller;
    controller.refresh();
    const refresh = () => controller.refresh();
    window.addEventListener("pageshow", refresh);
    return () => {
      controller.kill();
      trigger.current = null;
      window.removeEventListener("pageshow", refresh);
    };
  }, [mode, scenes.length, tourReady, tourActive]);

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
      window.scrollTo({ top: destination, behavior: "instant" });
    });
  }

  function choose(index: number) {
    setNotice("");
    if (mode === "scroll" && trigger.current) {
      const controller = trigger.current;
      window.scrollTo({
        top:
          controller.start +
          (controller.end - controller.start) * (index / scenes.length),
        behavior: reduced.current ? "instant" : "smooth",
      });
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
      data-ready={tourReady && tourActive}
      style={
        {
          height:
            mode === "scroll" && tourReady && tourActive ? `calc(${(scenes.length + 1) * 100}svh / var(--display-scale, 1))` : "auto",
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
                    if (!tourReady) {
                      const element = section.current;
                      const rect = element?.getBoundingClientRect();
                      readyBeforeEntry.current = !rect || rect.top > window.innerHeight || rect.bottom <= 0;
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
            <div className="tour-top-actions"><button type="button" onClick={() => planDialog.current?.showModal()}>Планировка</button><a href="#details">Пропустить тур</a><span className="tour-counter">{String(frame.index + 1).padStart(2, "0")} / {scenes.length}</span></div>
          </div>
          {!tourReady && near && mode === "scroll" && <div className="tour-wait" role="status">Подготавливаем прогулку…</div>}
          {tourReady && !tourActive && mode === "scroll" && <button type="button" className="tour-start" onClick={() => setTourActive(true)}>Начать прогулку <span aria-hidden="true">→</span></button>}
          {(hasFailed || notice) && (
            <div className="tour-message" role="status">
              <span>
                {hasFailed
                  ? "Видео не загрузилось. Пока можно рассмотреть фотографию."
                  : notice}
              </span>
              {hasFailed && (
                <button
                  onClick={() => {
                    setFailures((old) => ({ ...old, [current.id]: false }));
                    setAttempt((value) => value + 1);
                    setNotice("");
                  }}
                >
                  Повторить
                </button>
              )}
              {mode !== "photos" && (
                <button
                  onClick={() => {
                    changeMode("photos");
                    setNotice("");
                  }}
                >
                  Смотреть фотографии
                </button>
              )}
            </div>
          )}
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
            <button
              className="tour-control"
              onClick={() => {
                setNotice("");
                changeMode(mode === "scroll" ? "play" : "scroll");
              }}
            >
              {mode === "scroll"
                ? "▷ Обычное воспроизведение"
                : "↕ Управлять прокруткой"}
            </button>
            {mode !== "scroll" && (
              <div className="play-controls">
                <button
                  aria-label="Предыдущая сцена"
                  disabled={frame.index === 0}
                  onClick={() => choose(frame.index - 1)}
                >
                  ←
                </button>
                <button
                  onClick={() => {
                    setNotice("");
                    if (mode === "photos") setMode("play");
                    setPlaying((value) => !value);
                  }}
                  disabled={hasFailed}
                >
                  {playing ? "Пауза" : "Смотреть"}
                </button>
                <button
                  aria-label="Следующая сцена"
                  disabled={frame.index === scenes.length - 1}
                  onClick={() => choose(frame.index + 1)}
                >
                  →
                </button>
              </div>
            )}
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
              К характеристикам ↗
            </a>
          </div>
        </aside>
      </div>
      {plan && <dialog ref={planDialog} className="tour-plan-dialog" aria-label={`Планировка квартиры ${area} м²`} onClose={() => planDialog.current?.blur()}>
        <button type="button" aria-label="Закрыть планировку" onClick={() => planDialog.current?.close()}>×</button>
        <img src={plan} alt={`Планировка квартиры ${area} м²`} width="800" height="750" />
      </dialog>}
    </section>
  );
}
