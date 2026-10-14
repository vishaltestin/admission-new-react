import type { Metadata } from "next";

import { auth } from "@/auth";
import { TemplatesTab, type TemplateRow } from "@/components/templates/templates-client";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Templates" };

function toRow(template: {
  id: number;
  title: string | null;
  category: string | null;
  sendBy: string | null;
  message: string;
  variables: unknown;
  sentCount: number;
  status: string;
  subject?: string | null;
}): TemplateRow {
  return {
    id: template.id,
    title: template.title ?? "Untitled",
    category: template.category,
    sendBy: template.sendBy,
    subject: template.subject ?? null,
    message: template.message,
    variables: Array.isArray(template.variables)
      ? (template.variables as string[]).filter((v) => typeof v === "string")
      : [],
    sentCount: template.sentCount,
    active: template.status === "active",
  };
}

export default async function TemplatesPage() {
  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const scope = organizationId != null ? { organizationId } : {};

  const [emails, sms, whatsapp] = await Promise.all([
    prisma.emailTemplate.findMany({
      where: scope,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.messageTemplate.findMany({
      where: scope,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.whatsappTemplate.findMany({
      where: scope,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Message Templates"
        description="Reusable content for email, SMS and WhatsApp outreach."
      />
      <Tabs defaultValue="email">
        <TabsList>
          <TabsTrigger value="email">Email ({emails.length})</TabsTrigger>
          <TabsTrigger value="sms">SMS ({sms.length})</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp ({whatsapp.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="email" className="mt-4">
          <TemplatesTab channel="email" rows={emails.map(toRow)} />
        </TabsContent>
        <TabsContent value="sms" className="mt-4">
          <TemplatesTab channel="sms" rows={sms.map(toRow)} />
        </TabsContent>
        <TabsContent value="whatsapp" className="mt-4">
          <TemplatesTab channel="whatsapp" rows={whatsapp.map(toRow)} />
        </TabsContent>
      </Tabs>
    </>
  );
}
