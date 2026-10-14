"use client";

import { useEffect, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";

import {
  createCampaign,
  createMarketingEvent,
  deleteCampaign,
  deleteMarketingEvent,
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

function CampaignDialog({
  trigger,
  events,
  initial,
}: {
  trigger: ReactNode;
  events: EventOption[];
  initial?: CampaignRow;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: initial
      ? {
          name: initial.name,
          subject: initial.subject ?? "",
          type: initial.type ?? "",
          status: initial.status ?? "draft",
          marketingEventId: initial.marketingEventId ? String(initial.marketingEventId) : "",
        }
      : { name: "", subject: "", type: "email", status: "draft", marketingEventId: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        initial
          ? {
              name: initial.name,
              subject: initial.subject ?? "",
              type: initial.type ?? "email",
              status: initial.status ?? "draft",
              marketingEventId: initial.marketingEventId
                ? String(initial.marketingEventId)
                : "",
            }
          : { name: "", subject: "", type: "email", status: "draft", marketingEventId: "" },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

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
}: {
  rows: CampaignRow[];
  events: EventOption[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Track marketing campaigns and attribute leads to them.
        </p>
        <CampaignDialog
          events={events}
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
              <TableHead>Status</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Leads</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={6} message="No campaigns yet." />
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
                    {row.type ? (
                      <Badge variant="outline" className="capitalize">
                        {row.type}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        row.status === "active"
                          ? "capitalize text-emerald-600 dark:text-emerald-400"
                          : "capitalize"
                      }
                    >
                      {row.status ?? "draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.marketingEventName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.leadCount}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <CampaignDialog
                        events={events}
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
