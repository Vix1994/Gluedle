import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import type { Connect } from "vite";

const projectDirectory = fileURLToPath(new URL(".", import.meta.url));
const pagesDirectory = fileURLToPath(new URL("./pages", import.meta.url));
const publicDirectory = fileURLToPath(new URL("./public", import.meta.url));
const distDirectory = fileURLToPath(new URL("./dist", import.meta.url));
const sourceDirectory = fileURLToPath(new URL("./src", import.meta.url));
const noSlashRoutes = new Set(["/concept", "/visuals", "/glue", "/gluedle", "/catalog"]);

function rewriteNoSlashRoute(
  request: Connect.IncomingMessage,
  _response: Parameters<Connect.NextHandleFunction>[1],
  next: Connect.NextFunction,
): void {
  const requestPath = request.url;
  if (!["GET", "HEAD"].includes(request.method ?? "") || !requestPath) {
    next();
    return;
  }

  const requestUrl = new URL(requestPath, "http://localhost");
  if (noSlashRoutes.has(requestUrl.pathname)) {
    requestUrl.pathname = `${requestUrl.pathname}/`;
    request.url = `${requestUrl.pathname}${requestUrl.search}`;
  }
  next();
}

export default defineConfig({
  root: pagesDirectory,
  publicDir: publicDirectory,
  plugins: [{
    name: "gluedle-no-slash-routes",
    configureServer(server) {
      server.middlewares.use(rewriteNoSlashRoute);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewriteNoSlashRoute);
    },
  }],
  resolve: {
    alias: [{ find: /^\/src\//, replacement: `${sourceDirectory}/` }],
  },
  server: {
    fs: { allow: [projectDirectory] },
  },
  build: {
    cssTarget: "ios15",
    outDir: distDirectory,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: fileURLToPath(new URL("./pages/index.html", import.meta.url)),
        concept: fileURLToPath(new URL("./pages/concept/index.html", import.meta.url)),
        visuals: fileURLToPath(new URL("./pages/visuals/index.html", import.meta.url)),
        glue: fileURLToPath(new URL("./pages/glue/index.html", import.meta.url)),
        gluedle: fileURLToPath(new URL("./pages/gluedle/index.html", import.meta.url)),
        catalog: fileURLToPath(new URL("./pages/catalog/index.html", import.meta.url)),
      },
    },
  },
});
