"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { saveEmailSettings } from "@/lib/actions/message-actions";
import {
  emailSettingsFormSchema,
  type EmailSettingsFormData,
} from "@/lib/validations/messages";
import { SubmitButton } from "@/components/crud";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";

export type EmailSettingsInitial = {
  mailHost: string | null;
  mailPort: string | null;
  mailUsername: string | null;
  mailEncryption: string | null;
  mailFromAddress: string | null;
  mailFromName: string | null;
  active: boolean;
} | null;

export function EmailSettingsPanel({ initial }: { initial: EmailSettingsInitial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<EmailSettingsFormData>({
    resolver: zodResolver(emailSettingsFormSchema),
    defaultValues: {
      mailHost: initial?.mailHost ?? "",
      mailPort: initial?.mailPort ?? "587",
      mailUsername: initial?.mailUsername ?? "",
      mailPassword: "",
      mailEncryption: initial?.mailEncryption ?? "tls",
      mailFromAddress: initial?.mailFromAddress ?? "",
      mailFromName: initial?.mailFromName ?? "",
      active: initial?.active ?? true,
    },
  });

  const save = (values: EmailSettingsFormData) => {
    startTransition(async () => {
      const { active, ...rest } = values;
      const result = await saveEmailSettings({ ...rest, status: active });
      if (!result.success) {
        toast.error(result.message ?? "Save failed");
        return;
      }
      toast.success(result.message ?? "Saved");
      router.refresh();
    });
  };

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>SMTP email settings</CardTitle>
        <CardDescription>
          Used when sending lead emails. Without settings, emails are recorded as
          &quot;queued&quot; instead of being delivered.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(save)} className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="mailHost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SMTP host</FormLabel>
                  <FormControl>
                    <Input placeholder="smtp.example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mailPort"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Port</FormLabel>
                  <FormControl>
                    <Input placeholder="587" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mailUsername"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mailPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormDescription>Leave blank to keep the saved password.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mailEncryption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Encryption</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Encryption" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="tls">TLS / STARTTLS</SelectItem>
                      <SelectItem value="ssl">SSL</SelectItem>
                      <SelectItem value="">None</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-end gap-3 pb-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel>SMTP delivery enabled</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mailFromAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From address</FormLabel>
                  <FormControl>
                    <Input placeholder="admissions@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mailFromName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From name</FormLabel>
                  <FormControl>
                    <Input placeholder="Admissions Team" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="sm:col-span-2">
              <SubmitButton pending={pending}>Save settings</SubmitButton>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
