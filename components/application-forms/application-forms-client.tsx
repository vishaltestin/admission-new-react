"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  ExternalLink,
  IndianRupee,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  createApplicationForm,
  deleteApplicationForm,
  markApplicationPaid,
  toggleApplicationForm,
  updateApplicationForm,
} from "@/lib/actions/application-actions";
import {
  applicationFormEditorSchema,
  type ApplicationFormEditorData,
} from "@/lib/validations/applications";
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
import { Switch } from "@/components/ui/switch";

export type AppFormRow = {
  id: number;
  uniqueCode: string;
  title: string;
  active: boolean;
  total: number;
  responseCount: number;
};

export type Option = { id: number; name: string };

export type AppFormInitial = (ApplicationFormEditorData & { id: number; uniqueCode: string }) | null;

/* --------------------------------- list --------------------------------- */

export function AppFormsTable({ rows }: { rows: AppFormRow[] }) {
  const router = useRouter();
  return (
    <>
      <div className="flex justify-end">
        <Button asChild>
          <Link href="/application-forms/new">
            <Plus /> New application form
          </Link>
        </Button>
      </div>
      <div className="mt-4 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Public link</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead>Responses</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-36" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={6} message="No application forms yet. Create one to accept admission applications." />
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.title}</TableCell>
                  <TableCell>
                    <Link
                      href={`/apply/${row.uniqueCode}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 font-mono text-xs hover:underline"
                    >
                      /apply/{row.uniqueCode} <ExternalLink className="size-3" />
                    </Link>
                  </TableCell>
                  <TableCell>
                    {row.total > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <IndianRupee className="size-3.5" />
                        {row.total.toLocaleString("en-IN")}
                      </span>
                    ) : (
                      "Free"
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={`/application-forms/${row.id}`} className="underline underline-offset-2">
                      {row.responseCount}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={row.active}
                      onCheckedChange={() =>
                        void toggleApplicationForm(row.id).then((result) => {
                          if (result.success) toast.success(result.message);
                          else toast.error(result.message ?? "Failed");
                          router.refresh();
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/application-forms/${row.id}/edit`} aria-label="Edit">
                          <Pencil className="size-4" />
                        </Link>
                      </Button>
                      <ConfirmDialog
                        title="Delete application form?"
                        description={`"${row.title}" and its ${row.responseCount} response(s) will be deleted. Leads are kept.`}
                        action={() => deleteApplicationForm(row.id)}
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
    </>
  );
}

/* -------------------------------- editor -------------------------------- */

export function AppFormEditor({
  initial,
  countries,
  institutes,
}: {
  initial: AppFormInitial;
  countries: string[];
  institutes: Option[];
}) {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  const form = useForm<ApplicationFormEditorData>({
    resolver: zodResolver(applicationFormEditorSchema),
    defaultValues: initial ?? {
      title: "",
      description: "",
      active: true,
      fees: "",
      taxPercent: "",
      instituteIds: [],
      countries: [],
    },
  });
  const { pending, submit } = useCrudSubmit({
    action: async (values: ApplicationFormEditorData) => {
      const result = initial
        ? await updateApplicationForm(initial.id, values)
        : await createApplicationForm(values);
      const createdId = (result.data as { id?: number } | undefined)?.id;
      if (!initial && result.success && createdId) {
        setNavigating(true);
        router.push(`/application-forms/${createdId}/edit`);
      }
      return result;
    },
    form,
    close: () => router.refresh(),
  });

  const toggleInArray = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basics</CardTitle>
            <CardDescription>
              {initial ? (
                <>
                  Public link:{" "}
                  <Link href={`/apply/${initial.uniqueCode}`} target="_blank" className="font-mono text-xs underline">
                    /apply/{initial.uniqueCode}
                  </Link>
                </>
              ) : (
                "A public link is generated from the title."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="B.Tech Admission 2026" {...field} />
                  </FormControl>
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
                  <FormLabel>Accepting applications</FormLabel>
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
                    <Textarea rows={3} placeholder="Shown under the title on the public page." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fee</CardTitle>
            <CardDescription>
              Total = fees + tax%. Payment is collected manually (coupons supported on the public form).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="fees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Application fee (₹, optional)</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" placeholder="500" {...field} />
                  </FormControl>
                  <FormDescription>Blank = free application.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="taxPercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax % (optional)</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" placeholder="18" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eligibility options</CardTitle>
            <CardDescription>Limit which institutes/countries applicants can pick. Select none = all.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="instituteIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allowed institutes</FormLabel>
                  <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-3">
                    {institutes.map((institute) => (
                      <label key={institute.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={field.value.includes(String(institute.id))}
                          onChange={() =>
                            field.onChange(toggleInArray(field.value, String(institute.id)))
                          }
                        />
                        {institute.name}
                      </label>
                    ))}
                    {institutes.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No institutes configured.</p>
                    ) : null}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="countries"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allowed countries</FormLabel>
                  <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-3">
                    {countries.map((country) => (
                      <label key={country} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={field.value.includes(country)}
                          onChange={() => field.onChange(toggleInArray(field.value, country))}
                        />
                        {country}
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <SubmitButton pending={pending || navigating}>
            {initial ? "Save changes" : "Create form"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
}

/* ------------------------------- responses ------------------------------- */

export type AppResponseRow = {
  id: number;
  leadId: number;
  name: string;
  mobile: string;
  email: string;
  fillPercentage: number;
  otpVerified: boolean;
  paymentAmount: number;
  paymentStatus: number;
  discount: number | null;
  status: string | null;
  createdAt: string;
};

export function ResponsesTable({
  rows,
  formTitle,
}: {
  rows: AppResponseRow[];
  formTitle: string;
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Applicant</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Complete</TableHead>
            <TableHead>Verified</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <EmptyRow colSpan={8} message={`No applications submitted through “${formTitle}” yet.`} />
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="font-medium">{row.name || "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.mobile}
                    {row.email ? ` · ${row.email}` : ""}
                  </div>
                </TableCell>
                <TableCell>
                  {row.leadId ? (
                    <Link href={`/leads/${row.leadId}`} className="text-primary underline">
                      #{row.leadId}
                    </Link>
                  ) : (
                    <Badge variant="secondary">draft</Badge>
                  )}
                </TableCell>
                <TableCell>{row.fillPercentage}%</TableCell>
                <TableCell>
                  {row.otpVerified ? (
                    <Badge>verified</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {row.paymentAmount > 0
                    ? `₹ ${row.paymentAmount.toLocaleString("en-IN")}`
                    : "Free"}
                  {row.discount ? (
                    <span className="ml-1 text-xs text-emerald-600">−₹{row.discount}</span>
                  ) : null}
                </TableCell>
                <TableCell>
                  {row.paymentStatus === 1 ? (
                    <Badge className="gap-1">
                      <CheckCircle2 className="size-3" /> paid
                    </Badge>
                  ) : row.paymentAmount > 0 ? (
                    <Badge variant="secondary">pending</Badge>
                  ) : (
                    <Badge variant="outline">n/a</Badge>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {new Date(row.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {row.paymentStatus === 0 && row.paymentAmount > 0 ? (
                    <ConfirmDialog
                      title="Mark payment as received?"
                      confirmLabel="Mark paid"
                      description={`Confirm you received ₹${row.paymentAmount.toLocaleString("en-IN")} from ${row.name || row.mobile}.`}
                      action={() => markApplicationPaid(row.id)}
                      trigger={
                        <Button size="sm" variant="outline">
                          Mark paid
                        </Button>
                      }
                    />
                  ) : null}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
