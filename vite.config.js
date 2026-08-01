import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

const projectDirectory = fileURLToPath(new URL(".", import.meta.url));
const pagesDirectory = fileURLToPath(new URL("./pages", import.meta.url));
const publicDirectory = fileURLToPath(new URL("./public", import.meta.url));
const distDirectory = fileURLToPath(new URL("./dist", import.meta.url));
const sourceDirectory = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  root: pagesDirectory,
  publicDir: publicDirectory,
  resolve: {
    alias: [{ find: /^\/src\//, replacement: `${sourceDirectory}/` }],
  },
  server: {
    fs: { allow: [projectDirectory] },
  },
  build: {
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
