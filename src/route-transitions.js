const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const supportsNativeTransitions = typeof document.startViewTransition === "function";

if (!supportsNativeTransitions) {
  document.documentElement.classList.add("route-transition-fallback");
  document.addEventListener("click", handleRouteClick);
  window.addEventListener("pageshow", () => {
    delete document.documentElement.dataset.routeTransition;
  });
}

function handleRouteClick(event) {
  if (
    event.defaultPrevented
    || event.button !== 0
    || event.metaKey
    || event.ctrlKey
    || event.shiftKey
    || event.altKey
    || reducedMotion.matches
  ) return;

  const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!link || link.target || link.hasAttribute("download")) return;

  const destination = new URL(link.href, window.location.href);
  const current = new URL(window.location.href);
  if (
    destination.origin !== current.origin
    || (destination.pathname === current.pathname && destination.search === current.search)
    || destination.protocol !== "http:" && destination.protocol !== "https:"
  ) return;

  event.preventDefault();
  document.documentElement.dataset.routeTransition = "leaving";
  window.setTimeout(() => window.location.assign(destination.href), 230);
}
