export function setupAnchorWheelNavigation({ signal } = {}) {
  const anchors = [...document.querySelectorAll("[data-scroll-anchor]")];
  if (anchors.length < 2) return () => {};

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
    const minimumAdvance = Math.max(4, Math.min(96, window.innerHeight * 0.12));
    if (direction > 0) {
      return anchors.find((anchor) => anchorTop(anchor) > currentTop + minimumAdvance) ?? null;
    }
    for (let index = anchors.length - 1; index >= 0; index -= 1) {
      if (anchorTop(anchors[index]) < currentTop - minimumAdvance) return anchors[index];
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
  }, { passive: false, signal });

  return () => {
    window.clearTimeout(unlockTimer);
    window.clearTimeout(accumulationTimer);
    document.documentElement.removeAttribute("data-scroll-state");
  };
}
