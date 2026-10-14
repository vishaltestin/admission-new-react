"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createAutomationRule,
  deleteAutomationRule,
  toggleAutomationRule,
  updateAutomationRule,
} from "@/lib/actions/automation-actions";
import {
  ACTION_LABELS,
  TRIGGER_LABELS,
  automationRuleFormSchema,
  type AutomationRuleFormData,
} from "@/lib/validations/automation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  CrudDialog,
  EmptyRow,
  SubmitButton,
  SwitchFormField,
  useCrudSubmit,
} from "@/components/crud";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Option = { id: number; name: string };

export type RuleOptionLists = {
  statuses: Option[];
  sources: Option[];
  types: Option[];
  users: Option[];
  webhooks: Option[];
  templates: { email: Option[]; sms: Option[]; whatsapp: Option[] };
};

export type RuleRow = {
  id: number;
  name: string;
  triggerEvent: string;
  isActive: boolean;
  conditions: { leadSourceId: string; typeId: string; leadStatusId: string };
  actions: string[];
  statusIds: string[];
  userIds: string[];
  channels: string[];
  templateIds: string[];
  webhookIds: string[];
};

const ACTION_TYPES = ["change_status", "assign_to", "send_template", "fire_webhook"] as const;

function OptionSelect({
  value,
  onChange,
  options,
  placeholder,
  allowNone = true,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  allowNone?: boolean;
}) {
  return (
    <Select value={value || "none"} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone ? <SelectItem value="none">None</SelectItem> : null}
        {options.map((option) => (
          <SelectItem key={option.id} value={String(option.id)}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ActionRow({
  index,
  form,
  options,
  onRemove,
}: {
  index: number;
  form: ReturnType<typeof useForm<AutomationRuleFormData>>;
  options: RuleOptionLists;
  onRemove: () => void;
}) {
  const type = form.watch(`actions.${index}`);
  const channel = form.watch(`channels.${index}`);
  const templateOptions =
    channel === "email"
      ? options.templates.email
      : channel === "sms"
        ? options.templates.sms
        : channel === "whatsapp"
          ? options.templates.whatsapp
          : [];

  return (
    <div className="flex flex-wrap items-start gap-2 rounded-md border p-3">
      <FormField
        control={form.control}
        name={`actions.${index}`}
        render={({ field }) => (
          <FormItem className="w-44">
            <FormLabel className="text-xs">Action {index + 1}</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Choose action" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {ACTION_TYPES.map((actionType) => (
                  <SelectItem key={actionType} value={actionType}>
                    {ACTION_LABELS[actionType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {type === "change_status" ? (
        <FormField
          control={form.control}
          name={`statusIds.${index}`}
          render={({ field }) => (
            <FormItem className="flex-1 min-w-40">
              <FormLabel className="text-xs">New status</FormLabel>
              <FormControl>
                <OptionSelect
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={options.statuses}
                  placeholder="Status"
                  allowNone={false}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {type === "assign_to" ? (
        <FormField
          control={form.control}
          name={`userIds.${index}`}
          render={({ field }) => (
            <FormItem className="flex-1 min-w-40">
              <FormLabel className="text-xs">Assign to</FormLabel>
              <FormControl>
                <OptionSelect
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={options.users}
                  placeholder="User"
                  allowNone={false}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {type === "send_template" ? (
        <>
          <FormField
            control={form.control}
            name={`channels.${index}`}
            render={({ field }) => (
              <FormItem className="w-36">
                <FormLabel className="text-xs">Channel</FormLabel>
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Channel" />
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
            name={`templateIds.${index}`}
            render={({ field }) => (
              <FormItem className="flex-1 min-w-40">
                <FormLabel className="text-xs">Template</FormLabel>
                <FormControl>
                  <OptionSelect
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={templateOptions}
                    placeholder={channel ? "Template" : "Pick a channel first"}
                    allowNone={false}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      ) : null}

      {type === "fire_webhook" ? (
        <FormField
          control={form.control}
          name={`webhookIds.${index}`}
          render={({ field }) => (
            <FormItem className="flex-1 min-w-40">
              <FormLabel className="text-xs">Webhook</FormLabel>
              <FormControl>
                <OptionSelect
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={options.webhooks}
                  placeholder="Webhook"
                  allowNone={false}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="mt-6"
        onClick={onRemove}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function RuleDialog({
  options,
  initial,
  trigger,
}: {
  options: RuleOptionLists;
  initial?: RuleRow;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<AutomationRuleFormData>({
    resolver: zodResolver(automationRuleFormSchema),
    defaultValues: initial
      ? {
          name: initial.name,
          triggerEvent: initial.triggerEvent as AutomationRuleFormData["triggerEvent"],
          leadSourceId: initial.conditions.leadSourceId,
          typeId: initial.conditions.typeId,
          leadStatusId: initial.conditions.leadStatusId,
          actions: initial.actions as AutomationRuleFormData["actions"],
          statusIds: initial.statusIds,
          userIds: initial.userIds,
          channels: initial.channels,
          templateIds: initial.templateIds,
          webhookIds: initial.webhookIds,
          isActive: initial.isActive,
        }
      : {
          name: "",
          triggerEvent: "lead_created",
          leadSourceId: "none",
          typeId: "none",
          leadStatusId: "none",
          actions: [],
          statusIds: [],
          userIds: [],
          channels: [],
          templateIds: [],
          webhookIds: [],
          isActive: true,
        },
  });
  // RHF's ArrayPath/Control can't index this schema's union action arrays with
  // zod v4 resolver inference, so keep the field array loosely typed.
  const actionsField = useFieldArray(
    { control: form.control, name: "actions" } as never,
  ) as unknown as {
    fields: { id: string }[];
    append: (value: string) => void;
    remove: (index: number) => void;
  };
  const { pending, submit } = useCrudSubmit({
    action: (values: AutomationRuleFormData) =>
      initial ? updateAutomationRule(initial.id, values) : createAutomationRule(values),
    form,
    close: () => setOpen(false),
  });
  const triggerEvent = form.watch("triggerEvent");

  const setParallel = (
    key: "statusIds" | "userIds" | "channels" | "templateIds" | "webhookIds",
    value: (string | undefined)[],
  ) => form.setValue(key, value as never);

  const addAction = (type: (typeof ACTION_TYPES)[number]) => {
    actionsField.append(type);
    for (const key of ["statusIds", "userIds", "channels", "templateIds", "webhookIds"] as const) {
      setParallel(key, [...(form.getValues(key) ?? []), ""]);
    }
  };

  const removeAction = (index: number) => {
    actionsField.remove(index);
    for (const key of ["statusIds", "userIds", "channels", "templateIds", "webhookIds"] as const) {
      setParallel(key, (form.getValues(key) ?? []).filter((_, i) => i !== index));
    }
  };

  return (
    <CrudDialog
      trigger={trigger}
      title={initial ? "Edit rule" : "New automation rule"}
      description="Conditions narrow when the rule runs; actions run in order."
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
                  <FormLabel>Rule name</FormLabel>
                  <FormControl>
                    <Input placeholder="Welcome new Facebook leads" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="triggerEvent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trigger</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="leadSourceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Only source</FormLabel>
                  <FormControl>
                    <OptionSelect
                      value={field.value ?? "none"}
                      onChange={field.onChange}
                      options={options.sources}
                      placeholder="Any source"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="typeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Only lead type</FormLabel>
                  <FormControl>
                    <OptionSelect
                      value={field.value ?? "none"}
                      onChange={field.onChange}
                      options={options.types}
                      placeholder="Any type"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="leadStatusId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {triggerEvent === "status_changed" ? "Lands on status" : "Only status"}
                  </FormLabel>
                  <FormControl>
                    <OptionSelect
                      value={field.value ?? "none"}
                      onChange={field.onChange}
                      options={options.statuses}
                      placeholder="Any status"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-2">
            <FormLabel>Actions</FormLabel>
            {actionsField.fields.map((field, index) => (
              <ActionRow
                key={field.id}
                index={index}
                form={form}
                options={options}
                onRemove={() => removeAction(index)}
              />
            ))}
            <div className="flex flex-wrap gap-2">
              {ACTION_TYPES.map((actionType) => (
                <Button
                  key={actionType}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addAction(actionType)}
                >
                  <Plus /> {ACTION_LABELS[actionType]}
                </Button>
              ))}
            </div>
            {form.formState.errors.actions?.message ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.actions.message}
              </p>
            ) : null}
          </div>

          <SwitchFormField form={form} name="isActive" label="Rule is active" />

          <SubmitButton pending={pending}>
            {initial ? "Save changes" : "Create rule"}
          </SubmitButton>
        </form>
      </Form>
    </CrudDialog>
  );
}

export function AutomationClient({
  rules,
  options,
}: {
  rules: RuleRow[];
  options: RuleOptionLists;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const toggle = (id: number) => {
    setPendingId(id);
    startTransition(async () => {
      const result = await toggleAutomationRule(id);
      setPendingId(null);
      if (!result.success) {
        toast.error(result.message ?? "Failed");
        return;
      }
      toast.success(result.message ?? "Updated");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RuleDialog
          options={options}
          trigger={
            <Button>
              <Plus /> New rule
            </Button>
          }
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Actions</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 ? (
              <EmptyRow colSpan={5} message="No rules yet. Create one to automate lead handling." />
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {TRIGGER_LABELS[rule.triggerEvent] ?? rule.triggerEvent}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {rule.actions.map((a) => ACTION_LABELS[a] ?? a).join(" · ") || "—"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.isActive}
                      disabled={pendingId === rule.id}
                      onCheckedChange={() => toggle(rule.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <RuleDialog
                        options={options}
                        initial={rule}
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Pencil className="size-4" />
                          </Button>
                        }
                      />
                      <ConfirmDialog
                        title="Delete rule?"
                        description={`"${rule.name}" and its run history will be deleted.`}
                        action={() => deleteAutomationRule(rule.id)}
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
