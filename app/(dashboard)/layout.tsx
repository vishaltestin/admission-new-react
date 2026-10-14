import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const name =
    session.user.name || session.user.email || "Account";

  // Maintenance mode: non-admin users see a notice instead of the dashboard.
  const roleSlug = (session.user as { role?: string | null }).role ?? "";
  const isAdmin =
    session.user.organizationId == null || roleSlug.toLowerCase().includes("admin");
  if (!isAdmin && session.user.organizationId != null) {
    const settings = await prisma.generalSetting.findFirst({
      where: { organizationId: session.user.organizationId },
      select: { maintenanceMode: true, maintenanceMessage: true },
    });
    if (settings?.maintenanceMode === 1) {
      return (
        <main className="flex min-h-screen items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="text-4xl">🛠️</div>
            <h1 className="mt-4 text-2xl font-semibold">Maintenance in progress</h1>
            <p className="mt-2 text-muted-foreground">
              {settings.maintenanceMessage ||
                "We are performing scheduled maintenance. Please check back soon."}
            </p>
          </div>
        </main>
      );
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          name,
          email: session.user.email ?? "",
          role: session.user.role,
        }}
        organizationName={session.user.organizationName}
      />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2" />
          <div className="text-sm font-medium text-muted-foreground">
            {session.user.organizationName ?? "DF CRM"}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 space-y-6 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
