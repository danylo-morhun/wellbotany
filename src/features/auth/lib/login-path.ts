import { headers } from "next/headers";
import { ADMIN_LOGIN_PATH } from "./admin-login-path";

/**
 * Where a sign-in / sign-out redirect should land. Server-action redirects are
 * rendered without passing the proxy, so they must name the right page directly.
 */
export async function loginPath(): Promise<string> {
  const adminHost = process.env.ADMIN_HOST;
  if (!adminHost) return "/logowanie";
  return (await headers()).get("host") === adminHost ? ADMIN_LOGIN_PATH : "/logowanie";
}
