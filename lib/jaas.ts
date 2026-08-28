import { SignJWT, importPKCS8 } from "jose";

/**
 * 8x8 JaaS (Jitsi as a Service) token minting.
 *
 * The meeting runs in an iframe on our own page rather than sending people
 * to 8x8.vc, and access is controlled entirely by this JWT — JaaS will not
 * admit anyone without one.
 *
 * Server-only. The private key signs tokens that grant entry to meetings
 * billed to our account; anything that leaks it lets a stranger run
 * meetings on our bill. Never import this from a client component and
 * never give any of these vars a NEXT_PUBLIC_ prefix.
 */

const APP_ID = process.env.JAAS_APP_ID;
const KEY_ID = process.env.JAAS_API_KEY_ID;
const PRIVATE_KEY = process.env.JAAS_PRIVATE_KEY;

export function isJaasConfigured() {
  return Boolean(APP_ID && KEY_ID && PRIVATE_KEY);
}

export function getJaasAppId() {
  return APP_ID || null;
}

/**
 * PEM keys are multi-line and .env files are not, so the key is usually
 * pasted with literal "\n" sequences. Accept either that or a real
 * multi-line value, and accept base64 for people who would rather not
 * think about it at all.
 */
function normalizeKey(raw: string) {
  let key = raw.trim();
  if (!key.includes("BEGIN")) {
    try {
      key = Buffer.from(key, "base64").toString("utf8").trim();
    } catch {
      /* fall through — the import below will produce the real error */
    }
  }
  return key.replace(/\\n/g, "\n");
}

export interface JaasUser {
  id: string;
  name: string;
  email?: string | null;
  avatar?: string | null;
  moderator?: boolean;
}

/**
 * Mints a token for ONE room.
 *
 * The `room` claim is deliberately the specific room rather than the "*"
 * wildcard the docs allow. A wildcard token is a skeleton key: it would let
 * whoever holds it walk into any meeting on the account, including
 * conversations they are not part of.
 *
 * Short-lived for the same reason — a token that leaks stops working
 * within the hour rather than lasting a day.
 */
export async function mintJaasToken(room: string, user: JaasUser) {
  if (!isJaasConfigured()) {
    throw new Error("JaaS is not configured on the server.");
  }

  const key = await importPKCS8(normalizeKey(PRIVATE_KEY!), "RS256");
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    aud: "jitsi",
    iss: "chat",
    sub: APP_ID!,
    room,
    context: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email || undefined,
        avatar: user.avatar || undefined,
        // JaaS expects these as strings, not booleans.
        moderator: user.moderator ? "true" : "false",
      },
      features: {
        // Both parties can share a screen — reviewing a cut or a contact
        // sheet is most of the point of a call on this platform.
        "screen-sharing": true,
        // Off deliberately. Recording a call without both parties
        // understanding it is a consent problem, not a feature flag, and
        // livestreaming has no place in a private client conversation.
        livestreaming: false,
        recording: false,
        transcription: false,
        "sip-inbound-call": false,
        "sip-outbound-call": false,
        "outbound-call": false,
      },
    },
  })
    .setProtectedHeader({ alg: "RS256", kid: KEY_ID!, typ: "JWT" })
    .setIssuedAt(now)
    .setNotBefore(now - 10) // small skew allowance between our clock and 8x8's
    .setExpirationTime(now + 60 * 60)
    .sign(key);
}

/** The full room path JaaS expects: the AppID namespaces every room. */
export function namespacedRoom(room: string) {
  return `${APP_ID}/${room}`;
}
