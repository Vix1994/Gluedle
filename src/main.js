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
setupAnchorWheelNavigation();

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

function setupAnchorWheelNavigation() {
  const anchors = [...document.querySelectorAll("[data-scroll-anchor]")];
  if (anchors.length < 2) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const triggerDistance = 24;
  let accumulatedDistance = 0;
  let accumulatedDirection = 0;
  let snapping = false;
  let lockUntil = 0;
  let unlockTimer = 0;
  let accumulationTimer = 0;

  const anchorTop = (anchor) => {
    const scrollMargin = Number.parseFloat(window.getComputedStyle(anchor).scrollMarginTop) || 0;
    return Math.max(0, Math.round(window.scrollY + anchor.getBoundingClientRect().top - scrollMargin));
  };

  const nextAnchor = (direction) => {
    const currentTop = window.scrollY;
    const tolerance = 4;
    if (direction > 0) {
      return anchors.find((anchor) => anchorTop(anchor) > currentTop + tolerance) ?? null;
    }
    for (let index = anchors.length - 1; index >= 0; index -= 1) {
      if (anchorTop(anchors[index]) < currentTop - tolerance) return anchors[index];
    }
    return null;
  };

  const nestedScrollerCanMove = (target, direction) => {
    if (!(target instanceof Element)) return false;
    let element = target;
    while (element && element !== document.body) {
      const { overflowY } = window.getComputedStyle(element);
      const canScroll = /(auto|scroll)/.test(overflowY)
        && element.scrollHeight > element.clientHeight + 1;
      if (canScroll) {
        const hasRoom = direction > 0
          ? element.scrollTop + element.clientHeight < element.scrollHeight - 1
          : element.scrollTop > 1;
        if (hasRoom) return true;
      }
      element = element.parentElement;
    }
    return false;
  };

  const scheduleUnlock = () => {
    window.clearTimeout(unlockTimer);
    unlockTimer = window.setTimeout(() => {
      const remaining = lockUntil - performance.now();
      if (remaining > 0) {
        scheduleUnlock();
        return;
      }
      snapping = false;
      document.documentElement.removeAttribute("data-scroll-state");
    }, Math.max(80, lockUntil - performance.now()));
  };

  const prolongLock = (minimumDuration = 180) => {
    lockUntil = Math.max(lockUntil, performance.now() + minimumDuration);
    scheduleUnlock();
  };

  window.addEventListener("wheel", (event) => {
    if (event.defaultPrevented || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      return;
    }

    const direction = Math.sign(event.deltaY);
    if (!direction || nestedScrollerCanMove(event.target, direction)) return;

    if (snapping) {
      event.preventDefault();
      prolongLock();
      return;
    }

    const target = nextAnchor(direction);
    if (!target) return;

    event.preventDefault();
    const deltaScale = event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? window.innerHeight
        : 1;

    if (direction !== accumulatedDirection) accumulatedDistance = 0;
    accumulatedDirection = direction;
    accumulatedDistance += Math.abs(event.deltaY * deltaScale);
    window.clearTimeout(accumulationTimer);
    accumulationTimer = window.setTimeout(() => {
      accumulatedDistance = 0;
      accumulatedDirection = 0;
    }, 180);
    if (accumulatedDistance < triggerDistance) return;

    window.clearTimeout(accumulationTimer);
    accumulatedDistance = 0;
    snapping = true;
    lockUntil = performance.now() + 650;
    document.documentElement.dataset.scrollState = "snapping";
    window.scrollTo({
      top: anchorTop(target),
      behavior: reducedMotion.matches ? "auto" : "smooth",
    });
    scheduleUnlock();
  }, { passive: false });
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element && value) element.textContent = value;
}
