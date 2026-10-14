import type { Metadata } from "next";

import { auth } from "@/auth";
import { PageHeader } from "@/components/layout/page-header";
import {
  GeneralSettingsForm,
  type SettingsInitial,
} from "@/components/settings/settings-client";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const scope = organizationId ?? 0;

  const settings = await prisma.generalSetting.findFirst({
    where: { organizationId: scope },
  });

  const initial: SettingsInitial = {
    appName: settings?.appName ?? "",
    currency: settings?.currency ?? "INR",
    timezone: settings?.timezone ?? "Asia/Kolkata",
    dateFormat: settings?.dateFormat ?? "d M, Y",
    logo: settings?.logo ?? "",
    favicon: settings?.favicon ?? "",
    defaultGateway: settings?.defaultGateway ?? "manual",
    paymentCredentialsJson: settings?.paymentCredentials
      ? JSON.stringify(settings.paymentCredentials, null, 2)
      : "",
    maintenanceMode: settings?.maintenanceMode === 1,
    maintenanceMessage: settings?.maintenanceMessage ?? "",
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Organization-wide defaults, payment gateway and maintenance mode."
      />
      <GeneralSettingsForm initial={initial} />
    </>
  );
}
