import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth configuration.
 *
 * This file must NOT import anything that depends on Node.js APIs
 * (prisma, bcrypt, ...) so it can be used by the Next.js proxy
 * (`proxy.ts`) which runs in the Edge runtime.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      const isAuthRoute = path.startsWith("/api/auth");
      // Inbound provider webhooks authenticate with their own tokens.
      const isPublicApi = path.startsWith("/api/integrations");
      const isLoginPage = path === "/login";

      if (isAuthRoute || isPublicApi) return true;

      if (isLoginPage) {
        // Already logged-in users should not see the login page.
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) {
        // Returning `false` redirects to the configured sign-in page.
        return false;
      }
      return true;
    },
  },
  providers: [], // Providers are registered in auth.ts (Node runtime)
} satisfies NextAuthConfig;
