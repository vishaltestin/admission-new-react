"use client";

import { useEffect, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { createRole, deleteRole, updateRole } from "@/lib/actions/user-actions";
import { roleFormSchema, type RoleFormData } from "@/lib/validations/user";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  CrudDialog,
  EmptyRow,
  SubmitButton,
  useCrudSubmit,
} from "@/components/crud";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type RoleRow = {
  id: number;
  name: string;
  slug: string;
  userCount: number;
};

const roleDefaults: RoleFormData = { name: "", slug: "" };

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function RoleDialog({
  trigger,
  initial,
}: {
  trigger: ReactNode;
  initial?: RoleRow;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: initial ? { name: initial.name, slug: initial.slug } : roleDefaults,
  });

  useEffect(() => {
    if (open)
      form.reset(
        initial ? { name: initial.name, slug: initial.slug } : roleDefaults,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const { pending, submit } = useCrudSubmit<RoleFormData>({
    form,
    close: () => setOpen(false),
    action: (values) =>
      initial ? updateRole(initial.id, values) : createRole(values),
  });

  return (
    <CrudDialog
      trigger={trigger}
      open={open}
      setOpen={setOpen}
      title={initial ? "Edit role" : "Add role"}
      description="Roles group users, e.g. Admin, Manager, Counselor."
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
                  <Input
                    placeholder="Counselor"
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
                  <Input placeholder="counselor" {...field} />
                </FormControl>
                <FormDescription>
                  Unique identifier used in code. Lowercase letters, numbers and
                  dashes.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <SubmitButton pending={pending}>
              {initial ? "Save changes" : "Create role"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </Form>
    </CrudDialog>
  );
}

export function RolesTable({ rows }: { rows: RoleRow[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Roles define groups of users. Granular permissions are planned for a
          later phase.
        </p>
        <RoleDialog
          trigger={
            <Button size="sm">
              <Plus />
              Add role
            </Button>
          }
        />
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Users</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={4} message="No roles yet." />
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {row.slug}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.userCount}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <RoleDialog
                        initial={row}
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Edit role">
                            <Pencil />
                          </Button>
                        }
                      />
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Delete role">
                            <Trash2 className="text-destructive" />
                          </Button>
                        }
                        title={`Delete role "${row.name}"?`}
                        description="Roles assigned to users cannot be deleted."
                        action={() => deleteRole(row.id)}
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
