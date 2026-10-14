import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roleId: number | null;
      role: string | null;
      roleSlug: string | null;
      organizationId: number | null;
      organizationName: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    roleId?: number | null;
    role?: string | null;
    roleSlug?: string | null;
    organizationId?: number | null;
    organizationName?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    roleId?: number | null;
    role?: string | null;
    roleSlug?: string | null;
    organizationId?: number | null;
    organizationName?: string | null;
  }
}
