// Prints every variable named in .env.example as SET or MISSING. Never prints a value.
// Usage: npm run check:env
// Missing optional variables are fine: they have defaults. The summary says which features need a missing key.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED_FOR = {
  ELEVENLABS_API_KEY: "spoken audio and speech to text (the café)",
  ANTHROPIC_API_KEY: "the barista's conversation (Claude)",
  PERCEPTRON_API_KEY: "Level 2 object detection (VISION_PROVIDER=perceptron, the default)",
};

/** NAME=value lines. A leading "#" (a commented-out option) is allowed only for the template, which lists those names. */
function parseEnvFile(path, { includeCommented }) {
  if (!existsSync(path)) return null;
  const values = {};
  const pattern = includeCommented ? /^\s*(?:#\s*)?([A-Z][A-Z0-9_]+)=(.*)$/ : /^\s*([A-Z][A-Z0-9_]+)=(.*)$/;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = pattern.exec(line);
    if (match) values[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return values;
}

function main() {
  const template = parseEnvFile(resolve(process.cwd(), ".env.example"), { includeCommented: true });
  if (!template) {
    console.log("MISSING  .env.example was not found in the project root.");
    process.exit(1);
  }
  const local = parseEnvFile(resolve(process.cwd(), ".env.local"), { includeCommented: false }) ?? {};
  const names = Object.keys(template);
  const isSet = (name) => Boolean((process.env[name] ?? local[name] ?? "").trim());

  console.log(".env.local: " + (existsSync(resolve(process.cwd(), ".env.local")) ? "found" : "not found (create it from .env.example)"));
  console.log("");
  for (const name of names) {
    console.log(`${isSet(name) ? "SET    " : "MISSING"}  ${name}`);
  }

  const missingRequired = Object.keys(REQUIRED_FOR).filter((name) => !isSet(name));
  console.log("");
  if (missingRequired.length === 0) {
    console.log("All keys the default setup needs are present.");
  } else {
    console.log("Still needed for the default setup:");
    for (const name of missingRequired) console.log(`  ${name}: ${REQUIRED_FOR[name]}`);
    console.log("The app still starts. Those features show a friendly message until the key is added.");
  }
}

main();
