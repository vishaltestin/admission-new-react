"use client";

import { useRef, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, UploadCloud } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useRouter } from "next/navigation";
import {
  importLeadsFromCsv,
  type ImportSummary,
} from "@/lib/actions/import-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

const importFormSchema = z.object({
  leadStatusId: z.string().optional(),
  leadSourceId: z.string().optional(),
  leadAssignTo: z.string().optional(),
});

type ImportFormData = z.infer<typeof importFormSchema>;

type Option = { id: number; name: string };

export function ImportForm({
  statuses,
  sources,
  users,
}: {
  statuses: Option[];
  sources: Option[];
  users: Option[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errorIssue, setErrorIssue] = useState<string | null>(null);

  const form = useForm<ImportFormData>({
    resolver: zodResolver(importFormSchema),
    defaultValues: { leadStatusId: "", leadSourceId: "", leadAssignTo: "" },
  });

  function onSubmit(values: ImportFormData) {
    setErrorIssue(null);
    setSummary(null);

    const file = fileRef.current?.files?.[0];
    if (!file) {
      setErrorIssue("Please choose a CSV file first.");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    if (values.leadStatusId) formData.set("leadStatusId", values.leadStatusId);
    if (values.leadSourceId) formData.set("leadSourceId", values.leadSourceId);
    if (values.leadAssignTo) formData.set("leadAssignTo", values.leadAssignTo);

    startTransition(async () => {
      const result = await importLeadsFromCsv(formData);
      if (!result.success) {
        setErrorIssue(result.message ?? "Import failed");
        toast.error(result.message ?? "Import failed");
        return;
      }
      toast.success(result.message ?? "Import finished");
      setSummary(result.data as ImportSummary);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="csv-file"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center hover:bg-muted/40"
            >
              <UploadCloud className="size-8 text-muted-foreground" />
              <span className="text-sm font-medium">
                {fileName ?? "Click to choose a CSV file"}
              </span>
              <span className="text-xs text-muted-foreground">
                Must contain a <code>mobile</code> column. Max 2 MB / 1000 rows.
              </span>
            </label>
            <Input
              id="csv-file"
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) =>
                setFileName(event.target.files?.[0]?.name ?? null)
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="leadStatusId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {statuses.map((option) => (
                        <SelectItem key={option.id} value={String(option.id)}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Used when a row has no status column.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="leadSourceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default source</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {sources.map((option) => (
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
              name="leadAssignTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign to</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
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
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            Start import
          </Button>
        </form>
      </Form>

      {errorIssue ? (
        <Alert variant="destructive">
          <AlertTitle>Import failed</AlertTitle>
          <AlertDescription>{errorIssue}</AlertDescription>
        </Alert>
      ) : null}

      {summary ? (
        <Card>
          <CardHeader>
            <CardTitle>Import summary</CardTitle>
            <CardDescription>Upload #{summary.uploadId}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Total: {summary.total}</Badge>
              <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400">
                Imported: {summary.imported}
              </Badge>
              <Badge variant="outline" className="text-amber-600 dark:text-amber-400">
                Duplicates skipped: {summary.duplicates}
              </Badge>
              <Badge
                variant="outline"
                className={summary.failed > 0 ? "text-destructive" : ""}
              >
                Failed: {summary.failed}
              </Badge>
            </div>

            {summary.failures.length > 0 ? (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.failures.map((failure) => (
                      <TableRow key={failure.row}>
                        <TableCell className="text-muted-foreground">
                          {failure.row}
                        </TableCell>
                        <TableCell>{failure.name || "—"}</TableCell>
                        <TableCell>{failure.mobile || "—"}</TableCell>
                        <TableCell className="text-destructive">
                          {failure.reason}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
