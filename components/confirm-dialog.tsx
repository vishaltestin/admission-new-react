"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { ActionResult } from "@/lib/action-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Generic destructive-action confirmation popup (shadcn AlertDialog).
 *
 * Wraps any trigger element and runs a server action on confirm.
 */
export function ConfirmDialog({
  trigger,
  title = "Are you sure?",
  description,
  confirmLabel = "Delete",
  action,
  onSuccess,
}: {
  trigger: ReactNode;
  title?: string;
  description?: string;
  confirmLabel?: string;
  action: () => Promise<ActionResult>;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm(event: React.MouseEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success(result.message ?? "Done");
        setOpen(false);
        onSuccess?.();
        router.refresh();
      } else {
        toast.error(result.message ?? "Something went wrong");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? "Working…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
