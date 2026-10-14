"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  UsersRound,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/layout/nav-user";

export type SidebarUser = {
  name: string;
  email: string;
  role: string | null;
};

const navGroups: {
  label: string;
  items: { title: string; url: string; icon: typeof LayoutDashboard; exact?: boolean }[];
}[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "CRM",
    items: [{ title: "Leads", url: "/leads", icon: UsersRound }],
  },
  {
    label: "Masters",
    items: [{ title: "Lead Masters", url: "/masters", icon: SlidersHorizontal }],
  },
  {
    label: "Administration",
    items: [
      { title: "Users", url: "/users", icon: Users },
      { title: "Roles", url: "/roles", icon: ShieldCheck },
    ],
  },
];

export function AppSidebar({
  user,
  organizationName,
}: {
  user: SidebarUser;
  organizationName: string | null;
}) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Building2 className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">DF CRM</span>
                  <span className="text-xs text-muted-foreground">
                    {organizationName ?? "Lead Management"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.url
                    : pathname === item.url || pathname.startsWith(`${item.url}/`);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                      >
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
