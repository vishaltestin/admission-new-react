"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createLead, updateLead } from "@/lib/actions/lead-actions";
import { leadFormSchema, type LeadFormData } from "@/lib/validations/lead";
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
import { Textarea } from "@/components/ui/textarea";

export type SelectOption = { id: number; name: string };
export type StatusOption = SelectOption & { subStatuses: SelectOption[] };
export type InstituteOption = SelectOption & { programs: SelectOption[] };

export type LeadFormOptionsData = {
  statuses: StatusOption[];
  sources: SelectOption[];
  types: SelectOption[];
  institutes: InstituteOption[];
  users: SelectOption[];
  campaigns: SelectOption[];
};

export const emptyLeadFormValues: LeadFormData = {
  name: "",
  mobile: "",
  alternateMobile: "",
  email: "",
  city: "",
  state: "",
  country: "",
  instituteId: "",
  programmeId: "",
  leadSourceId: "",
  typeId: "",
  leadStatusId: "",
  leadSubStatusId: "",
  campaignId: "",
  leadAssignTo: "",
  nextFollowupAt: "",
  note: "",
};

export function LeadForm({
  options,
  initialValues,
  leadId,
}: {
  options: LeadFormOptionsData;
  initialValues?: LeadFormData;
  leadId?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: initialValues ?? emptyLeadFormValues,
  });

  const watchStatus = form.watch("leadStatusId");
  const watchInstitute = form.watch("instituteId");

  const subStatusOptions = useMemo(() => {
    const status = options.statuses.find((s) => String(s.id) === watchStatus);
    return status?.subStatuses ?? [];
  }, [options.statuses, watchStatus]);

  const programOptions = useMemo(() => {
    const institute = options.institutes.find(
      (i) => String(i.id) === watchInstitute,
    );
    return institute?.programs ?? [];
  }, [options.institutes, watchInstitute]);

  function onSubmit(values: LeadFormData) {
    startTransition(async () => {
      const result = leadId
        ? await updateLead(leadId, values)
        : await createLead(values);

      if (!result.success) {
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (messages?.[0]) {
              form.setError(field as keyof LeadFormData, {
                message: messages[0],
              });
            }
          }
        }
        toast.error(result.message ?? "Please fix the errors and try again");
        return;
      }

      toast.success(result.message ?? "Saved");
      const created = (result.data as { id: number } | undefined)?.id;
      const targetId = leadId ?? created;
      router.push(targetId ? `/leads/${targetId}` : "/leads");
      router.refresh();
    });
  }

  const submitLabel = leadId ? "Save changes" : "Create lead";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact details</CardTitle>
            <CardDescription>
              Basic information about the lead. Mobile number is required.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input placeholder="Rahul Sharma" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="rahul@example.com"
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
              name="mobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Mobile <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="9876543210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="alternateMobile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alternate mobile</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-3 sm:col-span-2">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Delhi" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="Delhi" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="India" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Classification</CardTitle>
            <CardDescription>
              Where the lead came from and how it should be tracked.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              control={form.control}
              name="leadSourceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {options.sources.map((option) => (
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
              name="typeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {options.types.map((option) => (
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
              name="campaignId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select campaign" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {options.campaigns.map((option) => (
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
              name="instituteId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institute</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue("programmeId", "");
                    }}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select institute" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {options.institutes.map((option) => (
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
              name="programmeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Program</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            watchInstitute ? "Select program" : "Select institute first"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {programOptions.map((option) => (
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tracking &amp; assignment</CardTitle>
            <CardDescription>
              Pipeline status, ownership and the next follow-up.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              control={form.control}
              name="leadStatusId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue("leadSubStatusId", "");
                    }}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {options.statuses.map((option) => (
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
              name="leadSubStatusId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sub-status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            watchStatus ? "Select sub-status" : "Select status first"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {subStatusOptions.map((option) => (
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
              name="leadAssignTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned to</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {options.users.map((option) => (
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
              name="nextFollowupAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Next follow-up</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormDescription>
                    You&apos;ll see this lead on the dashboard when it&apos;s due.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {!leadId ? (
          <Card>
            <CardHeader>
              <CardTitle>First note</CardTitle>
              <CardDescription>
                Optionally record the first interaction with this lead.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Called the lead, asked for course details…"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
