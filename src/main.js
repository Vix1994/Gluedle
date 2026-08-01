import { siteContent } from "./data/catalog.js";
import { setupAnchorWheelNavigation } from "./anchor-wheel-navigation.js";

export function mountHome() {
const abortController = new AbortController();
const observers = [];
const elements = {
  header: document.querySelector("[data-app-header-element]"),
};

hydrateContent();
setupPageMotion();
const clearWheelNavigation = setupAnchorWheelNavigation({ signal: abortController.signal });

function hydrateContent() {
  setText("[data-content='conceptLead']", siteContent.concept.paragraphs[0]);
  setText(
    "[data-content='conceptBody']",
    siteContent.concept.paragraphs.slice(1).join("\n"),
  );
  setText("[data-content='storyIntro']", siteContent.story.intro);

  const releasedTrack = siteContent.release.tracks[0];
  setText("[data-release-label]", siteContent.release.label);
  setText("[data-release-count]", siteContent.release.countLabel);
  setText("[data-release-position]", releasedTrack.position);
  setText("[data-release-title]", releasedTrack.title);
  setText("[data-current-year]", String(new Date().getFullYear()));
}

function setupPageMotion() {
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12 });
    reveals.forEach((element) => revealObserver.observe(element));
    observers.push(revealObserver);
  } else {
    reveals.forEach((element) => element.classList.add("is-visible"));
  }

  const sections = [...document.querySelectorAll("main > section[id]")];
  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const active = entries.find((entry) => entry.isIntersecting);
      if (!active) return;
      elements.header?.classList.toggle(
        "is-paper",
        active.target.classList.contains("chapter--paper"),
      );
    }, { rootMargin: "-35% 0px -55%", threshold: 0 });
    sections.forEach((section) => sectionObserver.observe(section));
    observers.push(sectionObserver);
  }
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element && value) element.textContent = value;
}

return () => {
  abortController.abort();
  observers.forEach((observer) => observer.disconnect());
  clearWheelNavigation();
  elements.header?.classList.remove("is-paper");
};
}
