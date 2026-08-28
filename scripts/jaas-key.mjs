/**
 * Writes a downloaded JaaS private key into .env.local.
 *
 *   node scripts/jaas-key.mjs "C:/Users/you/Downloads/Key 8_28_2026.pk"
 *
 * 8x8 hands you a multi-line PEM file and .env.local needs one line per
 * variable, so this escapes the newlines and writes JAAS_PRIVATE_KEY for
 * you. Hand-editing a private key is where people paste half of it.
 *
 * Deliberately writes to the file rather than printing: a private key on
 * screen ends up in scrollback, screenshots, and terminal history. Nothing
 * here logs the key itself.
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV = join(ROOT, ".env.local");

const keyPath = process.argv[2];
if (!keyPath) {
  console.error(
    "Usage: node scripts/jaas-key.mjs <path-to-downloaded-private-key>\n\n" +
      "The file 8x8 gave you when you clicked Download on the RSA Private key."
  );
  process.exit(1);
}
if (!existsSync(keyPath)) {
  console.error(`No file at: ${keyPath}`);
  process.exit(1);
}

const pem = readFileSync(keyPath, "utf8").trim();

if (!pem.includes("BEGIN") || !pem.includes("PRIVATE KEY")) {
  console.error(
    "That doesn't look like a private key — no 'BEGIN ... PRIVATE KEY' header.\n" +
      "Check you downloaded the PRIVATE key, not the public one."
  );
  process.exit(1);
}
if (pem.includes("BEGIN PUBLIC KEY")) {
  console.error("That's the PUBLIC key. You want the private one.");
  process.exit(1);
}

// jose's importPKCS8 needs PKCS#8 ("BEGIN PRIVATE KEY"). Older tooling
// sometimes emits PKCS#1 ("BEGIN RSA PRIVATE KEY"), which would fail at
// signing time with an unhelpful error, so catch it here instead.
if (pem.includes("BEGIN RSA PRIVATE KEY")) {
  console.error(
    "This is a PKCS#1 key (BEGIN RSA PRIVATE KEY) and the signer needs PKCS#8.\n" +
      "Convert it with:\n" +
      `  openssl pkcs8 -topk8 -nocrypt -in "${keyPath}" -out jaas-pkcs8.pem\n` +
      "then re-run this against jaas-pkcs8.pem"
  );
  process.exit(1);
}

const oneLine = pem.replace(/\r?\n/g, "\\n");
const line = `JAAS_PRIVATE_KEY="${oneLine}"`;

let env = existsSync(ENV) ? readFileSync(ENV, "utf8") : "";

if (existsSync(ENV)) {
  copyFileSync(ENV, `${ENV}.bak`);
  console.log("Backed up .env.local -> .env.local.bak");
}

if (/^JAAS_PRIVATE_KEY=/m.test(env)) {
  env = env.replace(/^JAAS_PRIVATE_KEY=.*$/m, line);
  console.log("Replaced the existing JAAS_PRIVATE_KEY");
} else {
  if (env && !env.endsWith("\n")) env += "\n";
  env += `\n# 8x8 JaaS private key — signs meeting tokens. Server-only.\n${line}\n`;
  console.log("Added JAAS_PRIVATE_KEY");
}

writeFileSync(ENV, env, "utf8");

console.log(
  `\nWrote ${pem.split("\n").length} PEM lines into .env.local as one escaped line.\n` +
    "\nStill needed in .env.local:\n" +
    "  JAAS_APP_ID       your vpaas-magic-cookie-... AppID\n" +
    "  JAAS_API_KEY_ID   the Key ID from the API keys table\n" +
    "\nThen restart the dev server — Next only reads .env.local at startup."
);
