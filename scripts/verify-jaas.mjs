/**
 * Checks that JaaS credentials in .env.local can actually sign a token.
 *
 *   node scripts/verify-jaas.mjs
 *
 * Prints pass/fail and the non-secret JWT header and claims only. It never
 * prints the private key, any part of it, or the signed token — a token is
 * a live credential and a key fragment is a key.
 *
 * Written as a file rather than piped through a shell heredoc on purpose:
 * escape sequences like \n do not survive that intact, which previously
 * made a perfectly good key look corrupt.
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { SignJWT, importPKCS8, decodeJwt, decodeProtectedHeader } from "jose";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV = join(ROOT, ".env.local");

if (!existsSync(ENV)) {
  console.error("No .env.local found.");
  process.exit(1);
}

for (const line of readFileSync(ENV, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !process.env[m[1]]) {
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const APP_ID = process.env.JAAS_APP_ID;
const KID = process.env.JAAS_API_KEY_ID;
const RAW = process.env.JAAS_PRIVATE_KEY;

const missing = [
  ["JAAS_APP_ID", APP_ID],
  ["JAAS_API_KEY_ID", KID],
  ["JAAS_PRIVATE_KEY", RAW],
].filter(([, v]) => !v);

if (missing.length) {
  console.error("Missing: " + missing.map(([k]) => k).join(", "));
  process.exit(1);
}

// Same normalisation lib/jaas.ts does, so this tests the real path.
let pem = RAW.trim();
if (!pem.includes("BEGIN")) {
  pem = Buffer.from(pem, "base64").toString("utf8").trim();
}
pem = pem.replace(/\\n/g, "\n");

const lines = pem.split("\n").length;
console.log(`PEM         : ${lines} lines, ${pem.includes("BEGIN PRIVATE KEY") ? "PKCS#8" : "UNEXPECTED FORMAT"}`);

if (lines < 3) {
  console.error(
    "\nFAILED: the key is on one line — newline escapes were not applied.\n" +
      "Re-run: node scripts/jaas-key.mjs <path-to-private-key>"
  );
  process.exit(1);
}

try {
  const key = await importPKCS8(pem, "RS256");
  console.log("key import  : OK");

  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    aud: "jitsi",
    iss: "chat",
    sub: APP_ID,
    room: "roster-verify-only",
    context: {
      user: { id: "verify", name: "Verification", moderator: "true" },
      features: { recording: false, livestreaming: false },
    },
  })
    .setProtectedHeader({ alg: "RS256", kid: KID, typ: "JWT" })
    .setIssuedAt(now)
    .setNotBefore(now - 10)
    .setExpirationTime(now + 3600)
    .sign(key);

  const h = decodeProtectedHeader(jwt);
  const p = decodeJwt(jwt);

  console.log(`sign        : OK (${jwt.length} chars, not shown)`);
  console.log(`header      : alg=${h.alg} typ=${h.typ}`);
  console.log(`  kid       : ${h.kid === KID ? "matches JAAS_API_KEY_ID" : "MISMATCH"}`);
  console.log(`claims      : aud=${p.aud} iss=${p.iss} room=${p.room}`);
  console.log(`  sub       : ${p.sub === APP_ID ? "matches JAAS_APP_ID" : "MISMATCH"}`);
  console.log(`  lifetime  : ${Math.round((p.exp - now) / 60)} min`);

  const kidPrefix = String(KID).split("/")[0];
  console.log(
    `key id shape: ${kidPrefix === APP_ID ? "prefix matches AppID" : "WARNING — prefix does not match AppID"}`
  );

  console.log("\nSigning path works. JaaS credentials are valid.");
} catch (err) {
  console.error(`\nFAILED: ${err.message}`);
  process.exit(1);
}
