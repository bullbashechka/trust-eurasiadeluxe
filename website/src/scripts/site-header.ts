let dispose: (() => void) | undefined;

function mountSiteHeader() {
  dispose?.();

  const header = document.querySelector<HTMLElement>("[data-site-header]");
  const sentinel = document.querySelector<HTMLElement>("[data-site-header-sentinel]");
  if (!header || !sentinel) return;

  const setCompact = (compact: boolean) => {
    header.classList.toggle("is-compact", compact);
  };

  setCompact(scrollY > 64);
  const observer = new IntersectionObserver(([entry]) => {
    setCompact(!entry.isIntersecting);
  });
  observer.observe(sentinel);

  dispose = () => {
    observer.disconnect();
    dispose = undefined;
  };
}

document.addEventListener("astro:before-swap", () => dispose?.());
document.addEventListener("astro:page-load", mountSiteHeader);
window.addEventListener("pageshow", mountSiteHeader);

if (document.readyState !== "loading") mountSiteHeader();
else document.addEventListener("DOMContentLoaded", mountSiteHeader, { once: true });
