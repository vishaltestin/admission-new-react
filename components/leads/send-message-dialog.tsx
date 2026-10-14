"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { useForm } from "react-hook-form";

import { sendLeadMessage } from "@/lib/actions/message-actions";
import {
  sendMessageFormSchema,
  type SendMessageFormData,
} from "@/lib/validations/messages";
import { CrudDialog, SubmitButton, useCrudSubmit } from "@/components/crud";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type TemplateOption = {
  id: number;
  name: string;
  subject?: string | null;
  message: string;
};

export function SendMessageDialog({
  leadId,
  templates,
  trigger,
}: {
  leadId: number;
  templates: Record<"email" | "sms" | "whatsapp", TemplateOption[]>;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<SendMessageFormData>({
    resolver: zodResolver(sendMessageFormSchema),
    defaultValues: { channel: "email", templateId: "none", subject: "", message: "" },
  });
  const { pending, submit } = useCrudSubmit({
    action: (values: SendMessageFormData) =>
      sendLeadMessage({
        leadId,
        channel: values.channel,
        templateId:
          values.templateId && values.templateId !== "none"
            ? Number(values.templateId)
            : null,
        subject: values.subject || undefined,
        message: values.message,
      }),
    form,
    close: () => setOpen(false),
  });

  const channel = form.watch("channel");
  const templateId = form.watch("templateId");
  const options = templates[channel];

  const applyTemplate = (id: string) => {
    if (!id || id === "none") return;
    const template = options.find((t) => String(t.id) === id);
    if (!template) return;
    form.setValue("message", template.message);
    if (template.subject) form.setValue("subject", template.subject);
  };

  return (
    <CrudDialog
      trigger={trigger}
      title="Send message"
      description="Send or queue an email, SMS or WhatsApp message to this lead."
      open={open}
      setOpen={setOpen}
      wide
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="channel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue("templateId", "none");
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
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
                  <FormLabel>Template (optional)</FormLabel>
                  <Select
                    value={field.value || "none"}
                    onValueChange={(value) => {
                      field.onChange(value);
                      applyTemplate(value);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No template" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No template</SelectItem>
                      {options.map((template) => (
                        <SelectItem key={template.id} value={String(template.id)}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {options.length
                      ? `${options.length} template(s) available — variables like {{lead_name}} are replaced on send.`
                      : "No templates for this channel yet — create them under Templates."}
                  </FormDescription>
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
                    <Input placeholder="Subject" {...field} />
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
                <FormLabel>Message</FormLabel>
                <FormControl>
                  <Textarea rows={8} placeholder="Hi {{lead_name}}, …" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <SubmitButton pending={pending}>
            <Send /> Send message
          </SubmitButton>
        </form>
      </Form>
    </CrudDialog>
  );
}
