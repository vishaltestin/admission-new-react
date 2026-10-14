import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Pencil, Phone, Trash2 } from "lucide-react";

import { auth } from "@/auth";
import {
  AddNoteForm,
  AssignForm,
  DeleteNoteButton,
  LogCommunicationForm,
  StatusChangeForm,
} from "@/components/leads/lead-detail-widgets";
import {
  SendMessageDialog,
  type TemplateOption,
} from "@/components/leads/send-message-dialog";
import { StatusBadge } from "@/components/leads/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteLead } from "@/lib/actions/lead-actions";
import { formatDateTime, toDateTimeLocal } from "@/lib/format";
import { getLeadFormOptions } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Lead details" };

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value ?? "—"}</span>
    </div>
  );
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leadId = Number(id);
  if (!Number.isInteger(leadId)) notFound();

  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const scope = organizationId != null ? { organizationId } : {};

  const [lead, options, emailTemplates, smsTemplates, whatsappTemplates] = await Promise.all([
    prisma.lead.findFirst({
      where: { id: leadId, ...scope },
      include: {
        status: true,
        subStatus: true,
        source: true,
        type: true,
        institute: true,
        programme: true,
        campaign: true,
        assignee: true,
        creator: true,
        notes: {
          orderBy: { createdAt: "desc" },
          include: { creator: true },
        },
        communications: { orderBy: { createdAt: "desc" }, take: 50 },
        activityLogs: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { user: true },
        },
      },
    }),
    getLeadFormOptions(organizationId),
    prisma.emailTemplate.findMany({
      where: { ...scope, status: "active" },
      orderBy: { title: "asc" },
    }),
    prisma.messageTemplate.findMany({
      where: { ...scope, status: "active" },
      orderBy: { title: "asc" },
    }),
    prisma.whatsappTemplate.findMany({
      where: { ...scope, status: "active" },
      orderBy: { title: "asc" },
    }),
  ]);

  if (!lead) notFound();

  const messageTemplates: Record<"email" | "sms" | "whatsapp", TemplateOption[]> = {
    email: emailTemplates.map((t: any) => ({
      id: t.id,
      name: t.title ?? `#${t.id}`,
      subject: t.subject,
      message: t.message,
    })),
    sms: smsTemplates.map((t: any) => ({
      id: t.id,
      name: t.title ?? `#${t.id}`,
      message: t.message,
    })),
    whatsapp: whatsappTemplates.map((t: any) => ({
      id: t.id,
      name: t.title ?? `#${t.id}`,
      message: t.message,
    })),
  };

  const statusOptions = options.statuses.map((s) => ({
    id: s.id,
    name: s.name,
    subStatuses: s.subStatuses.map((sub) => ({ id: sub.id, name: sub.name })),
  }));

  const userOptions = options.users.map((u) => ({
    id: u.id,
    name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
  }));

  const leadDisplayName = lead.name || lead.mobile;

  async function removeLead() {
    "use server";
    const result = await deleteLead(leadId);
    if (result.success) {
      redirect("/leads");
    }
    return result;
  }

  return (
    <>
      <Link
        href="/leads"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to leads
      </Link>

      <PageHeader
        title={leadDisplayName}
        description={
          [
            lead.email,
            lead.city ? [lead.city, lead.state].filter(Boolean).join(", ") : null,
          ]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        actions={
          <>
            <SendMessageDialog
              leadId={lead.id}
              templates={messageTemplates}
              trigger={
                <Button variant="outline">
                  <Mail />
                  Send message
                </Button>
              }
            />
            <Button asChild variant="outline">
              <Link href={`/leads/${lead.id}/edit`}>
                <Pencil />
                Edit
              </Link>
            </Button>
            <ConfirmDialog
              trigger={
                <Button variant="destructive" size="icon" aria-label="Delete lead">
                  <Trash2 />
                </Button>
              }
              title="Delete this lead?"
              description="This permanently removes the lead along with all notes and logs. This action cannot be undone."
              action={removeLead}
            />
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge name={lead.status?.name} color={lead.status?.color} />
        {lead.subStatus ? (
          <StatusBadge
            name={lead.subStatus.name}
            color={lead.subStatus.color}
          />
        ) : null}
        {lead.type ? <Badge variant="secondary">{lead.type.name}</Badge> : null}
        {lead.source ? <Badge variant="outline">{lead.source.name}</Badge> : null}
        {lead.nextFollowupAt ? (
          <Badge variant="outline" className="text-amber-600 dark:text-amber-400">
            Follow-up: {formatDateTime(lead.nextFollowupAt)}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Lead information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-x-8 sm:grid-cols-2">
              <div>
                <InfoRow
                  label="Mobile"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="size-3.5 text-muted-foreground" />
                      {lead.mobile}
                    </span>
                  }
                />
                <InfoRow label="Alternate mobile" value={lead.alternateMobile} />
                <InfoRow
                  label="Email"
                  value={
                    lead.email ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="size-3.5 text-muted-foreground" />
                        {lead.email}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
                <InfoRow
                  label="Location"
                  value={
                    [lead.city, lead.state, lead.country]
                      .filter(Boolean)
                      .join(", ") || "—"
                  }
                />
              </div>
              <div>
                <InfoRow label="Source" value={lead.source?.name} />
                <InfoRow label="Type" value={lead.type?.name} />
                <InfoRow label="Campaign" value={lead.campaign?.name} />
                <InfoRow label="Institute" value={lead.institute?.name} />
                <InfoRow label="Program" value={lead.programme?.name} />
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="notes">
            <TabsList>
              <TabsTrigger value="notes">
                Notes ({lead.notes.length})
              </TabsTrigger>
              <TabsTrigger value="activity">
                Activity ({lead.activityLogs.length})
              </TabsTrigger>
              <TabsTrigger value="communications">
                Communications ({lead.communications.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Add a note</CardTitle>
                </CardHeader>
                <CardContent>
                  <AddNoteForm leadId={lead.id} />
                </CardContent>
              </Card>
              <div className="mt-4 space-y-3">
                {lead.notes.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No notes yet.
                  </p>
                ) : (
                  lead.notes.map((note) => (
                    <Card key={note.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                          <DeleteNoteButton noteId={note.id} leadId={lead.id} />
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          {note.creator
                            ? [note.creator.firstName, note.creator.lastName]
                                .filter(Boolean)
                                .join(" ")
                            : "System"}
                          {" · "}
                          {formatDateTime(note.createdAt)}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Activity timeline</CardTitle>
                  <CardDescription>
                    Everything that happened on this lead.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {lead.activityLogs.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No activity recorded yet.
                    </p>
                  ) : (
                    <ol className="relative ml-2 space-y-6 border-l pl-6">
                      {lead.activityLogs.map((entry) => (
                        <li key={entry.id} className="relative">
                          <span className="absolute top-1.5 -left-[27px] size-2.5 rounded-full bg-primary ring-4 ring-background" />
                          <p className="text-sm font-medium">
                            {entry.action.replaceAll("_", " ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.user
                              ? [entry.user.firstName, entry.user.lastName]
                                  .filter(Boolean)
                                  .join(" ")
                              : "System"}
                            {" · "}
                            {formatDateTime(entry.createdAt)}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="communications" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Communication log</CardTitle>
                </CardHeader>
                <CardContent>
                  {lead.communications.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No communications logged yet.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {lead.communications.map((comm) => (
                        <li
                          key={comm.id}
                          className="flex items-center justify-between gap-4 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {comm.channel}
                            </Badge>
                            <span className="text-muted-foreground">
                              {comm.purpose || "—"}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(comm.createdAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Update status</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusChangeForm
                leadId={lead.id}
                statuses={statusOptions}
                currentStatusId={lead.leadStatusId}
                currentSubStatusId={lead.leadSubStatusId}
                currentFollowup={toDateTimeLocal(lead.nextFollowupAt)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <AssignForm
                leadId={lead.id}
                users={userOptions}
                currentAssigneeId={lead.leadAssignTo}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Log communication</CardTitle>
            </CardHeader>
            <CardContent>
              <LogCommunicationForm leadId={lead.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <InfoRow label="Lead ID" value={`#${lead.id}`} />
              <InfoRow label="Score" value={lead.leadScore} />
              <InfoRow label="Created" value={formatDateTime(lead.createdAt)} />
              <InfoRow label="Last updated" value={formatDateTime(lead.updatedAt)} />
              <Separator className="my-2" />
              <InfoRow
                label="Created by"
                value={
                  lead.creator
                    ? [lead.creator.firstName, lead.creator.lastName]
                        .filter(Boolean)
                        .join(" ")
                    : "—"
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
