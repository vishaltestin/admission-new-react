import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.email().max(191),
  password: z.string().min(1).max(128),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            roles: { include: { role: true } },
            organization: true,
          },
        });

        if (!user || user.status !== 1) return null;

        const passwordValid = await bcrypt.compare(password, user.password);
        if (!passwordValid) return null;

        // Fire-and-forget last login update – do not block sign-in on it.
        prisma.user
          .update({ where: { id: user.id }, data: { lastLogin: new Date() } })
          .catch(() => {});

        const primaryRole = user.roles[0]?.role ?? null;

        return {
          id: String(user.id),
          email: user.email,
          name:
            [user.firstName, user.lastName].filter(Boolean).join(" ") ||
            user.email,
          roleId: primaryRole?.id ?? null,
          role: primaryRole?.name ?? null,
          roleSlug: primaryRole?.slug ?? null,
          organizationId: user.organizationId,
          organizationName: user.organization?.name ?? null,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roleId = user.roleId;
        token.role = user.role;
        token.roleSlug = user.roleSlug;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.roleId = (token.roleId as number | null) ?? null;
        session.user.role = (token.role as string | null) ?? null;
        session.user.roleSlug = (token.roleSlug as string | null) ?? null;
        session.user.organizationId =
          (token.organizationId as number | null) ?? null;
        session.user.organizationName =
          (token.organizationName as string | null) ?? null;
      }
      return session;
    },
  },
});
