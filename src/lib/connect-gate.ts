/**
 * QR entry gate for the connection form.
 *
 * A QR code encodes `/qr/<token>` where `<token>` is derived from the
 * `QR_CONNECT_SECRET` Worker secret. Scanning it stores a signed, expiring
 * cookie and redirects to the clean `/conectar` URL. Visitors who type or
 * bookmark `/conectar` without that cookie are bounced to `/visitanos`.
 *
 * No session storage is involved: token and cookie are HMAC-signed values
 * derived from the same secret, verified with WebCrypto in the Worker.
 */

/** Where non-QR visitors (and expired/invalid cookies) are sent. */
export const VISITANOS_PATH = "/visitanos";

/** Canonical URLs of the gated flow. */
export const CONNECT_PATH = "/conectar";
export const CONNECT_THANKS_PATH = "/conectar/gracias";
export const CONNECT_API_PATH = "/api/conectar";

/** QR entry URL prefix: `/qr/<token>`. */
export const CONNECT_ENTRY_PREFIX = "/qr/";

export const CONNECT_COOKIE_NAME = "ibv_conexion";

/** Cookie lifetime in seconds. */
export const CONNECT_COOKIE_MAX_AGE = 60 * 60 * 24;

/**
 * Redirect status for the gate. `304 Not Modified` is a cache response and
 * cannot redirect a browser, so the gate uses `302 Found`.
 */
export const GATE_REDIRECT_STATUS = 302;

const ENTRY_TOKEN_CONTEXT = "connect-entry:v1";
const COOKIE_CONTEXT = "connect-cookie:v1";
const encoder = new TextEncoder();

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};

const sign = async (secret: string, value: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
};

/** Constant-time string comparison (length differences leak only the length). */
export const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
};

/** Token encoded in the printed QR code. Rotating the secret invalidates it. */
export const deriveConnectEntryToken = (secret: string): Promise<string> =>
  sign(secret, ENTRY_TOKEN_CONTEXT);

export const verifyConnectEntryToken = async (token: string, secret: string): Promise<boolean> => {
  if (!token || !secret) {
    return false;
  }
  return timingSafeEqual(token, await deriveConnectEntryToken(secret));
};

/**
 * Signed, expiring cookie value: `<expiresAt>.<hmac>`.
 * `expiresAt` is a Unix timestamp in seconds.
 */
export const buildConnectCookieValue = async (
  secret: string,
  now = Date.now(),
): Promise<string> => {
  const expiresAt = Math.floor(now / 1000) + CONNECT_COOKIE_MAX_AGE;
  return `${expiresAt}.${await sign(secret, `${COOKIE_CONTEXT}:${expiresAt}`)}`;
};

export const verifyConnectCookieValue = async (
  value: string | undefined,
  secret: string,
  now = Date.now(),
): Promise<boolean> => {
  if (!value || !secret) {
    return false;
  }
  const separator = value.indexOf(".");
  if (separator < 1) {
    return false;
  }
  const expiresAtRaw = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  if (!/^\d+$/.test(expiresAtRaw) || !signature) {
    return false;
  }
  const expiresAt = Number(expiresAtRaw);
  if (expiresAt * 1000 <= now) {
    return false;
  }
  return timingSafeEqual(signature, await sign(secret, `${COOKIE_CONTEXT}:${expiresAt}`));
};

/** Paths that require a valid QR cookie. */
const GATED_PATHS = new Set<string>([
  CONNECT_PATH,
  `${CONNECT_PATH}/`,
  CONNECT_THANKS_PATH,
  `${CONNECT_THANKS_PATH}/`,
  CONNECT_API_PATH,
  `${CONNECT_API_PATH}/`,
]);

export const isConnectEntryPath = (pathname: string): boolean =>
  pathname.startsWith(CONNECT_ENTRY_PREFIX);

export const isConnectGatePath = (pathname: string): boolean => GATED_PATHS.has(pathname);
