import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { openTotpSecret, verifyTotp } from "@/features/auth/lib/totp";
import { prisma } from "./prisma";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role?: "CUSTOMER" | "ADMIN";
      /** Admin who hasn't set up TOTP yet: no admin rights, only /logowanie/2fa */
      totpSetup?: boolean;
    };
  }
  interface User {
    role?: "CUSTOMER" | "ADMIN";
    mfa?: boolean;
    totpSetup?: boolean;
  }
}

const config: NextAuthConfig = {
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
        code: { type: "text" },
      },
      // The TOTP check lives here, not only in the login action: Auth.js also
      // exposes POST /api/auth/callback/credentials, which skips the action.
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const customer = await prisma.customer.findUnique({
          where: { email: String(credentials.email) },
          select: {
            id: true,
            email: true,
            firstName: true,
            passwordHash: true,
            isAdmin: true,
            totpSecret: true,
            totpEnabledAt: true,
            totpLastStep: true,
          },
        });
        if (!customer?.passwordHash) return null;
        const valid = await bcrypt.compare(String(credentials.password), customer.passwordHash);
        if (!valid) return null;
        const user = {
          id: customer.id,
          email: customer.email,
          name: customer.firstName ?? customer.email,
        };

        if (!customer.isAdmin) return { ...user, role: "CUSTOMER" as const };
        // Admin without TOTP: signed in as a customer, sent to set it up
        if (!customer.totpEnabledAt || !customer.totpSecret) {
          return { ...user, role: "CUSTOMER" as const, totpSetup: true };
        }
        const step = verifyTotp(
          openTotpSecret(customer.totpSecret),
          String(credentials.code ?? ""),
          customer.totpLastStep,
        );
        if (step === null) return null;
        // Burn the step atomically so the same code can't sign in twice
        const { count } = await prisma.customer.updateMany({
          where: {
            id: customer.id,
            OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }],
          },
          data: { totpLastStep: step },
        });
        if (count === 0) return null;
        return { ...user, role: "ADMIN" as const, mfa: true };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/logowanie" },
  callbacks: {
    jwt({ token, user }) {
      if (user?.role) {
        token.role = user.role;
        token.mfa = user.mfa === true;
        token.totpSetup = user.totpSetup === true;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      const role = token.role;
      // Admin rights only for sessions that passed TOTP — older admin sessions
      // (issued before 2FA existed) drop to customer and must sign in again
      if (role === "ADMIN" && token.mfa === true) session.user.role = "ADMIN";
      else if (role === "CUSTOMER" || role === "ADMIN") session.user.role = "CUSTOMER";
      if (token.totpSetup === true) session.user.totpSetup = true;
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
