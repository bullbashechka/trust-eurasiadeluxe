import { gsap } from "gsap";
import { mountApartmentSelection } from "./apartment-selection";
import { validateCompanyForm } from "../data/company-form";

let dispose: (() => void) | undefined;

function mountProject() {
  dispose?.();
  if (!document.body.classList.contains("eurasia-page")) return;
  const abort = new AbortController();
  const { signal } = abort;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const pointer = matchMedia("(hover: hover) and (pointer: fine)");
  const header = document.querySelector<HTMLElement>("[data-project-header]");
  const menu = document.querySelector<HTMLDialogElement>("#project-menu");
  const contact = document.querySelector<HTMLDialogElement>("#project-contact-dialog");
  const selector = document.querySelector<HTMLDialogElement>("#apartment-selector");
  let opener: HTMLElement | null = null;

  function close(dialog?: HTMLDialogElement | null) {
    if (dialog?.open) dialog.close();
    opener?.focus({ preventScroll: true });
    opener = null;
  }
  function open(dialog: HTMLDialogElement | null, source: HTMLElement) {
    if (!dialog?.open) {
      opener = source;
      dialog?.showModal();
      dialog?.querySelector<HTMLElement>("button, input, a")?.focus({ preventScroll: true });
    }
  }
  for (const dialog of [menu, contact, selector]) {
    if (!dialog) continue;
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      close(dialog);
    }, { signal });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) close(dialog);
    }, { signal });
  }
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const menuOpen = event.target.closest<HTMLElement>("[data-project-menu-open]");
    const tourOpen = event.target.closest<HTMLElement>("[data-tour-selector-open]");
    const contactOpen = event.target.closest<HTMLElement>("[data-project-contact-open]");
    if (menuOpen) {
      event.preventDefault();
      open(menu, menuOpen);
    } else if (tourOpen) {
      event.preventDefault();
      open(selector, tourOpen);
    } else if (contactOpen) {
      event.preventDefault();
      open(contact, contactOpen);
    } else if (event.target.closest("[data-project-menu-close]")) close(menu);
    else if (event.target.closest("[data-apartment-selector-close]")) close(selector);
    else if (event.target.closest("[data-project-contact-close]")) close(contact);
    else if (event.target.closest(".project-menu a")) close(menu);
  }, { signal });

  const form = contact?.querySelector<HTMLFormElement>("[data-project-contact-form]");
  if (form && contact) {
    const name = form.elements.namedItem("name") as HTMLInputElement;
    const phone = form.elements.namedItem("phone") as HTMLInputElement;
    const error = contact.querySelector<HTMLElement>("#project-phone-error")!;
    const content = contact.querySelector<HTMLElement>("[data-project-contact-content]")!;
    const success = contact.querySelector<HTMLElement>("[data-project-contact-success]")!;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const result = validateCompanyForm(name.value, phone.value);
      error.textContent = result.errors.phone;
      phone.setAttribute("aria-invalid", String(Boolean(result.errors.phone)));
      if (!result.valid) {
        phone.focus();
        return;
      }
      form.reset();
      content.hidden = true;
      success.hidden = false;
      success.focus({ preventScroll: true });
    }, { signal });
    contact.addEventListener("close", () => {
      content.hidden = false;
      success.hidden = true;
      error.textContent = "";
      phone.removeAttribute("aria-invalid");
    }, { signal });
  }

  const cards = [...document.querySelectorAll<HTMLElement>("[data-apartment-card]")];
  const selection = document.querySelector<HTMLElement>("[data-apartment-selection]");
  const unmountSelection = selection ? mountApartmentSelection(selection) : () => {};

  let unbindTilt = () => {};
  function configureTilt() {
    unbindTilt();
    unbindTilt = () => {};
    if (!pointer.matches || reduced.matches) return;
    const cleanups: (() => void)[] = [];
    cards.forEach((card) => {
      const enter = () => { if (!card.closest(".is-carousel")) card.classList.add("is-tilting"); };
      const move = (event: PointerEvent) => {
        if (card.closest(".is-carousel")) return;
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        gsap.to(card, { rotateX: y * -5, rotateY: x * 5, duration: 0.35, ease: "power3.out", overwrite: "auto" });
      };
      const leave = () => {
        card.classList.remove("is-tilting");
        gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.35, ease: "power3.out", overwrite: "auto" });
      };
      card.addEventListener("pointerenter", enter, { signal });
      card.addEventListener("pointermove", move, { signal });
      card.addEventListener("pointerleave", leave, { signal });
      cleanups.push(() => {
        card.removeEventListener("pointerenter", enter);
        card.removeEventListener("pointermove", move);
        card.removeEventListener("pointerleave", leave);
        card.classList.remove("is-tilting");
        gsap.killTweensOf(card);
        gsap.set(card, { rotateX: 0, rotateY: 0 });
      });
    });
    unbindTilt = () => cleanups.forEach((cleanup) => cleanup());
  }
  configureTilt();
  pointer.addEventListener("change", configureTilt, { signal });
  reduced.addEventListener("change", configureTilt, { signal });

  const reveal = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-revealed");
        reveal.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  if (reduced.matches) document.querySelectorAll<HTMLElement>("[data-project-reveal]").forEach((item) => item.classList.add("is-revealed"));
  else document.querySelectorAll<HTMLElement>("[data-project-reveal]").forEach((item) => reveal.observe(item));

  const onScroll = () => {
    if (!header || menu?.open || contact?.open || selector?.open) return;
    const current = scrollY;
    header.classList.toggle("is-scrolled", current > 24);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { signal, passive: true });

  dispose = () => {
    abort.abort();
    unbindTilt();
    unmountSelection();
    reveal.disconnect();
  };
}

document.addEventListener("astro:before-swap", () => dispose?.());
document.addEventListener("astro:page-load", mountProject);
if (document.readyState !== "loading") mountProject();
else document.addEventListener("DOMContentLoaded", mountProject, { once: true });
