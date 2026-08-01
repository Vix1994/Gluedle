import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: fileURLToPath(new URL("./index.html", import.meta.url)),
        concept: fileURLToPath(new URL("./concept/index.html", import.meta.url)),
        visuals: fileURLToPath(new URL("./visuals/index.html", import.meta.url)),
        glue: fileURLToPath(new URL("./glue/index.html", import.meta.url)),
        gluedle: fileURLToPath(new URL("./gluedle/index.html", import.meta.url)),
      },
    },
  },
});
