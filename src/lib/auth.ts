import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role?: "CUSTOMER" | "ADMIN";
    };
  }
  interface User {
    role?: "CUSTOMER" | "ADMIN";
  }
}

const config: NextAuthConfig = {
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const customer = await prisma.customer.findUnique({
          where: { email: String(credentials.email) },
          select: { id: true, email: true, firstName: true, passwordHash: true, isAdmin: true },
        });
        if (!customer?.passwordHash) return null;
        const valid = await bcrypt.compare(String(credentials.password), customer.passwordHash);
        if (!valid) return null;
        return {
          id: customer.id,
          email: customer.email,
          name: customer.firstName ?? customer.email,
          role: customer.isAdmin ? ("ADMIN" as const) : ("CUSTOMER" as const),
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/logowanie" },
  callbacks: {
    jwt({ token, user }) {
      if (user?.role) token.role = user.role;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      const role = token.role;
      if (role === "CUSTOMER" || role === "ADMIN") {
        session.user.role = role;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
