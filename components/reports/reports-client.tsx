"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { BarChart3, Download, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  getReportCsv,
  getReportData,
  type ReportData,
} from "@/lib/actions/report-actions";
import {
  REPORT_LABELS,
  REPORT_TYPES,
  reportFormSchema,
  type ReportFormData,
} from "@/lib/validations/reports";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ReportsClient() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: { reportType: "user_wise_activity", dateFrom: "", dateTo: "" },
  });

  const generate = (values: ReportFormData) => {
    startTransition(async () => {
      const data = await getReportData(values);
      if (data.error) {
        toast.error(data.error);
        return;
      }
      if (data.rows.length === 0) toast.info("No data for the selected filters.");
      setReport(data);
    });
  };

  const downloadCsv = () => {
    const values = form.getValues();
    startTransition(async () => {
      const csv = await getReportCsv(values);
      if (!csv) {
        toast.error("Nothing to export.");
        return;
      }
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${values.reportType}-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Pick a report and an optional date range, then generate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(generate)}
              className="grid gap-4 md:grid-cols-[1fr_180px_180px_auto]"
            >
              <FormField
                control={form.control}
                name="reportType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a report" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {REPORT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {REPORT_LABELS[type]}
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
                name="dateFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={pending}>
                  {pending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <BarChart3 />
                  )}
                  Generate
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending || !report}
                  onClick={downloadCsv}
                >
                  <Download />
                  CSV
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {report ? (
        <Card>
          <CardHeader>
            <CardTitle>{report.title}</CardTitle>
            <CardDescription>{report.rows.length} row(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {report.columns.map((column) => (
                      <TableHead key={column.key}>{column.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={report.columns.length}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No data.
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.rows.map((row, index) => (
                      <TableRow key={index}>
                        {report.columns.map((column) => (
                          <TableCell key={column.key}>
                            {row[column.key]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
