import "./styles/site.css";

import { siteContent } from "./data/catalog.js";

document.documentElement.classList.add("js");

const elements = {
  header: document.querySelector("[data-header]"),
  progress: document.querySelector("[data-scroll-progress]"),
  nav: document.querySelector(".site-nav"),
};

hydrateContent();
setupPageMotion();

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
  } else {
    reveals.forEach((element) => element.classList.add("is-visible"));
  }

  const sections = [...document.querySelectorAll("main > section[id]")];
  const navLinks = [...elements.nav.querySelectorAll("a[href^='#']")];
  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const active = entries.find((entry) => entry.isIntersecting);
      if (!active) return;
      const id = `#${active.target.id}`;
      elements.header.classList.toggle("is-light", active.target.classList.contains("chapter--paper"));
      navLinks.forEach((link) => {
        if (link.getAttribute("href") === id) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-35% 0px -55%", threshold: 0 });
    sections.forEach((section) => sectionObserver.observe(section));
  }

  let ticking = false;
  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    elements.progress.style.transform = `scaleX(${ratio})`;
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateProgress);
  }, { passive: true });
  updateProgress();
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element && value) element.textContent = value;
}
