export type ShoperClientOptions = {
  /**
   * Override base URL. Otherwise uses SHOPER_API_BASE_URL.
   * Example: "https://twoj-sklep.pl/webapi/rest"
   */
  baseUrl?: string;
  /**
   * Override token. Otherwise uses SHOPER_API_TOKEN.
   */
  token?: string;
  /**
   * Override client id. Otherwise uses SHOPER_CLIENT_ID.
   */
  clientId?: string;
};

export type ShoperRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  headers?: Record<string, string | undefined>;
};

export class ShoperHttpError extends Error {
  readonly status: number;
  readonly responseBody: string;

  constructor(params: { message: string; status: number; responseBody: string }) {
    super(params.message);
    this.name = "ShoperHttpError";
    this.status = params.status;
    this.responseBody = params.responseBody;
  }
}

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, "");
}

function buildUrl(baseUrl: string, path: string, query?: ShoperRequestOptions["query"]): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${normalizeBaseUrl(baseUrl)}${p}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === null || v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function env(name: string): string {
  return process.env[name] ?? "";
}

function authHeaders(params: { token: string; clientId?: string }): Record<string, string> {
  // Shoper “external integration” header conventions can vary depending on
  // enabled auth mode; keep this configurable via env without code changes.
  const tokenHeader = env("SHOPER_TOKEN_HEADER") || "Authorization";
  const tokenPrefix = env("SHOPER_TOKEN_PREFIX") || "Bearer";
  const clientIdHeader = env("SHOPER_CLIENT_ID_HEADER") || "X-Client-Id";

  return {
    ...(tokenHeader === "Authorization"
      ? { Authorization: `${tokenPrefix} ${params.token}`.trim() }
      : { [tokenHeader]: params.token }),
    ...(params.clientId ? { [clientIdHeader]: params.clientId } : {}),
  };
}

export async function shoperRequest<T>(
  path: string,
  options: ShoperRequestOptions = {},
  clientOptions: ShoperClientOptions = {},
): Promise<T> {
  const baseUrl = clientOptions.baseUrl ?? env("SHOPER_API_BASE_URL");
  const token = clientOptions.token ?? env("SHOPER_API_TOKEN");
  const clientId = clientOptions.clientId ?? env("SHOPER_CLIENT_ID");

  if (!baseUrl) throw new Error("Missing env SHOPER_API_BASE_URL");
  if (!token) throw new Error("Missing env SHOPER_API_TOKEN");

  const method = options.method ?? "GET";
  const url = buildUrl(baseUrl, path, options.query);

  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...authHeaders({ token, clientId }),
      ...(options.headers ?? {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const responseBody = await res.text().catch(() => "");
    throw new ShoperHttpError({
      message: `Shoper HTTP ${res.status} for ${method} ${path}`,
      status: res.status,
      responseBody,
    });
  }

  // Some endpoints may return empty bodies (204, etc.)
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
