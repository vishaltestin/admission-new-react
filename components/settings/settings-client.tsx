"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { saveGeneralSettings } from "@/lib/actions/settings-actions";
import {
  generalSettingsFormSchema,
  type GeneralSettingsFormData,
} from "@/lib/validations/settings";
import { SubmitButton, SwitchFormField, useCrudSubmit } from "@/components/crud";
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
import { Textarea } from "@/components/ui/textarea";

export type SettingsInitial = GeneralSettingsFormData;

export function GeneralSettingsForm({ initial }: { initial: SettingsInitial }) {
  const [navigating] = useState(false);
  const form = useForm<GeneralSettingsFormData>({
    resolver: zodResolver(generalSettingsFormSchema),
    defaultValues: initial,
  });
  const { pending, submit } = useCrudSubmit({
    action: (values: GeneralSettingsFormData) => saveGeneralSettings(values),
    form,
    close: () => {},
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>Branding and application defaults.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="appName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Application name</FormLabel>
                  <FormControl>
                    <Input placeholder="DF CRM" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency code</FormLabel>
                  <FormControl>
                    <Input placeholder="INR" maxLength={10} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <FormControl>
                    <Input placeholder="Asia/Kolkata" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date format</FormLabel>
                  <FormControl>
                    <Input placeholder="d M, Y" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="logo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://…/logo.png" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="favicon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Favicon URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://…/favicon.ico" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment gateway</CardTitle>
            <CardDescription>
              Credentials used by fee collection across application forms and invoices.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="defaultGateway"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default gateway</FormLabel>
                  <FormControl>
                    <Input placeholder="razorpay" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentCredentialsJson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gateway credentials (JSON)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      className="font-mono text-xs"
                      placeholder={'{"key_id": "…", "key_secret": "…"}'}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Stored encrypted at rest by your database — do not commit screenshots.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance</CardTitle>
            <CardDescription>
              While maintenance is on, non-admin users see a notice instead of the app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SwitchFormField
              form={form}
              name="maintenanceMode"
              label="Enable maintenance mode"
            />
            <FormField
              control={form.control}
              name="maintenanceMessage"
              render={({ field }) => (
                <FormItem className="mt-4">
                  <FormLabel>Maintenance message</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="We are performing scheduled maintenance. Please check back soon."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <SubmitButton pending={pending || navigating}>Save settings</SubmitButton>
        </div>
      </form>
    </Form>
  );
}
