import { createAppShell } from "./app-shell.ts";
import { mountCatalog } from "./catalog.ts";
import { mountEditorial } from "./editorial.ts";
import { mountGluedle } from "./gluedle.ts";
import { mountHome } from "./main.ts";

document.documentElement.classList.add("js");

const controllers = {
  catalog: mountCatalog,
  home: mountHome,
  editorial: mountEditorial,
  gluedle: mountGluedle,
};

createAppShell((name) => controllers[name]?.());
