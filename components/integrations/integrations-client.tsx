"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  createWebhook,
  deleteWebhook,
  regenerateWebhookToken,
  saveProviderIntegration,
  updateWebhook,
} from "@/lib/actions/integration-actions";
import {
  EmailSettingsPanel,
  type EmailSettingsInitial,
} from "@/components/integrations/email-settings-panel";
import {
  PROVIDERS,
  providerFormSchema,
  webhookFormSchema,
  type ProviderFormData,
  type WebhookFormData,
} from "@/lib/validations/integrations";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CrudDialog, SubmitButton, useCrudSubmit } from "@/components/crud";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export type ProviderState = {
  provider: (typeof PROVIDERS)[number];
  isEnabled: boolean;
  token: string | null;
  credentials: { key: string; value: string }[];
};

export type OutgoingWebhookRow = {
  id: number;
  name: string;
  entityType: string;
  description: string | null;
  method: string;
  endPoint: string;
  headersJson: string;
  queryParamsJson: string;
};

export type WebhookLogRow = {
  id: number;
  provider: string;
  eventType: string | null;
  isProcessed: boolean;
  errorMessage: string | null;
  createdAt: string;
  payloadPreview: string;
};

const PROVIDER_LABELS: Record<string, string> = {
  facebook: "Facebook Lead Ads",
  instagram: "Instagram Lead Ads",
  google: "Google Ads lead forms",
};

/* ------------------------------ provider card --------------------------- */

function ProviderCard({ state }: { state: ProviderState }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<ProviderFormData>({
    resolver: zodResolver(providerFormSchema),
    defaultValues: {
      isEnabled: state.isEnabled,
      credentials: state.credentials.length
        ? state.credentials
        : [{ key: "app_secret", value: "" }],
    },
  });
  useFieldArray({ control: form.control, name: "credentials" });

  const save = (values: ProviderFormData) => {
    startTransition(async () => {
      const result = await saveProviderIntegration({
        provider: state.provider,
        data: values,
      });
      if (!result.success) {
        toast.error(result.message ?? "Save failed");
        return;
      }
      toast.success(result.message ?? "Saved");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{PROVIDER_LABELS[state.provider] ?? state.provider}</CardTitle>
          <CardDescription>
            {state.isEnabled ? "Receiving leads" : "Disabled"}
          </CardDescription>
        </div>
        <Form {...form}>
          <FormField
            control={form.control}
            name="isEnabled"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </Form>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(save)} className="space-y-3">
          {form.watch("credentials").map((cred, index) => (
            <div key={index} className="flex items-start gap-2">
              <FormField
                control={form.control}
                name={`credentials.${index}.key`}
                render={({ field }) => (
                  <FormItem className="w-40">
                    <FormControl>
                      <Input placeholder="key" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`credentials.${index}.value`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input type="password" placeholder="value" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  const current = form.getValues("credentials");
                  form.setValue(
                    "credentials",
                    current.filter((_, i) => i !== index),
                  );
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                form.setValue("credentials", [
                  ...form.getValues("credentials"),
                  { key: "", value: "" },
                ])
              }
            >
              <Plus /> Add credential
            </Button>
            <SubmitButton pending={pending}>Save</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ------------------------------ endpoint tab ---------------------------- */

function EndpointPanel({ providers }: { providers: ProviderState[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [provider, setProvider] = useState<string>(PROVIDERS[0]);
  const state = providers.find((p) => p.provider === provider);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://your-domain";
  const url = `${origin}/api/integrations/ingest/${provider}?token=${state?.token ?? "…generate-a-token…"}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inbound endpoint</CardTitle>
        <CardDescription>
          Point the provider&apos;s webhook at this URL. Leads are validated,
          de-duplicated by mobile number and logged.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger className="w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p} value={p}>
                  {PROVIDER_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await regenerateWebhookToken(provider);
                if (!result.success) {
                  toast.error(result.message ?? "Failed");
                  return;
                }
                toast.success("New token generated — update the provider with the new URL.");
                router.refresh();
              })
            }
          >
            {pending ? <RefreshCw className="animate-spin" /> : <KeyRound />}
            {state?.token ? "Regenerate token" : "Generate token"}
          </Button>
          {!state?.isEnabled && (
            <Badge variant="secondary">Integration disabled — enable it in the Providers tab</Badge>
          )}
        </div>
        <div className="rounded-md bg-muted p-3 font-mono text-xs break-all">{url}</div>
        <div className="text-sm text-muted-foreground">
          Example payload:
          <pre className="mt-2 rounded-md bg-muted p-3 text-xs overflow-x-auto">
{`POST ${url}
Content-Type: application/json

{
  "name": "Asha Verma",
  "mobile": "+91 98100 12345",
  "email": "asha@example.com",
  "city": "Delhi",
  "source": "Facebook Ads"
}`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------ webhooks tab ---------------------------- */

function WebhookDialog({
  initial,
  trigger,
}: {
  initial?: OutgoingWebhookRow;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<WebhookFormData>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: initial
      ? {
          name: initial.name,
          entityType: initial.entityType,
          description: initial.description ?? "",
          method: (initial.method as WebhookFormData["method"]) ?? "POST",
          endPoint: initial.endPoint,
          headersJson: initial.headersJson,
          queryParamsJson: initial.queryParamsJson,
        }
      : {
          name: "",
          entityType: "lead",
          description: "",
          method: "POST",
          endPoint: "",
          headersJson: "",
          queryParamsJson: "",
        },
  });
  const { pending, submit } = useCrudSubmit({
    action: (values: WebhookFormData) =>
      initial ? updateWebhook(initial.id, values) : createWebhook(values),
    form,
    close: () => setOpen(false),
  });

  return (
    <CrudDialog
      trigger={trigger}
      title={initial ? "Edit webhook" : "New webhook"}
      description="Called when automation rules fire this webhook, with the lead payload as JSON."
      open={open}
      setOpen={setOpen}
      wide
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Notify partner CRM" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="entityType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Entity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="status_change">Status change</SelectItem>
                      <SelectItem value="any">Any</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Method</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {["GET", "POST", "PUT", "PATCH"].map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
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
              name="endPoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endpoint URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/hook" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="headersJson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Headers (JSON, optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder='{"x-api-key": "…"}' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="queryParamsJson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Query params (JSON, optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder='{"source": "crm"}' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <SubmitButton pending={pending}>
            {initial ? "Save changes" : "Create webhook"}
          </SubmitButton>
        </form>
      </Form>
    </CrudDialog>
  );
}

function WebhooksTab({ webhooks }: { webhooks: OutgoingWebhookRow[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <WebhookDialog
          trigger={
            <Button>
              <Plus /> New webhook
            </Button>
          }
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="max-w-80">Endpoint</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {webhooks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No webhooks yet. Create one to push lead events to external systems.
                </TableCell>
              </TableRow>
            ) : (
              webhooks.map((webhook) => (
                <TableRow key={webhook.id}>
                  <TableCell className="font-medium">{webhook.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{webhook.entityType}</Badge>
                  </TableCell>
                  <TableCell>{webhook.method}</TableCell>
                  <TableCell className="max-w-80 truncate font-mono text-xs">
                    {webhook.endPoint}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <WebhookDialog
                        initial={webhook}
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Pencil className="size-4" />
                          </Button>
                        }
                      />
                      <ConfirmDialog
                        title="Delete webhook?"
                        description={`"${webhook.name}" will stop receiving events.`}
                        action={() => deleteWebhook(webhook.id)}
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        }
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

/* -------------------------------- logs tab ------------------------------ */

function LogsTab({ logs }: { logs: WebhookLogRow[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Error</TableHead>
            <TableHead className="max-w-100">Payload</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No inbound requests logged yet.
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>{log.provider}</TableCell>
                <TableCell>
                  {log.isProcessed ? (
                    <Badge className="gap-1">
                      <CheckCircle2 className="size-3" /> processed
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <XCircle className="size-3" /> unprocessed
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-56 truncate text-muted-foreground">
                  {log.errorMessage ?? "—"}
                </TableCell>
                <TableCell className="max-w-100 truncate font-mono text-xs">
                  {log.payloadPreview}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/* --------------------------------- root --------------------------------- */

export function IntegrationsClient({
  providers,
  webhooks,
  logs,
  emailSettings,
}: {
  providers: ProviderState[];
  webhooks: OutgoingWebhookRow[];
  logs: WebhookLogRow[];
  emailSettings: EmailSettingsInitial;
}) {
  return (
    <Tabs defaultValue="providers">
      <TabsList>
        <TabsTrigger value="providers">Providers</TabsTrigger>
        <TabsTrigger value="endpoint">Inbound endpoint</TabsTrigger>
        <TabsTrigger value="webhooks">Outgoing webhooks</TabsTrigger>
        <TabsTrigger value="email">Email (SMTP)</TabsTrigger>
        <TabsTrigger value="logs">Request logs</TabsTrigger>
      </TabsList>
      <TabsContent value="providers" className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {providers.map((state) => (
          <ProviderCard key={state.provider} state={state} />
        ))}
      </TabsContent>
      <TabsContent value="endpoint" className="mt-4">
        <EndpointPanel providers={providers} />
      </TabsContent>
      <TabsContent value="webhooks" className="mt-4">
        <WebhooksTab webhooks={webhooks} />
      </TabsContent>
      <TabsContent value="email" className="mt-4">
        <EmailSettingsPanel initial={emailSettings} />
      </TabsContent>
      <TabsContent value="logs" className="mt-4">
        <LogsTab logs={logs} />
      </TabsContent>
    </Tabs>
  );
}
