"use client";

import { useEffect, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2, UserRoundCheck, UserRoundX } from "lucide-react";
import { useForm } from "react-hook-form";

import {
  createUser,
  deleteUser,
  toggleUserStatus,
  updateUser,
} from "@/lib/actions/user-actions";
import {
  userCreateFormSchema,
  userEditFormSchema,
  type UserCreateFormData,
  type UserEditFormData,
} from "@/lib/validations/user";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  ActiveCell,
  CrudDialog,
  EmptyRow,
  SubmitButton,
  SwitchFormField,
  useCrudSubmit,
} from "@/components/crud";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { formatDate, initials } from "@/lib/format";
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

export type UserRow = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  location: string | null;
  status: boolean;
  lastLogin: string | null;
  roleId: number | null;
  roleName: string | null;
};

export type RoleOption = { id: number; name: string };

function displayName(row: UserRow) {
  return [row.firstName, row.lastName].filter(Boolean).join(" ") || row.email;
}

const createDefaults: UserCreateFormData = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  roleId: "",
  location: "",
  status: true,
};

export function UserDialog({
  trigger,
  roles,
  initial,
}: {
  trigger: ReactNode;
  roles: RoleOption[];
  initial?: UserRow;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = !!initial;

  const form = useForm<UserCreateFormData | UserEditFormData>({
    resolver: zodResolver(isEdit ? userEditFormSchema : userCreateFormSchema),
    defaultValues: isEdit
      ? {
          firstName: initial.firstName ?? "",
          lastName: initial.lastName ?? "",
          email: initial.email,
          password: "",
          roleId: initial.roleId ? String(initial.roleId) : "",
          location: initial.location ?? "",
          status: initial.status,
        }
      : createDefaults,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        isEdit
          ? {
              firstName: initial.firstName ?? "",
              lastName: initial.lastName ?? "",
              email: initial.email,
              password: "",
              roleId: initial.roleId ? String(initial.roleId) : "",
              location: initial.location ?? "",
              status: initial.status,
            }
          : createDefaults,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const { pending, submit } = useCrudSubmit<UserCreateFormData | UserEditFormData>({
    form,
    close: () => setOpen(false),
    action: (values) =>
      initial ? updateUser(initial.id, values) : createUser(values),
  });

  return (
    <CrudDialog
      trigger={trigger}
      open={open}
      setOpen={setOpen}
      title={isEdit ? "Edit user" : "Add user"}
      description="Users can sign in to the CRM and work on leads."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First name</FormLabel>
                  <FormControl>
                    <Input placeholder="Priya" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last name</FormLabel>
                  <FormControl>
                    <Input placeholder="Singh" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="priya@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isEdit ? "New password" : "Password"}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={isEdit ? "Leave blank to keep current" : "Min. 8 characters"}
                      autoComplete="new-password"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={String(role.id)}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription>City or branch the user works from.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <SwitchFormField form={form} name="status" label="Active" />
          <DialogFooter>
            <SubmitButton pending={pending}>
              {isEdit ? "Save changes" : "Create user"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </Form>
    </CrudDialog>
  );
}

export function UsersTable({
  rows,
  roles,
  currentUserId,
}: {
  rows: UserRow[];
  roles: RoleOption[];
  currentUserId: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage who can sign in and what role they have.
        </p>
        <UserDialog
          roles={roles}
          trigger={
            <Button size="sm">
              <Plus />
              Add user
            </Button>
          }
        />
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={6} message="No users yet." />
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback>{initials(displayName(row))}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {displayName(row)}
                          {row.id === currentUserId ? (
                            <Badge variant="secondary" className="ml-2">
                              You
                            </Badge>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {row.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.roleName ? (
                      <Badge variant="outline">{row.roleName}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.location ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.lastLogin ? formatDate(row.lastLogin) : "Never"}
                  </TableCell>
                  <TableCell>
                    <ActiveCell active={row.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <UserDialog
                        roles={roles}
                        initial={row}
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Edit user">
                            <Pencil />
                          </Button>
                        }
                      />
                      {row.id !== currentUserId ? (
                        <>
                          <ConfirmDialog
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label={row.status ? "Deactivate user" : "Activate user"}
                                title={row.status ? "Deactivate" : "Activate"}
                              >
                                {row.status ? <UserRoundX /> : <UserRoundCheck />}
                              </Button>
                            }
                            title={
                              row.status
                                ? `Deactivate ${displayName(row)}?`
                                : `Activate ${displayName(row)}?`
                            }
                            description={
                              row.status
                                ? "They will no longer be able to sign in."
                                : "They will be able to sign in again."
                            }
                            confirmLabel={row.status ? "Deactivate" : "Activate"}
                            action={() => toggleUserStatus(row.id)}
                          />
                          <ConfirmDialog
                            trigger={
                              <Button variant="ghost" size="icon-xs" aria-label="Delete user">
                                <Trash2 className="text-destructive" />
                              </Button>
                            }
                            title={`Delete ${displayName(row)}?`}
                            description="This permanently removes the account. Reassign their leads first."
                            action={() => deleteUser(row.id)}
                          />
                        </>
                      ) : null}
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
