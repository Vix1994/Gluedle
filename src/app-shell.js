const ROUTES = new Map([
  ["/", { label: "GLUE", controller: "home" }],
  ["/concept/", { label: "概念", controller: "editorial" }],
  ["/visuals/", { label: "影像", controller: "editorial", paper: true }],
  ["/glue/", { label: "单曲", controller: "editorial" }],
  ["/gluedle/", { label: "Gluedle", controller: "gluedle" }],
  ["/catalog/", { label: "曲库", controller: "catalog", nav: false }],
]);

const NAV_ITEMS = [...ROUTES]
  .filter(([, route]) => route.nav !== false)
  .map(([href, route]) => ({ href, label: route.label }));

export function createAppShell(mountController) {
  const host = document.querySelector("[data-app-header]");
  let routeView = document.querySelector("[data-route-view]");
  let routeStyle = findRouteStyle(document);
  if (!host || !routeView || !routeStyle) throw new Error("The shared app shell is incomplete.");

  host.innerHTML = headerMarkup();
  const header = host.querySelector("[data-app-header-element]");
  const action = host.querySelector("[data-app-action]");
  const progress = host.querySelector("[data-app-progress]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let currentCleanup = () => {};
  let navigating = false;

  const normalizePath = (pathname) => {
    if (pathname === "/") return "/";
    return pathname.endsWith("/") ? pathname : `${pathname}/`;
  };

  const currentRoute = () => ROUTES.get(normalizePath(window.location.pathname)) ?? ROUTES.get("/");

  const updateHeader = () => {
    const pathname = normalizePath(window.location.pathname);
    const route = ROUTES.get(pathname) ?? ROUTES.get("/");
    header.classList.toggle("is-paper", route.paper === true);
    header.classList.toggle("is-scrolled", window.scrollY > 20);
    host.querySelectorAll(".app-nav a").forEach((link) => {
      const isCurrent = normalizePath(new URL(link.href).pathname) === pathname;
      if (isCurrent) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    const inGame = pathname === "/gluedle/";
    action.innerHTML = inGame
      ? "HOW TO PLAY <span aria-hidden=\"true\">?</span>"
      : "PLAY GLUEDLE <span aria-hidden=\"true\">↗</span>";
    action.setAttribute("aria-label", inGame ? "打开玩法说明" : "进入 Gluedle");
  };

  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    progress.style.transform = `scaleX(${ratio})`;
    header.classList.toggle("is-scrolled", window.scrollY > 20);
  };

  const activateController = () => {
    currentCleanup();
    currentCleanup = mountController(currentRoute().controller) ?? (() => {});
    updateHeader();
    updateProgress();
  };

  const loadStyle = (href) => new Promise((resolve, reject) => {
    if (routeStyle.href === href) {
      resolve(() => {});
      return;
    }
    const previousStyle = routeStyle;
    const nextStyle = routeStyle.cloneNode();
    nextStyle.href = href;
    nextStyle.media = "not all";
    nextStyle.addEventListener("load", () => {
      resolve(() => {
        nextStyle.removeAttribute("media");
        previousStyle.remove();
        routeStyle = nextStyle;
      });
    }, { once: true });
    nextStyle.addEventListener("error", () => {
      nextStyle.remove();
      reject(new Error(`Unable to load route stylesheet: ${href}`));
    }, { once: true });
    routeStyle.after(nextStyle);
  });

  const swapRoute = async (destination, push = true) => {
    const pathname = normalizePath(destination.pathname);
    const route = ROUTES.get(pathname);
    if (!route || navigating) return;
    navigating = true;
    routeView.setAttribute("aria-busy", "true");

    try {
      const response = await fetch(destination.href, { headers: { "X-Glue-Route": "partial" } });
      if (!response.ok) throw new Error(`Route request failed: ${response.status}`);
      const parsed = new DOMParser().parseFromString(await response.text(), "text/html");
      const nextView = parsed.querySelector("[data-route-view]");
      const nextStyle = findRouteStyle(parsed);
      if (!nextView || !nextStyle) throw new Error("Route response is missing its view or stylesheet.");
      const activateStyle = await loadStyle(
        new URL(nextStyle.getAttribute("href"), destination.href).href,
      );

      const commit = () => {
        currentCleanup();
        currentCleanup = () => {};
        activateStyle();
        routeView.replaceWith(nextView);
        routeView = nextView;
        syncDocument(parsed);
        if (push) history.pushState({}, "", destination.href);
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        activateController();
        document.querySelector("[data-route-view] main")?.focus({ preventScroll: true });
      };

      if (!reducedMotion.matches && typeof document.startViewTransition === "function") {
        await document.startViewTransition(commit).finished;
      } else commit();
    } catch (error) {
      console.error(error);
      window.location.assign(destination.href);
    } finally {
      navigating = false;
      document.querySelector("[data-route-view]")?.removeAttribute("aria-busy");
    }
  };

  const navigate = (href) => {
    const destination = new URL(href, window.location.href);
    if (normalizePath(destination.pathname) === normalizePath(window.location.pathname)) return;
    void swapRoute(destination);
  };

  document.addEventListener("click", (event) => {
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) return;
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!link || link.target || link.hasAttribute("download")) return;
    const destination = new URL(link.href, window.location.href);
    if (destination.origin !== window.location.origin || !ROUTES.has(normalizePath(destination.pathname))) return;
    if (destination.hash && normalizePath(destination.pathname) === normalizePath(window.location.pathname)) return;
    event.preventDefault();
    navigate(destination.href);
  });

  action.addEventListener("click", () => {
    if (normalizePath(window.location.pathname) === "/gluedle/") {
      document.dispatchEvent(new CustomEvent("glue:open-help"));
      return;
    }
    navigate("/gluedle/");
  });

  window.addEventListener("popstate", () => void swapRoute(new URL(window.location.href), false));
  window.addEventListener("scroll", updateProgress, { passive: true });
  activateController();

  return { navigate };
}

function headerMarkup() {
  const links = NAV_ITEMS.map(({ href, label }) => `<a href="${href}">${label}</a>`).join("");
  return `
    <header class="app-header" data-app-header-element>
      <a class="app-wordmark" href="/" aria-label="GLUE 首页">GLUE</a>
      <nav class="app-nav" aria-label="专辑页面">${links}</nav>
      <div class="app-header-actions">
        <a
          class="app-listen-action"
          href="https://y.qq.com/n/ryqq/songDetail/000Q9lzD0ag0YJ"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="在 QQ 音乐收听《Glue》（新窗口）"
        >立即收听 <span aria-hidden="true">↗</span></a>
        <button class="app-header-action" type="button" data-app-action></button>
      </div>
      <div class="app-progress" aria-hidden="true"><span data-app-progress></span></div>
    </header>
  `;
}

function syncDocument(parsed) {
  document.title = parsed.title;
  document.body.className = parsed.body.className;
  for (const name of ["data-page", "data-game-state", "data-attempts", "data-mobile-banner"]) {
    const value = parsed.body.getAttribute(name);
    if (value === null) document.body.removeAttribute(name);
    else document.body.setAttribute(name, value);
  }
  document.body.style.removeProperty("--attempt-progress");
  for (const selector of ['meta[name="description"]', 'meta[name="theme-color"]']) {
    const current = document.head.querySelector(selector);
    const next = parsed.head.querySelector(selector);
    if (current && next) current.setAttribute("content", next.getAttribute("content") ?? "");
  }
}

function findRouteStyle(documentNode) {
  return documentNode.querySelector("[data-route-style]")
    ?? [...documentNode.querySelectorAll('link[rel="stylesheet"]')].at(-1)
    ?? null;
}
