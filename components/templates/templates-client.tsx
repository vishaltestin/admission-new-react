"use client";

import { useEffect, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  createTemplate,
  deleteTemplate,
  updateTemplate,
  type TemplateChannel,
} from "@/lib/actions/template-actions";
import {
  TEMPLATE_VARIABLES,
  templateFormSchema,
  type TemplateFormData,
} from "@/lib/validations/templates";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  ActiveCell,
  CrudDialog,
  EmptyRow,
  SubmitButton,
  SwitchFormField,
  useCrudSubmit,
} from "@/components/crud";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export type TemplateRow = {
  id: number;
  title: string;
  category: string | null;
  sendBy: string | null;
  subject: string | null;
  message: string;
  variables: string[];
  sentCount: number;
  active: boolean;
};

const CHANNEL_LABEL: Record<TemplateChannel, string> = {
  email: "email",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

function TemplateDialog({
  trigger,
  channel,
  initial,
}: {
  trigger: ReactNode;
  channel: TemplateChannel;
  initial?: TemplateRow;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: initial
      ? {
          title: initial.title,
          category: initial.category ?? "",
          sendBy: initial.sendBy ?? "",
          subject: initial.subject ?? "",
          message: initial.message,
          variables: initial.variables.join(", "),
          status: initial.active,
        }
      : {
          title: "",
          category: "",
          sendBy: "",
          subject: "",
          message: "",
          variables: "",
          status: true,
        },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        initial
          ? {
              title: initial.title,
              category: initial.category ?? "",
              sendBy: initial.sendBy ?? "",
              subject: initial.subject ?? "",
              message: initial.message,
              variables: initial.variables.join(", "),
              status: initial.active,
            }
          : {
              title: "",
              category: "",
              sendBy: "",
              subject: "",
              message: "",
              variables: "",
              status: true,
            },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const { pending, submit } = useCrudSubmit<TemplateFormData>({
    form,
    close: () => setOpen(false),
    action: (values) =>
      initial
        ? updateTemplate(channel, initial.id, values)
        : createTemplate(channel, values),
  });

  function insertVariable(variable: string) {
    const token = `{{${variable}}}`;
    const current = form.getValues("message") ?? "";
    form.setValue("message", current ? `${current} ${token}` : token, {
      shouldDirty: true,
    });
  }

  return (
    <CrudDialog
      trigger={trigger}
      open={open}
      setOpen={setOpen}
      wide
      title={initial ? `Edit ${CHANNEL_LABEL[channel]} template` : `Add ${CHANNEL_LABEL[channel]} template`}
      description="Use {{variables}} to personalize messages per lead."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Welcome message" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. follow-up, welcome"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {channel === "email" ? (
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your admission journey with DF"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message body</FormLabel>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {TEMPLATE_VARIABLES.map((variable) => (
                    <Badge
                      key={variable}
                      variant="secondary"
                      className="cursor-pointer select-none hover:bg-secondary/70"
                      onClick={() => insertVariable(variable)}
                    >
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                </div>
                <FormControl>
                  <Textarea
                    rows={channel === "email" ? 8 : 5}
                    placeholder={
                      channel === "email"
                        ? "Dear {{lead_name}},\n\nThank you for your interest…"
                        : "Dear {{lead_name}}, your application has been received."
                    }
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {channel === "email"
                    ? "Line breaks are preserved. Click a variable above to insert it."
                    : "Keep it short – carriers split long messages."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="sendBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sender (from/sender id)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Optional"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="variables"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variables used</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="lead_name, program"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>Comma-separated names.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <SwitchFormField form={form} name="status" label="Active" />

          <DialogFooter>
            <SubmitButton pending={pending}>
              {initial ? "Save changes" : "Create template"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </Form>
    </CrudDialog>
  );
}

export function TemplatesTab({
  channel,
  rows,
}: {
  channel: TemplateChannel;
  rows: TemplateRow[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {rows.length} {CHANNEL_LABEL[channel]} template(s). Variables are
          replaced with lead data when sending.
        </p>
        <TemplateDialog
          channel={channel}
          trigger={
            <Button size="sm">
              <Plus />
              Add template
            </Button>
          }
        />
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Variables</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow
                colSpan={6}
                message={`No ${CHANNEL_LABEL[channel]} templates yet.`}
              />
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">{row.title}</div>
                    <div className="max-w-72 truncate text-xs text-muted-foreground">
                      {channel === "email" && row.subject
                        ? row.subject
                        : row.message}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.category ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-44 flex-wrap gap-1">
                      {row.variables.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        row.variables.slice(0, 3).map((variable) => (
                          <Badge key={variable} variant="outline" className="font-mono text-[10px]">
                            {variable}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.sentCount}
                  </TableCell>
                  <TableCell>
                    <ActiveCell active={row.active} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Copy body"
                        title="Copy message body"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(row.message);
                            toast.success("Message body copied");
                          } catch {
                            toast.error("Could not copy");
                          }
                        }}
                      >
                        <Copy />
                      </Button>
                      <TemplateDialog
                        channel={channel}
                        initial={row}
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Edit template">
                            <Pencil />
                          </Button>
                        }
                      />
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Delete template">
                            <Trash2 className="text-destructive" />
                          </Button>
                        }
                        title={`Delete template "${row.title}"?`}
                        description="This permanently removes the template."
                        action={() => deleteTemplate(channel, row.id)}
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
