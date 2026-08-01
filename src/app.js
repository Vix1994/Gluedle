import { createAppShell } from "./app-shell.js";
import { mountCatalog } from "./catalog.js";
import { mountEditorial } from "./editorial.js";
import { mountGluedle } from "./gluedle.js";
import { mountHome } from "./main.js";

document.documentElement.classList.add("js");

const controllers = {
  catalog: mountCatalog,
  home: mountHome,
  editorial: mountEditorial,
  gluedle: mountGluedle,
};

createAppShell((name) => controllers[name]?.());
