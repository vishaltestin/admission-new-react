"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import type { ActionResult } from "@/lib/action-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";

export function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: ReactNode;
}) {
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {children}
    </Button>
  );
}

export function ActiveCell({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400">
      Active
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      Inactive
    </Badge>
  );
}

export function SwitchFormField({
  form,
  name,
  label,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  name: string;
  label: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center justify-between rounded-lg border p-3">
          <FormLabel className="cursor-pointer">{label}</FormLabel>
          <FormControl>
            <Switch checked={!!field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

export function EmptyRow({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="py-8 text-center text-muted-foreground"
      >
        {message}
      </TableCell>
    </TableRow>
  );
}

/** Runs a create/update server action and wires the outcome into the form. */
export function useCrudSubmit<TValues extends object>(options: {
  action: (values: TValues) => Promise<ActionResult>;
  form: UseFormReturn<TValues>;
  close: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = (values: TValues) => {
    startTransition(async () => {
      const result = await options.action(values);
      if (!result.success) {
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (messages?.[0]) {
              options.form.setError(field as never, { message: messages[0] });
            }
          }
        }
        toast.error(result.message ?? "Something went wrong");
        return;
      }
      toast.success(result.message ?? "Saved");
      options.close();
      router.refresh();
    });
  };

  return { pending, submit };
}

export function CrudDialog({
  trigger,
  title,
  description,
  open,
  setOpen,
  children,
  wide,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className={wide ? "sm:max-w-2xl" : undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
