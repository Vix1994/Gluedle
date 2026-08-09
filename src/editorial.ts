import { setupAnchorWheelNavigation } from "./anchor-wheel-navigation.ts";

export function mountEditorial() {
const abortController = new AbortController();
const observers: IntersectionObserver[] = [];
const progress = document.querySelector<HTMLElement>("[data-app-progress]");
const header = document.querySelector<HTMLElement>("[data-app-header-element]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

setupReveals();
setupScrollState();
setupPointerMotion();
const clearWheelNavigation = setupAnchorWheelNavigation({ signal: abortController.signal });

function setupReveals() {
  const reveals = [...document.querySelectorAll(".reveal")];
  if (!("IntersectionObserver" in window)) {
    reveals.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.12 });
  reveals.forEach((element) => observer.observe(element));
  observers.push(observer);
}

function setupScrollState() {
  let ticking = false;
  const update = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    if (progress) progress.style.transform = `scaleX(${ratio})`;
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 20);
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }, { passive: true, signal: abortController.signal });
  update();
}

function setupPointerMotion() {
  if (reducedMotion.matches || !window.matchMedia("(pointer: fine)").matches) return;
  const fields = [...document.querySelectorAll<HTMLElement>("[data-motion]")];
  if (!fields.length) return;

  window.addEventListener("pointermove", (event) => {
    const x = (event.clientX / window.innerWidth - 0.5) * 2;
    const y = (event.clientY / window.innerHeight - 0.5) * 2;
    fields.forEach((field, index) => {
      const depth = index % 2 === 0 ? 1 : -0.65;
      field.style.setProperty("--motion-x", `${x * 10 * depth}px`);
      field.style.setProperty("--motion-y", `${y * 8 * depth}px`);
    });
  }, { passive: true, signal: abortController.signal });
}

return () => {
  abortController.abort();
  observers.forEach((observer) => observer.disconnect());
  clearWheelNavigation();
  header?.classList.remove("is-scrolled");
};
}
