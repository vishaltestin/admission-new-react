"use client";

import { useEffect, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { createTeam, deleteTeam, updateTeam } from "@/lib/actions/team-actions";
import { teamFormSchema, type TeamFormData } from "@/lib/validations/team";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { initials } from "@/lib/format";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export type TeamRow = {
  id: number;
  name: string;
  head: number | null;
  headName: string | null;
  memberIds: number[];
  memberNames: string[];
  status: boolean;
  leadCount: number;
};

export type UserOption = { id: number; name: string };

function TeamDialog({
  trigger,
  users,
  initial,
}: {
  trigger: ReactNode;
  users: UserOption[];
  initial?: TeamRow;
}) {
  const [open, setOpen] = useState(false);

  const toForm = (row?: TeamRow): TeamFormData =>
    row
      ? {
          name: row.name,
          head: row.head ? String(row.head) : "none",
          memberIds: row.memberIds,
          status: row.status,
        }
      : { name: "", head: "none", memberIds: [], status: true };

  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: toForm(initial),
  });

  useEffect(() => {
    if (open) form.reset(toForm(initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const { pending, submit } = useCrudSubmit<TeamFormData>({
    form,
    close: () => setOpen(false),
    action: (values) =>
      initial ? updateTeam(initial.id, values) : createTeam(values),
  });

  const selectedMembers = form.watch("memberIds") ?? [];

  return (
    <CrudDialog
      trigger={trigger}
      open={open}
      setOpen={setOpen}
      title={initial ? "Edit team" : "Add team"}
      description="Teams group counselors for lead distribution and reporting."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team name</FormLabel>
                <FormControl>
                  <Input placeholder="North Zone – Field sales" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="head"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team head</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? "none"}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="No head" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No head</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.name}
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
            name="memberIds"
            render={() => (
              <FormItem>
                <FormLabel>Members</FormLabel>
                <FormDescription>
                  Choose the counselors in this team.
                </FormDescription>
                <ScrollArea className="h-44 rounded-lg border p-3">
                  <div className="space-y-2.5">
                    {users.map((user) => {
                      const checked = selectedMembers.includes(user.id);
                      return (
                        <label
                          key={user.id}
                          className="flex cursor-pointer items-center gap-2.5 text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(state) => {
                              const next =
                                state === true
                                  ? [...selectedMembers, user.id]
                                  : selectedMembers.filter((id) => id !== user.id);
                              form.setValue("memberIds", next, {
                                shouldDirty: true,
                              });
                            }}
                          />
                          {user.name}
                        </label>
                      );
                    })}
                  </div>
                </ScrollArea>
                <p className="text-xs text-muted-foreground">
                  {selectedMembers.length} member(s) selected
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <SwitchFormField form={form} name="status" label="Active" />
          <DialogFooter>
            <SubmitButton pending={pending}>
              {initial ? "Save changes" : "Create team"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </Form>
    </CrudDialog>
  );
}

export function TeamsTable({
  rows,
  users,
}: {
  rows: TeamRow[];
  users: UserOption[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Group counselors into teams with a head and members.
        </p>
        <TeamDialog
          users={users}
          trigger={
            <Button size="sm">
              <Plus />
              Add team
            </Button>
          }
        />
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team</TableHead>
              <TableHead>Head</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Assigned leads</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={6} message="No teams yet." />
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>
                    {row.headName ? (
                      <Badge variant="outline">{row.headName}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-72 flex-wrap gap-1">
                      {row.memberNames.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        row.memberNames.slice(0, 4).map((name) => (
                          <Badge key={name} variant="secondary" className="gap-1">
                            <Avatar className="size-3.5">
                              <AvatarFallback className="text-[8px]">
                                {initials(name)}
                              </AvatarFallback>
                            </Avatar>
                            {name}
                          </Badge>
                        ))
                      )}
                      {row.memberNames.length > 4 ? (
                        <Badge variant="secondary">
                          +{row.memberNames.length - 4}
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.leadCount}
                  </TableCell>
                  <TableCell>
                    <ActiveCell active={row.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <TeamDialog
                        users={users}
                        initial={row}
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Edit team">
                            <Pencil />
                          </Button>
                        }
                      />
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon-xs" aria-label="Delete team">
                            <Trash2 className="text-destructive" />
                          </Button>
                        }
                        title={`Delete team "${row.name}"?`}
                        description="Members keep their accounts; only the team is removed."
                        action={() => deleteTeam(row.id)}
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
