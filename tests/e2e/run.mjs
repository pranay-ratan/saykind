// Runs every browser suite in order against BASE_URL and fails if any suite fails.
import { spawnSync } from "node:child_process";

import { existsSync } from "node:fs";

const SUITES = ["smoke.mjs", "flow.mjs", "conversation.mjs", "report.mjs"].filter((name) => existsSync(new URL(`./${name}`, import.meta.url)));
let failed = false;
for (const suite of SUITES) {
  console.log(`\n== ${suite}`);
  const result = spawnSync(process.execPath, [new URL(`./${suite}`, import.meta.url).pathname], { stdio: "inherit", env: process.env });
  if (result.status !== 0) failed = true;
}
process.exitCode = failed ? 1 : 0;
