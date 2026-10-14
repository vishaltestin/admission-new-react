"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowUpDown,
  Code2,
  Copy,
  Eye,
  ExternalLink,
  MousePointerClick,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  createWebForm,
  deleteWebForm,
  updateWebForm,
} from "@/lib/actions/webform-actions";
import {
  ATTRIBUTE_TYPES,
  webformBuilderFormSchema,
  webformFormSchema,
  type WebformBuilderFormData,
  type WebformFormData,
} from "@/lib/validations/webforms";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyRow, SubmitButton, useCrudSubmit } from "@/components/crud";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export type WebFormRow = {
  id: number;
  formId: string;
  title: string;
  viewCount: number;
  submitCount: number;
  attributeCount: number;
  createLead: boolean;
};

export type MasterOption = { id: number; name: string };

export type WebFormInitial = WebformBuilderFormData & { id: number; formId: string };

const noneOrId = (v: number | null) => (v ? String(v) : "none");

/* ------------------------------ list table ------------------------------ */

function copyText(text: string, note: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success(note))
    .catch(() => toast.error("Copy failed"));
}

function EmbedDialog({ formId, title }: { formId: string; title: string }) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://your-domain";
  const url = `${origin}/f/${formId}`;
  const iframe = `<iframe src="${url}?embed=1" width="100%" height="640" frameborder="0" style="border:0"></iframe>`;
  const api = `POST ${origin}/api/public/forms/${formId}\nContent-Type: application/json\n\n{ "f_12": "Asha Verma", "f_13": "+91 98100 12345" }`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Embed options">
          <Code2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Publish “{title}”</DialogTitle>
          <DialogDescription>
            Share the link, embed the iframe on any site, or post leads via the public API.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div>
            <p className="mb-1 font-medium">Public link</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-muted p-2 text-xs">{url}</code>
              <Button variant="outline" size="sm" onClick={() => copyText(url, "Link copied")}>
                <Copy /> Copy
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink /> Open
                </a>
              </Button>
            </div>
          </div>
          <div>
            <p className="mb-1 font-medium">Iframe embed</p>
            <div className="flex items-start gap-2">
              <code className="flex-1 whitespace-pre-wrap break-all rounded bg-muted p-2 text-xs">
                {iframe}
              </code>
              <Button variant="outline" size="sm" onClick={() => copyText(iframe, "Embed code copied")}>
                <Copy /> Copy
              </Button>
            </div>
          </div>
          <div>
            <p className="mb-1 font-medium">Public API (field keys are f_+attribute id)</p>
            <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">{api}</pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function WebformsTable({ rows }: { rows: WebFormRow[] }) {
  return (
    <>
      <div className="flex justify-end">
        <Button asChild>
          <Link href="/webforms/new">
            <Plus /> New webform
          </Link>
        </Button>
      </div>
      <div className="mt-4 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Fields</TableHead>
              <TableHead>
                <span className="inline-flex items-center gap-1">
                  <Eye className="size-3.5" /> Views
                </span>
              </TableHead>
              <TableHead>
                <span className="inline-flex items-center gap-1">
                  <MousePointerClick className="size-3.5" /> Submissions
                </span>
              </TableHead>
              <TableHead>Conversion</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={6} message="No webforms yet. Create one to capture leads from your website." />
            ) : (
              rows.map((row) => {
                const conversion = row.viewCount
                  ? Math.round((row.submitCount / row.viewCount) * 100)
                  : 0;
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.title}</div>
                      <div className="font-mono text-xs text-muted-foreground">/f/{row.formId}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.attributeCount} fields</Badge>
                      {!row.createLead ? (
                        <Badge variant="secondary" className="ml-2">no lead</Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>{row.viewCount}</TableCell>
                    <TableCell>{row.submitCount}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        <ArrowUpDown className="size-3.5 text-muted-foreground" /> {conversion}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <EmbedDialog formId={row.formId} title={row.title} />
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/webforms/${row.id}`} aria-label="Edit webform">
                            <Pencil className="size-4" />
                          </Link>
                        </Button>
                        <ConfirmDialog
                          title="Delete webform?"
                          description={`"${row.title}" and its ${row.attributeCount} fields will be deleted. Captured leads are kept.`}
                          action={() => deleteWebForm(row.id)}
                          trigger={
                            <Button variant="ghost" size="icon">
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          }
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

/* ------------------------- shared base-fields form ---------------------- */

function MasterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: MasterOption[];
  placeholder: string;
}) {
  return (
    <Select value={value || "none"} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.id} value={String(option.id)}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function BaseFields({
  form,
  sources,
  campaigns,
  types,
}: {
  form: ReturnType<typeof useForm<any>>;
  sources: MasterOption[];
  campaigns: MasterOption[];
  types: MasterOption[];
}) {
  const successAction = form.watch("submitSuccessAction");
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input placeholder="MBBS enquiry form" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Description (optional)</FormLabel>
            <FormControl>
              <Textarea rows={2} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="leadSourceId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Lead source</FormLabel>
            <FormControl>
              <MasterSelect value={field.value ?? "none"} onChange={field.onChange} options={sources} placeholder="Source" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="campaignId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Campaign</FormLabel>
            <FormControl>
              <MasterSelect value={field.value ?? "none"} onChange={field.onChange} options={campaigns} placeholder="Campaign" />
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
            <FormLabel>Lead type</FormLabel>
            <FormControl>
              <MasterSelect value={field.value ?? "none"} onChange={field.onChange} options={types} placeholder="Type" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="createLead"
        render={({ field }) => (
          <FormItem className="flex items-end gap-3 pb-2">
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel>Create a lead on submit</FormLabel>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="submitButtonLabel"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Submit button label</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="submitSuccessAction"
        render={({ field }) => (
          <FormItem>
            <FormLabel>On success</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="message">Show a message</SelectItem>
                <SelectItem value="redirect">Redirect to URL</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="submitSuccessContent"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>
              {successAction === "redirect" ? "Redirect URL" : "Success message"}
            </FormLabel>
            <FormControl>
              <Input
                placeholder={
                  successAction === "redirect"
                    ? "https://yoursite.com/thank-you"
                    : "Thank you! Our counsellor will call you shortly."
                }
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

/* ------------------------------ create page ----------------------------- */

export function WebformCreateForm({
  sources,
  campaigns,
  types,
}: {
  sources: MasterOption[];
  campaigns: MasterOption[];
  types: MasterOption[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const form = useForm<WebformFormData>({
    resolver: zodResolver(webformFormSchema),
    defaultValues: {
      title: "",
      description: "",
      submitButtonLabel: "Submit",
      submitSuccessAction: "message",
      submitSuccessContent: "Thank you! Our counsellor will call you shortly.",
      createLead: true,
      leadSourceId: "none",
      campaignId: "none",
      typeId: "none",
      backgroundColor: "",
      formBackgroundColor: "",
      formTitleColor: "",
      formSubmitButtonColor: "",
      attributeLabelColor: "",
    },
  });

  const submit = (values: WebformFormData) => {
    setPending(true);
    void (async () => {
      const result = await createWebForm(values);
      setPending(false);
      if (!result.success) {
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (messages?.[0]) form.setError(field as never, { message: messages[0] });
          }
        }
        toast.error(result.message ?? "Could not create");
        return;
      }
      toast.success(result.message ?? "Created");
      router.push(`/webforms/${result.data?.id}`);
    })();
  };

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>New webform</CardTitle>
        <CardDescription>
          Set the basics now — add fields and tweak colors in the builder next.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
            <BaseFields form={form} sources={sources} campaigns={campaigns} types={types} />
            <SubmitButton pending={pending}>Create & open builder</SubmitButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/* ------------------------------ builder page ---------------------------- */

function ColorField({
  form,
  name,
  label,
}: {
  form: ReturnType<typeof useForm<WebformBuilderFormData>>;
  name:
    | "backgroundColor"
    | "formBackgroundColor"
    | "formTitleColor"
    | "formSubmitButtonColor"
    | "attributeLabelColor";
  label: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs">{label}</FormLabel>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="size-9 cursor-pointer rounded border"
              value={field.value && field.value.length >= 4 ? field.value : "#ffffff"}
              onChange={(e) => field.onChange(e.target.value)}
            />
            <FormControl>
              <Input placeholder="#f1f5f9" {...field} />
            </FormControl>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => field.onChange("")}
            >
              Reset
            </Button>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function WebformBuilder({
  initial,
  sources,
  campaigns,
  types,
}: {
  initial: WebFormInitial;
  sources: MasterOption[];
  campaigns: MasterOption[];
  types: MasterOption[];
}) {
  const router = useRouter();
  const form = useForm<WebformBuilderFormData>({
    resolver: zodResolver(webformBuilderFormSchema),
    defaultValues: initial,
  });
  const attributesField = useFieldArray({ control: form.control, name: "attributes" });
  const { pending, submit } = useCrudSubmit({
    action: (values: WebformBuilderFormData) => updateWebForm(initial.id, values),
    form,
    close: () => router.refresh(),
  });

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://your-domain";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Settings</CardTitle>
              <CardDescription>
                Public URL:{" "}
                <Link
                  href={`/f/${initial.formId}`}
                  target="_blank"
                  className="font-mono text-xs underline"
                >
                  {origin}/f/{initial.formId}
                </Link>
              </CardDescription>
            </div>
            <SubmitButton pending={pending}>Save webform</SubmitButton>
          </CardHeader>
          <CardContent>
            <BaseFields form={form} sources={sources} campaigns={campaigns} types={types} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fields</CardTitle>
            <CardDescription>
              Labels matching Name / Mobile / Email / City / State / Country map to the
              lead&apos;s core columns; everything else is stored as extra data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {attributesField.fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_130px_1fr_auto] items-start gap-2 rounded-md border p-3 sm:grid-cols-[200px_140px_1fr_auto]">
                <FormField
                  control={form.control}
                  name={`attributes.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Label</FormLabel>
                      <FormControl>
                        <Input placeholder="Full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`attributes.${index}.type`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ATTRIBUTE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
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
                  name={`attributes.${index}.placeholder`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Placeholder / options</FormLabel>
                      <FormControl>
                        <Input placeholder="Placeholder text" {...field} />
                      </FormControl>
                      <FormField
                        control={form.control}
                        name={`attributes.${index}.options`}
                        render={({ field: optionsField }) =>
                          ["select", "radio", "checkbox"].includes(
                            form.watch(`attributes.${index}.type`),
                          ) ? (
                            <Input
                              className="mt-1"
                              placeholder="Options, comma, separated"
                              {...optionsField}
                            />
                          ) : (
                            <></>
                          )
                        }
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 items-center gap-2 pt-6">
                  <FormField
                    control={form.control}
                    name={`attributes.${index}.isRequired`}
                    render={({ field }) => (
                      <label className="flex items-center gap-1.5 text-xs">
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                        Required
                      </label>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`attributes.${index}.isHidden`}
                    render={({ field }) => (
                      <label className="flex items-center gap-1.5 text-xs">
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                        Hidden
                      </label>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="justify-self-end"
                    onClick={() => attributesField.remove(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                attributesField.append({
                  name: "",
                  placeholder: "",
                  type: "text",
                  options: "",
                  defaultValue: "",
                  isRequired: false,
                  isHidden: false,
                })
              }
            >
              <Plus /> Add field
            </Button>
            {form.formState.errors.attributes?.message ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.attributes.message}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>Blank entries fall back to defaults.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ColorField form={form} name="backgroundColor" label="Page background" />
            <ColorField form={form} name="formBackgroundColor" label="Form background" />
            <ColorField form={form} name="formTitleColor" label="Title color" />
            <ColorField form={form} name="formSubmitButtonColor" label="Button color" />
            <ColorField form={form} name="attributeLabelColor" label="Label color" />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <SubmitButton pending={pending}>Save webform</SubmitButton>
        </div>
      </form>
    </Form>
  );
}

export { noneOrId };
