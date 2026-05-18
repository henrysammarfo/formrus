import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type WalrusJwtClaim = {
  exp: number;
  jti: string;
  iat: number;
  epochs: number;
  max_size: number;
  send_object_to?: string;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;
const walrusRateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
const DEFAULT_WALRUS_MAX_PUBLISH_BYTES = 50 * 1024 * 1024;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function readSecret(env: unknown, key: string): string | undefined {
  if (env && typeof env === "object" && key in env) {
    const value = (env as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const viteValue = viteEnv?.[key];
  if (typeof viteValue === "string" && viteValue.trim()) return viteValue.trim();

  if (typeof process !== "undefined") {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return undefined;
}

function readNumber(env: unknown, key: string, fallback: number): number {
  const value = Number(readSecret(env, key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function jsonResponse(payload: unknown, status: number, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function getClientKey(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown-client";
}

function enforceWalrusRateLimit(request: Request, env: unknown): Response | null {
  const limit = readNumber(env, "WALRUS_RATE_LIMIT_MAX_WRITES", 5);
  const windowMs = readNumber(env, "WALRUS_RATE_LIMIT_WINDOW_MS", 60_000);
  const now = Date.now();
  const key = getClientKey(request);
  const bucket = walrusRateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    walrusRateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  bucket.count += 1;
  if (bucket.count <= limit) return null;

  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return jsonResponse({ error: "Walrus publish rate limit exceeded", retryAfterSeconds }, 429, {
    "retry-after": String(retryAfterSeconds),
    "cache-control": "no-store",
  });
}

function isAllowedContentType(contentType: string, allowedRules: string[]): boolean {
  const normalized = contentType.split(";")[0]?.trim().toLowerCase() || "application/octet-stream";
  return allowedRules.some((rule) => {
    const allowed = rule.trim().toLowerCase();
    if (!allowed || allowed === "*/*") return true;
    if (allowed.endsWith("/*")) return normalized.startsWith(`${allowed.slice(0, -2)}/`);
    return normalized === allowed;
  });
}

async function readBoundedBody(request: Request, env: unknown): Promise<ArrayBuffer | Response> {
  const maxBytes = readNumber(env, "WALRUS_MAX_PUBLISH_BYTES", DEFAULT_WALRUS_MAX_PUBLISH_BYTES);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxBytes) {
    return jsonResponse({ error: `Walrus publish body exceeds ${maxBytes} bytes` }, 413, {
      "cache-control": "no-store",
    });
  }

  const body = await request.arrayBuffer();
  if (body.byteLength > maxBytes) {
    return jsonResponse({ error: `Walrus publish body exceeds ${maxBytes} bytes` }, 413, {
      "cache-control": "no-store",
    });
  }
  return body;
}

function base64UrlEncode(input: string | ArrayBuffer): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeJwtSecret(secret: string): ArrayBuffer {
  const trimmed = secret.trim();
  if (/^0x[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0) {
    const hex = trimmed.slice(2);
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes.buffer;
  }

  return new TextEncoder().encode(trimmed).buffer;
}

function createJti(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes.buffer);
}

async function signWalrusPublisherJwt(env: unknown, claim: WalrusJwtClaim): Promise<string | null> {
  const secret = readSecret(env, "WALRUS_PUBLISHER_JWT_SECRET");
  if (!secret) return null;

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaim = base64UrlEncode(JSON.stringify(claim));
  const signingInput = `${encodedHeader}.${encodedClaim}`;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    decodeJwtSecret(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

function buildPublisherUrl(publisherUrl: string, epochs: number, sendObjectTo?: string): string {
  const url = new URL(`${publisherUrl}/v1/blobs`);
  url.searchParams.set("epochs", String(epochs));
  if (sendObjectTo) url.searchParams.set("send_object_to", sendObjectTo);
  return url.toString();
}

async function handleWalrusPublisherProxy(request: Request, env: unknown): Promise<Response> {
  if (request.method !== "PUT") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const publisherUrl = readSecret(env, "WALRUS_PUBLISHER_URL")?.replace(/\/$/, "");
  if (!publisherUrl) {
    return jsonResponse({ error: "WALRUS_PUBLISHER_URL is not configured" }, 503);
  }

  const rateLimitResponse = enforceWalrusRateLimit(request, env);
  if (rateLimitResponse) return rateLimitResponse;

  const requestUrl = new URL(request.url);
  const configuredEpochs = readSecret(env, "WALRUS_EPOCHS") || "5";
  const maxEpochs = readNumber(env, "WALRUS_MAX_EPOCHS", Number(configuredEpochs) || 5);
  const requestedEpochs = Number(requestUrl.searchParams.get("epochs") || configuredEpochs);
  const epochs = clampNumber(Number.isFinite(requestedEpochs) ? requestedEpochs : 1, 1, maxEpochs);
  const contentType = request.headers.get("content-type") || "application/octet-stream";
  const allowedContentTypes = (
    readSecret(env, "WALRUS_ALLOWED_CONTENT_TYPES") ||
    "application/json,image/*,video/*,application/pdf,text/plain,text/csv"
  )
    .split(",")
    .map((rule) => rule.trim())
    .filter(Boolean);
  if (!isAllowedContentType(contentType, allowedContentTypes)) {
    return jsonResponse(
      { error: `Content type ${contentType} is not allowed for Walrus publishing` },
      415,
      { "cache-control": "no-store" },
    );
  }

  const boundedBody = await readBoundedBody(request, env);
  if (boundedBody instanceof Response) return boundedBody;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const jwtTtlSeconds = readNumber(env, "WALRUS_PUBLISHER_JWT_EXP_SECONDS", 60);
  const sendObjectTo = readSecret(env, "WALRUS_PUBLISHER_SEND_OBJECT_TO");
  const jwt = await signWalrusPublisherJwt(env, {
    exp: nowSeconds + jwtTtlSeconds,
    iat: nowSeconds,
    jti: createJti(),
    epochs,
    max_size: boundedBody.byteLength,
    ...(sendObjectTo ? { send_object_to: sendObjectTo } : {}),
  });
  const headers: HeadersInit = { "content-type": contentType };
  if (jwt) headers.authorization = `Bearer ${jwt}`;

  const upstream = await fetch(buildPublisherUrl(publisherUrl, epochs, sendObjectTo), {
    method: "PUT",
    headers,
    body: boundedBody,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: {
      "content-type": upstream.headers.get("content-type") || "application/json",
      "cache-control": "no-store",
    },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} - try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/walrus/blobs") {
        return await handleWalrusPublisherProxy(request, env);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
