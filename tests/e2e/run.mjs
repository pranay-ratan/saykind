// Runs every browser suite in order against BASE_URL and fails if any suite fails.
import { spawnSync } from "node:child_process";

import { existsSync } from "node:fs";

const SUITES = [
  { file: "smoke.mjs" },
  { file: "welcome.mjs" },
  { file: "level1-shift.mjs" },
  { file: "level2-mic.mjs" },
  { file: "level2-confirm.mjs" },
  { file: "flow.mjs" },
  { file: "conversation.mjs" },
  { file: "report.mjs" },
  { file: "motion.mjs" },
  { file: "audit.mjs", env: { AUDIT_STRICT: "1", AUDIT_WIDTH: "375" }, label: "audit.mjs at 375px" },
  { file: "audit.mjs", env: { AUDIT_STRICT: "1", AUDIT_WIDTH: "1280" }, label: "audit.mjs at 1280px" },
].filter((suite) => existsSync(new URL(`./${suite.file}`, import.meta.url)));
let failed = false;
for (const suite of SUITES) {
  console.log(`\n== ${suite.label ?? suite.file}`);
  const result = spawnSync(process.execPath, [new URL(`./${suite.file}`, import.meta.url).pathname], { stdio: "inherit", env: { ...process.env, ...suite.env } });
  if (result.status !== 0) failed = true;
}
process.exitCode = failed ? 1 : 0;
