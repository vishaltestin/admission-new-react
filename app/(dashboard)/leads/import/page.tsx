import type { Metadata } from "next";

import { auth } from "@/auth";
import { ImportForm } from "@/components/leads/import-form";
import { PageHeader } from "@/components/layout/page-header";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { Download } from "lucide-react";

export const metadata: Metadata = { title: "Import leads" };

const uploadStatusStyles: Record<string, string> = {
  completed: "text-emerald-600 dark:text-emerald-400",
  partial: "text-amber-600 dark:text-amber-400",
  failed: "text-destructive",
  processing: "text-muted-foreground",
};

export default async function ImportLeadsPage() {
  const session = await auth();
  const organizationId = session?.user?.organizationId ?? null;
  const scope = organizationId != null ? { organizationId } : {};

  const [statuses, sources, users, uploads] = await Promise.all([
    prisma.leadStatus.findMany({
      where: { ...scope, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.leadSource.findMany({ where: { ...scope, status: 1 }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { status: 1, ...scope },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.leadUpload.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Import leads"
        description="Bulk-import leads from a CSV file exported from Excel or another tool."
        actions={
          <Button variant="outline" asChild>
            <a href="/leads/import/sample">
              <Download />
              Sample CSV
            </a>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upload</CardTitle>
            <CardDescription>
              Rows are validated one by one. Duplicates (same mobile) are
              skipped automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImportForm
              statuses={statuses.map((s) => ({ id: s.id, name: s.name }))}
              sources={sources.map((s) => ({ id: s.id, name: s.name }))}
              users={users.map((u) => ({
                id: u.id,
                name:
                  [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expected format</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              The first row must be the header. Required column:
            </p>
            <Badge variant="secondary" className="font-mono">mobile</Badge>
            <p className="text-muted-foreground">Optional columns:</p>
            <div className="flex flex-wrap gap-1.5">
              {["name", "alternate_mobile", "email", "city", "state", "country", "source", "status", "type", "note"].map(
                (column) => (
                  <Badge key={column} variant="outline" className="font-mono">
                    {column}
                  </Badge>
                ),
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              <code>source</code>, <code>status</code> and <code>type</code> are
              matched by name against your Lead Masters (case-insensitive).
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent uploads</CardTitle>
          <CardDescription>The last 10 import batches.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Imported</TableHead>
                <TableHead>Duplicates</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>By</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No imports yet.
                  </TableCell>
                </TableRow>
              ) : (
                uploads.map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell className="font-medium">
                      {upload.fileName ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {upload.totalRows}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {upload.validRows}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {upload.duplicateRows}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {upload.failedRows}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={uploadStatusStyles[upload.status] ?? ""}
                      >
                        {upload.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {[upload.user.firstName, upload.user.lastName]
                        .filter(Boolean)
                        .join(" ") || upload.user.email}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDateTime(upload.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
