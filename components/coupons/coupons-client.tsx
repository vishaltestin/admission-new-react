"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Ticket, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";

import {
  createCoupon,
  deleteCoupon,
  updateCoupon,
} from "@/lib/actions/coupon-actions";
import { couponFormSchema, type CouponFormData } from "@/lib/validations/coupons";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CrudDialog, EmptyRow, SubmitButton, SwitchFormField, useCrudSubmit } from "@/components/crud";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export type CouponRow = {
  id: number;
  code: string;
  name: string | null;
  type: string;
  value: string;
  minAmount: string | null;
  maxDiscount: string | null;
  usageType: string;
  usageLimit: number | null;
  usedCount: number;
  startAt: string | null;
  endAt: string | null;
  active: boolean;
};

const toInputDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

function CouponDialog({
  initial,
  trigger,
}: {
  initial?: CouponRow;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<CouponFormData>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: initial
      ? {
          code: initial.code,
          name: initial.name ?? "",
          type: initial.type as CouponFormData["type"],
          value: initial.value,
          minAmount: initial.minAmount ?? "",
          maxDiscount: initial.maxDiscount ?? "",
          usageType: initial.usageType as CouponFormData["usageType"],
          usageLimit: initial.usageLimit != null ? String(initial.usageLimit) : "",
          startAt: toInputDate(initial.startAt),
          endAt: toInputDate(initial.endAt),
          status: initial.active,
        }
      : {
          code: "",
          name: "",
          type: "flat",
          value: "",
          minAmount: "",
          maxDiscount: "",
          usageType: "single",
          usageLimit: "",
          startAt: "",
          endAt: "",
          status: true,
        },
  });
  const { pending, submit } = useCrudSubmit({
    action: (values: CouponFormData) =>
      initial ? updateCoupon(initial.id, values) : createCoupon(values),
    form,
    close: () => setOpen(false),
  });
  const type = form.watch("type");

  return (
    <CrudDialog
      trigger={trigger}
      title={initial ? `Edit ${initial.code}` : "New coupon"}
      description="Flat or percentage discounts with validity windows and redemption caps."
      open={open}
      setOpen={setOpen}
      wide
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input placeholder="DIWALI500" className="uppercase" {...field} />
                  </FormControl>
                  <FormDescription>Stored uppercase; unique per organization.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal name (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Diwali campaign" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="flat">Flat amount (₹)</SelectItem>
                      <SelectItem value="percent">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{type === "percent" ? "Percent off" : "Amount off (₹)"}</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" placeholder={type === "percent" ? "10" : "500"} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="minAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Min order (₹, optional)</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" placeholder="1000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxDiscount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max discount (₹, optional)</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" placeholder="2000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="usageType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usage</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="single">Single use per lead</SelectItem>
                      <SelectItem value="multiple">Reusable</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="usageLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total redemptions (optional)</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" placeholder="100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valid from (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valid until (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <SwitchFormField form={form} name="status" label="Coupon is active" />
          <SubmitButton pending={pending}>
            {initial ? "Save changes" : "Create coupon"}
          </SubmitButton>
        </form>
      </Form>
    </CrudDialog>
  );
}

export function CouponsTable({ rows }: { rows: CouponRow[] }) {
  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString() : "—";
  return (
    <>
      <div className="flex justify-end">
        <CouponDialog
          trigger={
            <Button>
              <Plus /> New coupon
            </Button>
          }
        />
      </div>
      <div className="mt-4 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Min order</TableHead>
              <TableHead>Redemptions</TableHead>
              <TableHead>Validity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={7} message="No coupons yet. Create one to offer discounts on applications." />
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Ticket className="size-4 text-muted-foreground" />
                      <span className="font-mono font-medium">{row.code}</span>
                    </div>
                    {row.name ? (
                      <div className="text-xs text-muted-foreground">{row.name}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {row.type === "percent" ? `${row.value}%` : `₹ ${row.value}`}
                    {row.maxDiscount ? (
                      <span className="text-xs text-muted-foreground">
                        {" "}(cap ₹ {row.maxDiscount})
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>{row.minAmount ? `₹ ${row.minAmount}` : "—"}</TableCell>
                  <TableCell>
                    {row.usedCount}
                    {row.usageLimit != null ? ` / ${row.usageLimit}` : ""}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {fmt(row.startAt)} → {fmt(row.endAt)}
                  </TableCell>
                  <TableCell>
                    {row.active ? (
                      <Badge>active</Badge>
                    ) : (
                      <Badge variant="secondary">inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <CouponDialog
                        initial={row}
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Pencil className="size-4" />
                          </Button>
                        }
                      />
                      <ConfirmDialog
                        title="Delete coupon?"
                        description={`Code ${row.code} will stop working immediately.`}
                        action={() => deleteCoupon(row.id)}
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
