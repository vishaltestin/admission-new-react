"use client";

import { useRef, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileSpreadsheet, Loader2, RotateCcw, UploadCloud } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useRouter } from "next/navigation";
import {
  IMPORT_TARGETS,
  previewImport,
  runMappedImport,
  type ImportPreview,
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

const SKIP = "__skip";

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
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errorIssue, setErrorIssue] = useState<string | null>(null);

  const form = useForm<ImportFormData>({
    resolver: zodResolver(importFormSchema),
    defaultValues: { leadStatusId: "", leadSourceId: "", leadAssignTo: "" },
  });

  function buildFormData(): FormData | null {
    const file = fileRef.current?.files?.[0];
    if (!file) return null;
    const values = form.getValues();
    const formData = new FormData();
    formData.set("file", file);
    if (values.leadStatusId) formData.set("leadStatusId", values.leadStatusId);
    if (values.leadSourceId) formData.set("leadSourceId", values.leadSourceId);
    if (values.leadAssignTo) formData.set("leadAssignTo", values.leadAssignTo);
    return formData;
  }

  function loadPreview() {
    setErrorIssue(null);
    setSummary(null);
    if (!fileRef.current?.files?.[0]) {
      setErrorIssue("Please choose a file first.");
      return;
    }
    const formData = buildFormData();
    if (!formData) return;
    startTransition(async () => {
      const result = await previewImport(formData);
      if (!result.success) {
        setErrorIssue(result.message ?? "Could not read the file");
        toast.error(result.message ?? "Could not read the file");
        return;
      }
      const data = result.data as ImportPreview;
      setPreview(data);
      setMapping(data.suggested);
    });
  }

  function startImport() {
    setErrorIssue(null);
    setSummary(null);
    const formData = buildFormData();
    if (!formData) return;
    const cleaned: Record<string, string> = {};
    for (const target of IMPORT_TARGETS) {
      const value = mapping[target.key];
      if (value && value !== SKIP) cleaned[target.key] = value;
    }
    formData.set("mapping", JSON.stringify(cleaned));
    startTransition(async () => {
      const result = await runMappedImport(formData);
      if (!result.success) {
        setErrorIssue(result.message ?? "Import failed");
        toast.error(result.message ?? "Import failed");
        return;
      }
      toast.success(result.message ?? "Import finished");
      setSummary(result.data as ImportSummary);
      setPreview(null);
      setFileName(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    });
  }

  function resetAll() {
    setPreview(null);
    setMapping({});
    setFileName(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          {!preview ? (
            <>
              <div>
                <label
                  htmlFor="import-file"
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center hover:bg-muted/40"
                >
                  <UploadCloud className="size-8 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {fileName ?? "Click to choose a CSV or Excel file"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    .csv, .xlsx or .xls — max 2 MB / 1000 rows.
                  </span>
                </label>
                <Input
                  id="import-file"
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
                        Used when a row has no mapped status column.
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

              <Button type="button" onClick={loadPreview} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
                Load preview & map columns
              </Button>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Map columns</CardTitle>
                <CardDescription>
                  {preview.fileName} — {preview.rowCount} rows. Match each lead field to a
                  column from your file; unmatched fields are left empty.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {IMPORT_TARGETS.map((target) => (
                    <div key={target.key}>
                      <p className="mb-1 text-sm font-medium">{target.label}</p>
                      <Select
                        value={mapping[target.key] || SKIP}
                        onValueChange={(value) =>
                          setMapping((current) => ({ ...current, [target.key]: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="— skip —" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SKIP}>— skip —</SelectItem>
                          {preview.headers.map((header, index) => (
                            <SelectItem key={`${header}-${index}`} value={header}>
                              {header || `(column ${index + 1})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {preview.headers.map((header, index) => (
                          <TableHead key={index} className="whitespace-nowrap">
                            {header || `(col ${index + 1})`}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.sample.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <TableCell key={cellIndex} className="max-w-40 truncate">
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center gap-2">
                  <Button type="button" onClick={startImport} disabled={pending}>
                    {pending ? <Loader2 className="animate-spin" /> : <UploadCloud />}
                    Import {preview.rowCount} rows
                  </Button>
                  <Button type="button" variant="outline" onClick={resetAll} disabled={pending}>
                    <RotateCcw /> Choose a different file
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
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
                      <TableHead>Row</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.failures.map((failure) => (
                      <TableRow key={failure.row}>
                        <TableCell>{failure.row}</TableCell>
                        <TableCell>{failure.mobile || "—"}</TableCell>
                        <TableCell>{failure.name || "—"}</TableCell>
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
