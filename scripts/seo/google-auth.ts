// Access token for Google APIs (Search Console, Merchant, Analytics) from the
// service-account key in ~/.config/wellbotany/google-sa.json — JWT RS256
// grant, no googleapis dependency. The key never leaves this process.
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

type ServiceAccount = { client_email: string; private_key: string; token_uri: string };

export const SCOPES = {
  merchant: "https://www.googleapis.com/auth/content",
  searchConsole: "https://www.googleapis.com/auth/webmasters",
  analytics: "https://www.googleapis.com/auth/analytics.readonly",
};

export async function googleToken(scope: string): Promise<string> {
  const sa = JSON.parse(
    readFileSync(`${homedir()}/.config/wellbotany/google-sa.json`, "utf8"),
  ) as ServiceAccount;
  const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: sa.client_email,
    scope,
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(unsigned), sa.private_key)
    .toString("base64url");
  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${unsigned}.${signature}`,
  });
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new Error(`Google token error: ${res.status}`);
  return body.access_token;
}

export const MERCHANT_ACCOUNT = "5837849185";

/** GET/POST against the Merchant API with a fresh token. */
export async function merchantFetch(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://merchantapi.googleapis.com/${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}
