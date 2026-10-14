import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

// Next.js 16 "proxy" (formerly middleware). Uses the edge-safe auth
// config only; the actual credential verification happens in auth.ts
// inside the Node.js runtime.
const { auth } = NextAuth(authConfig);

export const proxy = auth;

export const config = {
  // Run on everything except Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
