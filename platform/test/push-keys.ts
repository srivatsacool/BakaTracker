/**
 * Deterministic Web Push crypto helpers for worker-side tests.
 *
 * Pure WebCrypto (runs identically in Node and the workerd vitest pool) —
 * no network, no real push service. Keys are generated fresh per call;
 * the VAPID keypair is a TEST keypair and is never committed anywhere.
 */
import type { PushSubscription } from "@block65/webcrypto-web-push";

export function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Generate a fresh P-256 keypair, returning its JWK (x/y/d base64url). */
export async function generateP256Jwk(): Promise<{ x: string; y: string; d: string }> {
  const kp = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
  return { x: jwk.x as string, y: jwk.y as string, d: jwk.d as string };
}

/** 65-byte uncompressed EC point (0x04 || x || y), base64url, no padding. */
export function uncompressedPointB64url(x: string, y: string): string {
  const raw = new Uint8Array(65);
  raw[0] = 4;
  raw.set(b64urlToBytes(x), 1);
  raw.set(b64urlToBytes(y), 33);
  return b64url(raw);
}

/** A VAPID config shaped like webpush.ts's VapidConfig (test keys only). */
export async function testVapidKeys(): Promise<{
  subject: string;
  publicKey: string;
  privateKey: string;
}> {
  const jwk = await generateP256Jwk();
  return {
    subject: "mailto:test@bakatracker.app",
    publicKey: uncompressedPointB64url(jwk.x, jwk.y),
    privateKey: jwk.d,
  };
}

/**
 * A realistic browser `PushSubscription` with REAL crypto keys
 * (p256dh = 65-byte point, auth = 16 bytes) — the exact shape
 * `pushManager.subscribe()` produces and the REST route stores.
 */
export async function testBrowserSubscription(endpoint?: string): Promise<PushSubscription> {
  const jwk = await generateP256Jwk();
  const auth = crypto.getRandomValues(new Uint8Array(16));
  return {
    endpoint:
      endpoint ??
      `https://updates.push.example.com/wpush/v2/gAAAAA${b64url(crypto.getRandomValues(new Uint8Array(18)))}`,
    expirationTime: null,
    keys: {
      p256dh: uncompressedPointB64url(jwk.x, jwk.y),
      auth: b64url(auth),
    },
  };
}
