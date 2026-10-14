export type TemplateContext = Record<string, string | null | undefined>;

/**
 * Replaces {{variable}} placeholders with values from the context.
 * Unknown variables are left untouched so messages can be reviewed.
 */
export function renderTemplate(text: string, context: TemplateContext): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    const value = context[key];
    return value != null && value !== "" ? value : match;
  });
}

export function leadTemplateContext(lead: {
  name: string | null;
  mobile: string;
  email: string | null;
  city?: string | null;
  state?: string | null;
  status?: { name: string } | null;
  assignee?: { firstName: string | null; lastName: string | null } | null;
  institute?: { name: string } | null;
  programme?: { name: string } | null;
}): TemplateContext {
  return {
    lead_name: lead.name,
    lead_mobile: lead.mobile,
    lead_email: lead.email,
    status: lead.status?.name ?? null,
    counselor_name: lead.assignee
      ? [lead.assignee.firstName, lead.assignee.lastName]
          .filter(Boolean)
          .join(" ")
      : null,
    institute: lead.institute?.name ?? null,
    program: lead.programme?.name ?? null,
    city: lead.city ?? null,
    state: lead.state ?? null,
  };
}
