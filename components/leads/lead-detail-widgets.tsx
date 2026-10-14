"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  addLeadNote,
  assignLead,
  logCommunication,
  updateLeadStatus,
} from "@/lib/actions/lead-actions";
import {
  assignFormSchema,
  communicationFormSchema,
  noteFormSchema,
  statusChangeFormSchema,
  type AssignFormData,
  type CommunicationFormData,
  type NoteFormData,
  type StatusChangeFormData,
} from "@/lib/validations/lead";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteLeadNote } from "@/lib/actions/lead-actions";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";

import type { SelectOption, StatusOption } from "./lead-form";

/* ---------------------------------------------------------------------------
 * Status change
 * ------------------------------------------------------------------------- */

export function StatusChangeForm({
  leadId,
  statuses,
  currentStatusId,
  currentSubStatusId,
  currentFollowup,
}: {
  leadId: number;
  statuses: StatusOption[];
  currentStatusId: number | null;
  currentSubStatusId: number | null;
  currentFollowup: string; // datetime-local value
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<StatusChangeFormData>({
    resolver: zodResolver(statusChangeFormSchema),
    defaultValues: {
      leadStatusId: currentStatusId ? String(currentStatusId) : "",
      leadSubStatusId: currentSubStatusId ? String(currentSubStatusId) : "",
      nextFollowupAt: currentFollowup,
      note: "",
    },
  });

  const watchStatus = form.watch("leadStatusId");
  const subStatusOptions =
    statuses.find((s) => String(s.id) === watchStatus)?.subStatuses ?? [];

  function onSubmit(values: StatusChangeFormData) {
    startTransition(async () => {
      const result = await updateLeadStatus({ leadId, ...values });
      if (!result.success) {
        toast.error(result.message ?? "Could not update the status");
        return;
      }
      toast.success(result.message ?? "Status updated");
      form.setValue("note", "");
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <FormField
          control={form.control}
          name="leadStatusId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  form.setValue("leadSubStatusId", "");
                }}
                value={field.value ?? ""}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {statuses.map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {option.name}
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
          name="leadSubStatusId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sub-status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {subStatusOptions.map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {option.name}
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
          name="nextFollowupAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Next follow-up</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (optional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="Why is the status changing?"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Update status
        </Button>
      </form>
    </Form>
  );
}

/* ---------------------------------------------------------------------------
 * Assignment
 * ------------------------------------------------------------------------- */

export function AssignForm({
  leadId,
  users,
  currentAssigneeId,
}: {
  leadId: number;
  users: SelectOption[];
  currentAssigneeId: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<AssignFormData>({
    resolver: zodResolver(assignFormSchema),
    defaultValues: {
      leadAssignTo: currentAssigneeId ? String(currentAssigneeId) : "none",
    },
  });

  function onSubmit(values: AssignFormData) {
    startTransition(async () => {
      const result = await assignLead({ leadId, leadAssignTo: values.leadAssignTo });
      if (!result.success) {
        toast.error(result.message ?? "Could not update the assignment");
        return;
      }
      toast.success(result.message ?? "Assignment updated");
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-2">
        <FormField
          control={form.control}
          name="leadAssignTo"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Assigned counselor</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? "none"}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users.map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Assign
        </Button>
      </form>
    </Form>
  );
}

/* ---------------------------------------------------------------------------
 * Add note (notes tab)
 * ------------------------------------------------------------------------- */

export function AddNoteForm({ leadId }: { leadId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: { note: "" },
  });

  function onSubmit(values: NoteFormData) {
    startTransition(async () => {
      const result = await addLeadNote({ leadId, note: values.note });
      if (!result.success) {
        toast.error(result.message ?? "Could not add the note");
        return;
      }
      toast.success(result.message ?? "Note added");
      form.reset();
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Write a note about this lead…"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Add note
        </Button>
      </form>
    </Form>
  );
}

export function DeleteNoteButton({ noteId, leadId }: { noteId: number; leadId: number }) {
  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Delete note"
        >
          <Trash2 />
        </Button>
      }
      title="Delete this note?"
      description="This permanently removes the note. This cannot be undone."
      action={() => deleteLeadNote(noteId, leadId)}
    />
  );
}

/* ---------------------------------------------------------------------------
 * Log a communication (call / email / sms / whatsapp)
 * ------------------------------------------------------------------------- */

const channels = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "whatsapp", label: "WhatsApp" },
] as const;

export function LogCommunicationForm({ leadId }: { leadId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<CommunicationFormData>({
    resolver: zodResolver(communicationFormSchema),
    defaultValues: { channel: "call", purpose: "" },
  });

  function onSubmit(values: CommunicationFormData) {
    startTransition(async () => {
      const result = await logCommunication({ leadId, ...values });
      if (!result.success) {
        toast.error(result.message ?? "Could not log the communication");
        return;
      }
      toast.success(result.message ?? "Logged");
      form.reset({ channel: "call", purpose: "" });
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <FormField
          control={form.control}
          name="channel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Channel</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.value} value={channel.value}>
                      {channel.label}
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
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Remark</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Follow-up call" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" variant="outline" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Log communication
        </Button>
      </form>
    </Form>
  );
}

export function WidgetBody({ children }: { children: ReactNode }) {
  return <div className="px-6 pb-6">{children}</div>;
}
