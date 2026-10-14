import { NextRequest, NextResponse } from "next/server";

import { ingestWebFormSubmission } from "@/lib/webform-ingest";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function respond(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * Cross-origin friendly endpoint so webforms can be embedded on external
 * websites with a plain fetch/HTML form post. Field keys are `f_{attributeId}`
 * and are also accepted by attribute-label aliases for simple HTML forms.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ formId: string }> },
) {
  const { formId } = await context.params;

  let raw: unknown;
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const data = await request.formData();
      raw = Object.fromEntries(data.entries());
    } else {
      raw = await request.json();
    }
  } catch {
    return respond({ ok: false, error: "body must be JSON or form-encoded" }, 400);
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return respond({ ok: false, error: "invalid payload" }, 400);
  }

  const result = await ingestWebFormSubmission(formId, raw as Record<string, unknown>);
  return respond(result, result.ok ? 200 : 422);
}
