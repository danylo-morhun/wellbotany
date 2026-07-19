/** Shared in-memory stand-in for next/headers' cookies()/headers() in tests. */
export const cookieStore = new Map<string, string>();
export const headerStore = new Map<string, string>([["x-forwarded-for", "127.0.0.1"]]);

export function resetRequestState(): void {
  cookieStore.clear();
  headerStore.clear();
  headerStore.set("x-forwarded-for", "127.0.0.1");
}

export const nextHeadersMock = {
  cookies: async () => ({
    get: (name: string) =>
      cookieStore.has(name) ? { name, value: cookieStore.get(name) as string } : undefined,
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  }),
  headers: async () => ({
    get: (name: string) => headerStore.get(name.toLowerCase()) ?? null,
  }),
};
