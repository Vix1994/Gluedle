import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const testsDirectory = fileURLToPath(new URL("../tests/", import.meta.url));
const testFiles = readdirSync(testsDirectory, { encoding: "utf8", recursive: true })
  .filter((path) => path.endsWith(".test.ts"))
  .map((path) => join(testsDirectory, path))
  .sort();

if (testFiles.length === 0) {
  throw new Error(`No TypeScript test files found in ${testsDirectory}`);
}

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", ...testFiles],
  { stdio: "inherit" },
);

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
