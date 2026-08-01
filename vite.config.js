import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: fileURLToPath(new URL("./index.html", import.meta.url)),
        gluedle: fileURLToPath(new URL("./gluedle.html", import.meta.url)),
      },
    },
  },
});
