"use client";

import { useEffect, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";

import {
  createInstitute,
  createLeadSource,
  createLeadStatus,
  createLeadSubStatus,
  createLeadType,
  createProgram,
  deleteInstitute,
  deleteLeadSourceMaster,
  deleteLeadStatusMaster,
  deleteLeadSubStatusMaster,
  deleteLeadTypeMaster,
  deleteProgram,
  updateInstitute,
  updateLeadSourceMaster,
  updateLeadStatusMaster,
  updateLeadSubStatusMaster,
  updateLeadTypeMaster,
  updateProgram,
} from "@/lib/actions/master-actions";
import {
  instituteFormSchema,
  programFormSchema,
  sourceFormSchema,
  statusFormSchema,
  subStatusFormSchema,
  typeFormSchema,
  type InstituteFormData,
  type ProgramFormData,
  type SourceFormData,
  type StatusFormData,
  type SubStatusFormData,
  type TypeFormData,
} from "@/lib/validations/masters";
import {
  ActiveCell,
  CrudDialog,
  EmptyRow,
  SubmitButton,
  SwitchFormField,
  useCrudSubmit,
} from "@/components/crud";
import { formatCurrency } from "@/lib/format";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
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

/* ---------------------------------------------------------------------------
 * Row types (serialized from the server)
 * ------------------------------------------------------------------------- */

export type StatusRow = {
  id: number;
  name: string;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
  subStatusCount: number;
  leadCount: number;
};

export type SubStatusRow = {
  id: number;
  name: string;
  leadStatusId: number;
  statusName: string;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type SourceRow = {
  id: number;
  name: string;
  leadCount: number;
  billingSetupAmount: number;
  status: boolean;
};

export type TypeRow = { id: number; name: string; status: boolean };

export type InstituteRow = {
  id: number;
  name: string;
  description: string | null;
  status: boolean;
  programCount: number;
};

export type ProgramRow = {
  id: number;
  name: string;
  instituteId: number;
  instituteName: string;
  description: string | null;
  status: boolean;
};

export type SimpleOption = { id: number; name: string };


function ColorDot({ color }: { color: string | null }) {
  return (
    <span
      className="inline-block size-4 rounded-full border"
      style={{ backgroundColor: color ?? "transparent" }}
    />
  );
}

/* ---------------------------------------------------------------------------
 * Statuses tab
 * ------------------------------------------------------------------------- */

const statusDefaults: StatusFormData = {
  name: "",
  color: "",
  sortOrder: "",
  isActive: true,
};

function statusToForm(row: StatusRow): StatusFormData {
  return {
    name: row.name,
    color: row.color ?? "",
    sortOrder: String(row.sortOrder),
    isActive: row.isActive,
  };
}

export function StatusDialog({
  trigger,
  initial,
}: {
  trigger: ReactNode;
  initial?: StatusRow;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<StatusFormData>({
    resolver: zodResolver(statusFormSchema),
    defaultValues: initial ? statusToForm(initial) : statusDefaults,
  });

  useEffect(() => {
    if (open) form.reset(initial ? statusToForm(initial) : statusDefaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const { pending, submit } = useCrudSubmit<StatusFormData>({
    form,
    close: () => setOpen(false),
    action: (values) =>
      initial ? updateLeadStatusMaster(initial.id, values) : createLeadStatus(values),
  });

  return (
    <CrudDialog
      trigger={trigger}
      open={open}
      setOpen={setOpen}
      title={initial ? "Edit status" : "Add status"}
      description="Statuses appear in the lead pipeline, e.g. New, Follow Up, Converted."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Follow Up" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        className="h-8 w-10 cursor-pointer rounded-md border bg-background p-0.5"
                        value={field.value || "#94a3b8"}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                      <Input placeholder="#f59e0b" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort order</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <SwitchFormField form={form} name="isActive" label="Active" />
          <DialogFooter>
            <SubmitButton pending={pending}>
              {initial ? "Save changes" : "Create status"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </Form>
    </CrudDialog>
  );
}

export function StatusesTab({ rows }: { rows: StatusRow[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Statuses track where a lead is in your process.
        </p>
        <StatusDialog
          trigger={
            <Button size="sm">
              <Plus />
              Add status
            </Button>
          }
        />
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Color</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Sub-statuses</TableHead>
              <TableHead>Leads</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={7} message="No statuses yet." />
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <ColorDot color={row.color} />
                  </TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.sortOrder}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.subStatusCount}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.leadCount}
                  </TableCell>
                  <TableCell>
                    <ActiveCell active={row.isActive} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <StatusDialog
                        initial={row}
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Edit">
                            <Pencil />
                          </Button>
                        }
                      />
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Delete">
                            <Trash2 className="text-destructive" />
                          </Button>
                        }
                        title={`Delete status "${row.name}"?`}
                        description="Statuses in use by leads cannot be deleted."
                        action={() => deleteLeadStatusMaster(row.id)}
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

/* ---------------------------------------------------------------------------
 * Sub-statuses tab
 * ------------------------------------------------------------------------- */

function subStatusToForm(row: SubStatusRow): SubStatusFormData {
  return {
    name: row.name,
    leadStatusId: String(row.leadStatusId),
    color: row.color ?? "",
    sortOrder: String(row.sortOrder),
    isActive: row.isActive,
  };
}

const subStatusDefaults: SubStatusFormData = {
  name: "",
  leadStatusId: "",
  color: "",
  sortOrder: "",
  isActive: true,
};

export function SubStatusDialog({
  trigger,
  statuses,
  initial,
}: {
  trigger: ReactNode;
  statuses: SimpleOption[];
  initial?: SubStatusRow;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<SubStatusFormData>({
    resolver: zodResolver(subStatusFormSchema),
    defaultValues: initial ? subStatusToForm(initial) : subStatusDefaults,
  });

  useEffect(() => {
    if (open)
      form.reset(initial ? subStatusToForm(initial) : subStatusDefaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const { pending, submit } = useCrudSubmit<SubStatusFormData>({
    form,
    close: () => setOpen(false),
    action: (values) =>
      initial
        ? updateLeadSubStatusMaster(initial.id, values)
        : createLeadSubStatus(values),
  });

  return (
    <CrudDialog
      trigger={trigger}
      open={open}
      setOpen={setOpen}
      title={initial ? "Edit sub-status" : "Add sub-status"}
      description="Sub-statuses refine a status, e.g. New → Ringing, New → Not reachable."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <FormField
            control={form.control}
            name="leadStatusId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parent status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statuses.map((option) => (
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Ringing" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        className="h-8 w-10 cursor-pointer rounded-md border bg-background p-0.5"
                        value={field.value || "#94a3b8"}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                      <Input placeholder="#f59e0b" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort order</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <SwitchFormField form={form} name="isActive" label="Active" />
          <DialogFooter>
            <SubmitButton pending={pending}>
              {initial ? "Save changes" : "Create sub-status"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </Form>
    </CrudDialog>
  );
}

export function SubStatusesTab({
  rows,
  statuses,
}: {
  rows: SubStatusRow[];
  statuses: SimpleOption[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Sub-statuses belong to a parent status and refine it.
        </p>
        <SubStatusDialog
          statuses={statuses}
          trigger={
            <Button size="sm">
              <Plus />
              Add sub-status
            </Button>
          }
        />
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Color</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Parent status</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={6} message="No sub-statuses yet." />
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <ColorDot color={row.color} />
                  </TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.statusName}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.sortOrder}
                  </TableCell>
                  <TableCell>
                    <ActiveCell active={row.isActive} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <SubStatusDialog
                        statuses={statuses}
                        initial={row}
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Edit">
                            <Pencil />
                          </Button>
                        }
                      />
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Delete">
                            <Trash2 className="text-destructive" />
                          </Button>
                        }
                        title={`Delete sub-status "${row.name}"?`}
                        description="Sub-statuses in use by leads cannot be deleted."
                        action={() => deleteLeadSubStatusMaster(row.id)}
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

/* ---------------------------------------------------------------------------
 * Sources tab
 * ------------------------------------------------------------------------- */

function sourceToForm(row: SourceRow): SourceFormData {
  return {
    name: row.name,
    billingSetupAmount: row.billingSetupAmount ? String(row.billingSetupAmount) : "",
    status: row.status,
  };
}

const sourceDefaults: SourceFormData = {
  name: "",
  billingSetupAmount: "",
  status: true,
};

export function SourceDialog({
  trigger,
  initial,
}: {
  trigger: ReactNode;
  initial?: SourceRow;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<SourceFormData>({
    resolver: zodResolver(sourceFormSchema),
    defaultValues: initial ? sourceToForm(initial) : sourceDefaults,
  });

  useEffect(() => {
    if (open) form.reset(initial ? sourceToForm(initial) : sourceDefaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const { pending, submit } = useCrudSubmit<SourceFormData>({
    form,
    close: () => setOpen(false),
    action: (values) =>
      initial ? updateLeadSourceMaster(initial.id, values) : createLeadSource(values),
  });

  return (
    <CrudDialog
      trigger={trigger}
      open={open}
      setOpen={setOpen}
      title={initial ? "Edit source" : "Add source"}
      description="Sources track where leads come from, e.g. Facebook, Google Ads, Walk-in."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Facebook Ads" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="billingSetupAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount per lead (₹)</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" placeholder="0.00" {...field} />
                </FormControl>
                <FormDescription>
                  Used to estimate spend for this source. Leave empty for 0.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <SwitchFormField form={form} name="status" label="Active" />
          <DialogFooter>
            <SubmitButton pending={pending}>
              {initial ? "Save changes" : "Create source"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </Form>
    </CrudDialog>
  );
}

export function SourcesTab({ rows }: { rows: SourceRow[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Sources tell you which channels bring in leads.
        </p>
        <SourceDialog
          trigger={
            <Button size="sm">
              <Plus />
              Add source
            </Button>
          }
        />
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Leads</TableHead>
              <TableHead>Amount / lead</TableHead>
              <TableHead>Est. spend</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={6} message="No sources yet." />
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.leadCount}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatCurrency(row.billingSetupAmount)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatCurrency(row.leadCount * row.billingSetupAmount)}
                  </TableCell>
                  <TableCell>
                    <ActiveCell active={row.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <SourceDialog
                        initial={row}
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Edit">
                            <Pencil />
                          </Button>
                        }
                      />
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Delete">
                            <Trash2 className="text-destructive" />
                          </Button>
                        }
                        title={`Delete source "${row.name}"?`}
                        description="Sources in use by leads cannot be deleted."
                        action={() => deleteLeadSourceMaster(row.id)}
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

/* ---------------------------------------------------------------------------
 * Types tab
 * ------------------------------------------------------------------------- */

const typeDefaults: TypeFormData = { name: "", status: true };

export function TypeDialog({
  trigger,
  initial,
}: {
  trigger: ReactNode;
  initial?: TypeRow;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<TypeFormData>({
    resolver: zodResolver(typeFormSchema),
    defaultValues: initial ? { name: initial.name, status: initial.status } : typeDefaults,
  });

  useEffect(() => {
    if (open)
      form.reset(
        initial ? { name: initial.name, status: initial.status } : typeDefaults,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const { pending, submit } = useCrudSubmit<TypeFormData>({
    form,
    close: () => setOpen(false),
    action: (values) =>
      initial ? updateLeadTypeMaster(initial.id, values) : createLeadType(values),
  });

  return (
    <CrudDialog
      trigger={trigger}
      open={open}
      setOpen={setOpen}
      title={initial ? "Edit type" : "Add type"}
      description="Types classify leads, e.g. Hot, Warm, Cold."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Hot" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <SwitchFormField form={form} name="status" label="Active" />
          <DialogFooter>
            <SubmitButton pending={pending}>
              {initial ? "Save changes" : "Create type"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </Form>
    </CrudDialog>
  );
}

export function TypesTab({ rows }: { rows: TypeRow[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Types classify leads by interest or quality.
        </p>
        <TypeDialog
          trigger={
            <Button size="sm">
              <Plus />
              Add type
            </Button>
          }
        />
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={3} message="No types yet." />
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>
                    <ActiveCell active={row.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <TypeDialog
                        initial={row}
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Edit">
                            <Pencil />
                          </Button>
                        }
                      />
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Delete">
                            <Trash2 className="text-destructive" />
                          </Button>
                        }
                        title={`Delete type "${row.name}"?`}
                        description="Types in use by leads cannot be deleted."
                        action={() => deleteLeadTypeMaster(row.id)}
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

/* ---------------------------------------------------------------------------
 * Institutes tab
 * ------------------------------------------------------------------------- */

const instituteDefaults: InstituteFormData = {
  name: "",
  description: "",
  status: true,
};

export function InstituteDialog({
  trigger,
  initial,
}: {
  trigger: ReactNode;
  initial?: InstituteRow;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<InstituteFormData>({
    resolver: zodResolver(instituteFormSchema),
    defaultValues: initial
      ? {
          name: initial.name,
          description: initial.description ?? "",
          status: initial.status,
        }
      : instituteDefaults,
  });

  useEffect(() => {
    if (open)
      form.reset(
        initial
          ? {
              name: initial.name,
              description: initial.description ?? "",
              status: initial.status,
            }
          : instituteDefaults,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const { pending, submit } = useCrudSubmit<InstituteFormData>({
    form,
    close: () => setOpen(false),
    action: (values) =>
      initial ? updateInstitute(initial.id, values) : createInstitute(values),
  });

  return (
    <CrudDialog
      trigger={trigger}
      open={open}
      setOpen={setOpen}
      title={initial ? "Edit institute" : "Add institute"}
      description="Institutes group programs, e.g. DF College of Engineering."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="DF College of Engineering" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <SwitchFormField form={form} name="status" label="Active" />
          <DialogFooter>
            <SubmitButton pending={pending}>
              {initial ? "Save changes" : "Create institute"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </Form>
    </CrudDialog>
  );
}

export function InstitutesTab({ rows }: { rows: InstituteRow[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Institutes represent your colleges or campuses.
        </p>
        <InstituteDialog
          trigger={
            <Button size="sm">
              <Plus />
              Add institute
            </Button>
          }
        />
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Programs</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={4} message="No institutes yet." />
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">{row.name}</div>
                    {row.description ? (
                      <div className="max-w-96 truncate text-xs text-muted-foreground">
                        {row.description}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.programCount}
                  </TableCell>
                  <TableCell>
                    <ActiveCell active={row.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <InstituteDialog
                        initial={row}
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Edit">
                            <Pencil />
                          </Button>
                        }
                      />
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Delete">
                            <Trash2 className="text-destructive" />
                          </Button>
                        }
                        title={`Delete institute "${row.name}"?`}
                        description="Institutes in use by leads cannot be deleted."
                        action={() => deleteInstitute(row.id)}
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

/* ---------------------------------------------------------------------------
 * Programs tab
 * ------------------------------------------------------------------------- */

const programDefaults: ProgramFormData = {
  name: "",
  instituteId: "",
  description: "",
  status: true,
};

export function ProgramDialog({
  trigger,
  institutes,
  initial,
}: {
  trigger: ReactNode;
  institutes: SimpleOption[];
  initial?: ProgramRow;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<ProgramFormData>({
    resolver: zodResolver(programFormSchema),
    defaultValues: initial
      ? {
          name: initial.name,
          instituteId: String(initial.instituteId),
          description: initial.description ?? "",
          status: initial.status,
        }
      : programDefaults,
  });

  useEffect(() => {
    if (open)
      form.reset(
        initial
          ? {
              name: initial.name,
              instituteId: String(initial.instituteId),
              description: initial.description ?? "",
              status: initial.status,
            }
          : programDefaults,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const { pending, submit } = useCrudSubmit<ProgramFormData>({
    form,
    close: () => setOpen(false),
    action: (values) =>
      initial ? updateProgram(initial.id, values) : createProgram(values),
  });

  return (
    <CrudDialog
      trigger={trigger}
      open={open}
      setOpen={setOpen}
      title={initial ? "Edit program" : "Add program"}
      description="Programs belong to an institute, e.g. B.Tech CSE."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <FormField
            control={form.control}
            name="instituteId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Institute</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select institute" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {institutes.map((option) => (
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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="B.Tech (CSE)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <SwitchFormField form={form} name="status" label="Active" />
          <DialogFooter>
            <SubmitButton pending={pending}>
              {initial ? "Save changes" : "Create program"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </Form>
    </CrudDialog>
  );
}

export function ProgramsTab({
  rows,
  institutes,
}: {
  rows: ProgramRow[];
  institutes: SimpleOption[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Programs are the courses leads apply to.
        </p>
        <ProgramDialog
          institutes={institutes}
          trigger={
            <Button size="sm">
              <Plus />
              Add program
            </Button>
          }
        />
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Institute</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={4} message="No programs yet." />
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.instituteName}</Badge>
                  </TableCell>
                  <TableCell>
                    <ActiveCell active={row.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <ProgramDialog
                        institutes={institutes}
                        initial={row}
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Edit">
                            <Pencil />
                          </Button>
                        }
                      />
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Delete">
                            <Trash2 className="text-destructive" />
                          </Button>
                        }
                        title={`Delete program "${row.name}"?`}
                        description="Programs in use by leads cannot be deleted."
                        action={() => deleteProgram(row.id)}
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
