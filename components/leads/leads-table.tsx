"use client";

import Link from "next/link";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { deleteLead } from "@/lib/actions/lead-actions";
import { formatDate } from "@/lib/format";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StatusBadge } from "@/components/leads/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type LeadRow = {
  id: number;
  name: string | null;
  mobile: string;
  email: string | null;
  city: string | null;
  createdAt: string;
  nextFollowupAt: string | null;
  status: { name: string; color: string | null } | null;
  subStatus: { name: string; color: string | null } | null;
  source: { name: string } | null;
  type: { name: string } | null;
  assignee: { name: string } | null;
};

export function LeadsTable({ leads }: { leads: LeadRow[] }) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
        <p className="text-lg font-medium">No leads found</p>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters, or add a new lead.
        </p>
        <Button asChild className="mt-2">
          <Link href="/leads/new">Add lead</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lead</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned to</TableHead>
            <TableHead>Follow-up</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell>
                <Link
                  href={`/leads/${lead.id}`}
                  className="font-medium hover:underline"
                >
                  {lead.name || "Unnamed"}
                </Link>
                {lead.type ? (
                  <Badge variant="secondary" className="ml-2">
                    {lead.type.name}
                  </Badge>
                ) : null}
              </TableCell>
              <TableCell>
                <div className="text-sm">{lead.mobile}</div>
                {lead.email ? (
                  <div className="max-w-48 truncate text-xs text-muted-foreground">
                    {lead.email}
                  </div>
                ) : null}
              </TableCell>
              <TableCell>
                {lead.source ? (
                  <Badge variant="outline">{lead.source.name}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-col items-start gap-1">
                  <StatusBadge
                    name={lead.status?.name}
                    color={lead.status?.color}
                  />
                  {lead.subStatus ? (
                    <span className="text-xs text-muted-foreground">
                      {lead.subStatus.name}
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {lead.assignee?.name ?? "Unassigned"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {lead.nextFollowupAt ? formatDate(lead.nextFollowupAt) : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(lead.createdAt)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Open actions">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link href={`/leads/${lead.id}`}>
                        <Eye />
                        View details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/leads/${lead.id}/edit`}>
                        <Pencil />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <ConfirmDialog
                      trigger={
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={(event) => event.preventDefault()}
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      }
                      title="Delete this lead?"
                      description={`This permanently removes ${lead.name || lead.mobile} and all its notes. This action cannot be undone.`}
                      action={() => deleteLead(lead.id)}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
