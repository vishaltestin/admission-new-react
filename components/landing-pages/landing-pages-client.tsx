"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  createLandingPage,
  deleteLandingPage,
  updateLandingPage,
} from "@/lib/actions/landing-page-actions";
import {
  landingPageFormSchema,
  type LandingPageFormData,
} from "@/lib/validations/landing";
import { slugify } from "@/lib/validations/webforms";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyRow, SubmitButton, SwitchFormField, useCrudSubmit } from "@/components/crud";
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
import { Textarea } from "@/components/ui/textarea";

export type LandingPageRow = {
  id: number;
  slug: string;
  title: string | null;
  published: boolean;
  viewCount: number;
};

export type Option = { id: number; name: string };

export type LandingPageInitial = (LandingPageFormData & { id: number; slugOriginal: string }) | null;

/* --------------------------------- list --------------------------------- */

export function LandingPagesTable({ rows }: { rows: LandingPageRow[] }) {
  return (
    <>
      <div className="flex justify-end">
        <Button asChild>
          <Link href="/landing-pages/new">
            <Plus /> New landing page
          </Link>
        </Button>
      </div>
      <div className="mt-4 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Views</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={5} message="No landing pages yet. Build one and embed a webform to capture leads." />
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.title ?? "Untitled"}</TableCell>
                  <TableCell>
                    <Link
                      href={`/p/${row.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 font-mono text-xs hover:underline"
                    >
                      /p/{row.slug} <ExternalLink className="size-3" />
                    </Link>
                  </TableCell>
                  <TableCell>
                    {row.published ? (
                      <Badge>published</Badge>
                    ) : (
                      <Badge variant="secondary">draft</Badge>
                    )}
                  </TableCell>
                  <TableCell>{row.viewCount}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/landing-pages/${row.id}`} aria-label="Edit">
                          <Pencil className="size-4" />
                        </Link>
                      </Button>
                      <ConfirmDialog
                        title="Delete landing page?"
                        description={`The page at /p/${row.slug} will go offline. Captured leads are kept.`}
                        action={() => deleteLandingPage(row.id)}
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

/* --------------------------------- form --------------------------------- */

export function LandingPageForm({
  initial,
  campaigns,
  webforms,
}: {
  initial: LandingPageInitial;
  campaigns: Option[];
  webforms: Option[];
}) {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  const form = useForm<LandingPageFormData>({
    resolver: zodResolver(landingPageFormSchema),
    defaultValues: initial ?? {
      title: "",
      slug: "",
      campaignId: "none",
      published: true,
      heroHeading: "",
      heroSubheading: "",
      heroCtaLabel: "",
      heroCtaUrl: "",
      heroImageUrl: "",
      aboutText: "",
      webformId: "none",
      features: [],
    },
  });
  const featuresField = useFieldArray({ control: form.control, name: "features" });
  const { pending, submit } = useCrudSubmit({
    action: async (values: LandingPageFormData) => {
      const result = initial
        ? await updateLandingPage(initial.id, values)
        : await createLandingPage(values);
      const createdId = (result.data as { id?: number } | undefined)?.id;
      if (!initial && result.success && createdId) {
        setNavigating(true);
        router.push(`/landing-pages/${createdId}`);
      }
      return result;
    },
    form,
    close: () => router.refresh(),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basics</CardTitle>
            <CardDescription>The page is public at /p/your-slug.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="MBA Open House 2026"
                      {...field}
                      onChange={(event) => {
                        field.onChange(event);
                        if (!initial) {
                          form.setValue("slug", slugify(event.target.value), {
                            shouldValidate: true,
                          });
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="mba-open-house-2026" {...field} />
                  </FormControl>
                  <FormDescription>Globally unique — used in the public URL.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="campaignId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign (optional)</FormLabel>
                  <Select value={field.value || "none"} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Campaign" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {campaigns.map((option) => (
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
            <SwitchFormField form={form} name="published" label="Published (public)" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hero section</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="heroHeading"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Heading</FormLabel>
                  <FormControl>
                    <Input placeholder="Admissions open for 2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="heroSubheading"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Subheading</FormLabel>
                  <FormControl>
                    <Input placeholder="Apply in 2 minutes — counsellors call you back today." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="heroCtaLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CTA button label</FormLabel>
                  <FormControl>
                    <Input placeholder="Apply now" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="heroCtaUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CTA button URL</FormLabel>
                  <FormControl>
                    <Input placeholder="#apply" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="heroImageUrl"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Background image URL (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://…/campus.jpg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <CardDescription>Up to 6 highlights shown as cards under the hero.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {featuresField.fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[220px_1fr_auto] items-start gap-2">
                <FormField
                  control={form.control}
                  name={`features.${index}.title`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Scholarships" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`features.${index}.text`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Merit-based support up to 50%" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => featuresField.remove(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={featuresField.fields.length >= 6}
              onClick={() => featuresField.append({ title: "", text: "" })}
            >
              <Plus /> Add feature
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About & capture form</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="aboutText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>About text (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="A few lines about the institute/program…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="webformId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Embed webform (optional)</FormLabel>
                  <Select value={field.value || "none"} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No form" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No form</SelectItem>
                      {webforms.map((option) => (
                        <SelectItem key={option.id} value={String(option.id)}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Submitted leads flow through the same dedupe + automation pipeline.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <SubmitButton pending={pending || navigating}>
            {initial ? "Save changes" : "Create page"}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
}
