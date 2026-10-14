"use client";

import { useEffect, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarClock,
  CalendarX,
  Pencil,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  createCampaign,
  createMarketingEvent,
  deleteCampaign,
  deleteMarketingEvent,
  sendCampaignNow,
  setCampaignSchedule,
  updateCampaign,
  updateMarketingEvent,
} from "@/lib/actions/marketing-actions";
import {
  campaignFormSchema,
  marketingEventFormSchema,
  type CampaignFormData,
  type MarketingEventFormData,
} from "@/lib/validations/marketing";
import { formatDate } from "@/lib/format";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  CrudDialog,
  EmptyRow,
  SubmitButton,
  useCrudSubmit,
} from "@/components/crud";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type CampaignRow = {
  id: number;
  name: string;
  subject: string | null;
  type: string | null;
  status: string | null;
  marketingEventId: number | null;
  marketingEventName: string | null;
  leadCount: number;
  channel: string | null;
  templateId: number | null;
  templateName: string | null;
  audienceStatusId: number | null;
  scheduledAt: string | null;
  dispatchedLeadCount: number;
  lastError: string | null;
};

export type TemplateOption = { id: number; name: string };
export type TemplateOptions = Record<"email" | "sms" | "whatsapp", TemplateOption[]>;
export type StatusOption = { id: number; name: string };

/** ISO string -> `datetime-local` input value. */
const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export type MarketingEventRow = {
  id: number;
  name: string;
  description: string | null;
  date: string | null; // YYYY-MM-DD
  campaignCount: number;
};

type EventOption = { id: number; name: string };

const CAMPAIGN_TYPES = ["email", "sms", "whatsapp", "ads"] as const;
const CAMPAIGN_STATUSES = ["draft", "active", "paused", "completed"] as const;

/* ---------------------------------------------------------------------------
 * Campaigns
 * ------------------------------------------------------------------------- */

function campaignDefaults(initial?: CampaignRow): CampaignFormData {
  return initial
    ? {
        name: initial.name,
        subject: initial.subject ?? "",
        type: initial.type ?? "email",
        status: initial.status ?? "draft",
        marketingEventId: initial.marketingEventId
          ? String(initial.marketingEventId)
          : "",
        channel: initial.channel ?? "email",
        templateId: initial.templateId ? String(initial.templateId) : "",
        audienceStatusId: initial.audienceStatusId
          ? String(initial.audienceStatusId)
          : "",
        scheduledAt: toLocalInput(initial.scheduledAt),
      }
    : {
        name: "",
        subject: "",
        type: "email",
        status: "draft",
        marketingEventId: "",
        channel: "email",
        templateId: "",
        audienceStatusId: "",
        scheduledAt: "",
      };
}

function CampaignDialog({
  trigger,
  events,
  templates,
  statuses,
  initial,
}: {
  trigger: ReactNode;
  events: EventOption[];
  templates: TemplateOptions;
  statuses: StatusOption[];
  initial?: CampaignRow;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: campaignDefaults(initial),
  });

  useEffect(() => {
    if (open) form.reset(campaignDefaults(initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const channel = (form.watch("channel") ?? "email") as keyof TemplateOptions;
  const channelTemplates = templates[channel] ?? [];

  const { pending, submit } = useCrudSubmit<CampaignFormData>({
    form,
    close: () => setOpen(false),
    action: (values) =>
      initial ? updateCampaign(initial.id, values) : createCampaign(values),
  });

  return (
    <CrudDialog
      trigger={trigger}
      open={open}
      setOpen={setOpen}
      title={initial ? "Edit campaign" : "Add campaign"}
      description="Campaigns group outreach efforts; leads can be attributed to them."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Admissions 2026 – Awareness" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subject / tagline</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CAMPAIGN_TYPES.map((type) => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? "draft"}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CAMPAIGN_STATUSES.map((status) => (
                        <SelectItem key={status} value={status} className="capitalize">
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="marketingEventId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Marketing event</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={String(event.id)}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="rounded-lg border border-dashed p-3">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Delivery (for scheduled &amp; sent campaigns)
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="channel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Send via</FormLabel>
                      <Select
                        onValueChange={(v) => {
                          field.onChange(v);
                          form.setValue("templateId", "");
                        }}
                        value={field.value ?? "email"}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Channel" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["email", "sms", "whatsapp"].map((c) => (
                            <SelectItem key={c} value={c} className="capitalize">
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="templateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pick a template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {channelTemplates.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {t.name}
                            </SelectItem>
                          ))}
                          {channelTemplates.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No {channel} templates yet
                            </SelectItem>
                          ) : null}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="audienceStatusId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Audience (lead status)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="All leads" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">All leads in org</SelectItem>
                          {statuses.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              Only &ldquo;{s.name}&rdquo;
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scheduledAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scheduled send (optional)</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Leave empty and use “Send now” from the list instead.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <SubmitButton pending={pending}>
              {initial ? "Save changes" : "Create campaign"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </Form>
    </CrudDialog>
  );
}

export function CampaignsTab({
  rows,
  events,
  templates,
  statuses,
}: {
  rows: CampaignRow[];
  events: EventOption[];
  templates: TemplateOptions;
  statuses: StatusOption[];
}) {
  const router = useRouter();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Track marketing campaigns and attribute leads to them.
        </p>
        <CampaignDialog
          events={events}
          templates={templates}
          statuses={statuses}
          trigger={
            <Button size="sm">
              <Plus />
              Add campaign
            </Button>
          }
        />
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Leads</TableHead>
              <TableHead>Dispatched</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={8} message="No campaigns yet." />
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">{row.name}</div>
                    {row.subject ? (
                      <div className="max-w-72 truncate text-xs text-muted-foreground">
                        {row.subject}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {row.channel ? (
                      <Badge variant="outline" className="capitalize">
                        {row.channel}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="max-w-40 truncate text-muted-foreground">
                    {row.templateName ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant="outline"
                        className={
                          row.status === "dispatched"
                            ? "capitalize text-emerald-600 dark:text-emerald-400"
                            : row.status === "scheduled"
                              ? "capitalize text-blue-600 dark:text-blue-400"
                              : "capitalize"
                        }
                      >
                        {row.status ?? "draft"}
                      </Badge>
                      {row.status === "scheduled" && row.scheduledAt ? (
                        <span className="text-xs text-muted-foreground">
                          {new Date(row.scheduledAt).toLocaleString()}
                        </span>
                      ) : null}
                      {row.lastError ? (
                        <span className="max-w-48 text-xs text-amber-600">
                          {row.lastError}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.marketingEventName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.leadCount}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.status === "dispatched" ? row.dispatchedLeadCount : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {row.status !== "dispatched" && row.templateId && row.channel ? (
                        <ConfirmDialog
                          trigger={
                            <Button variant="ghost" size="icon-xs" aria-label="Send now" title="Send now">
                              <Send />
                            </Button>
                          }
                          title={`Send "${row.name}" now?`}
                          description={`Dispatches the ${row.channel} template to the audience immediately. This can't be undone.`}
                          confirmLabel="Send"
                          action={() => sendCampaignNow(row.id)}
                        />
                      ) : null}
                      {row.status === "scheduled" ? (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Clear schedule"
                          title="Clear schedule (back to draft)"
                          onClick={() =>
                            void setCampaignSchedule(row.id, null).then((r) => {
                              if (r.success) toast.success(r.message);
                              else toast.error(r.message ?? "Failed");
                              router.refresh();
                            })
                          }
                        >
                          <CalendarX />
                        </Button>
                      ) : null}
                      {row.status !== "dispatched" && row.scheduledAt === null && row.templateId && row.channel ? (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Schedule"
                          title="Save first with a scheduled time to schedule"
                          disabled
                        >
                          <CalendarClock />
                        </Button>
                      ) : null}
                      <CampaignDialog
                        events={events}
                        templates={templates}
                        statuses={statuses}
                        initial={row}
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Edit campaign">
                            <Pencil />
                          </Button>
                        }
                      />
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Delete campaign">
                            <Trash2 className="text-destructive" />
                          </Button>
                        }
                        title={`Delete campaign "${row.name}"?`}
                        description="Campaigns linked to leads cannot be deleted."
                        action={() => deleteCampaign(row.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Marketing events
 * ------------------------------------------------------------------------- */

function MarketingEventDialog({
  trigger,
  initial,
}: {
  trigger: ReactNode;
  initial?: MarketingEventRow;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<MarketingEventFormData>({
    resolver: zodResolver(marketingEventFormSchema),
    defaultValues: initial
      ? {
          name: initial.name,
          description: initial.description ?? "",
          date: initial.date ?? "",
        }
      : { name: "", description: "", date: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        initial
          ? {
              name: initial.name,
              description: initial.description ?? "",
              date: initial.date ?? "",
            }
          : { name: "", description: "", date: "" },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const { pending, submit } = useCrudSubmit<MarketingEventFormData>({
    form,
    close: () => setOpen(false),
    action: (values) =>
      initial ? updateMarketingEvent(initial.id, values) : createMarketingEvent(values),
  });

  return (
    <CrudDialog
      trigger={trigger}
      open={open}
      setOpen={setOpen}
      title={initial ? "Edit marketing event" : "Add marketing event"}
      description="Events mark fairs, webinars or open-house days."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Education Expo – Pragati Maidan" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <SubmitButton pending={pending}>
              {initial ? "Save changes" : "Create event"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </Form>
    </CrudDialog>
  );
}

export function MarketingEventsTab({ rows }: { rows: MarketingEventRow[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Marketing events such as expos, seminars and open-house days.
        </p>
        <MarketingEventDialog
          trigger={
            <Button size="sm">
              <Plus />
              Add event
            </Button>
          }
        />
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Campaigns</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={4} message="No marketing events yet." />
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">{row.name}</div>
                    {row.description ? (
                      <div className="max-w-96 truncate text-xs text-muted-foreground">
                        {row.description}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.date ? formatDate(row.date) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.campaignCount}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <MarketingEventDialog
                        initial={row}
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Edit event">
                            <Pencil />
                          </Button>
                        }
                      />
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Delete event">
                            <Trash2 className="text-destructive" />
                          </Button>
                        }
                        title={`Delete event "${row.name}"?`}
                        description="Events linked to campaigns cannot be deleted."
                        action={() => deleteMarketingEvent(row.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
