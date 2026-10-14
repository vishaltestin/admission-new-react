import { NextResponse } from "next/server";

import { auth } from "@/auth";

/**
 * GET /leads/import/sample — a starter CSV for the lead import.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const csv = [
    "name,mobile,alternate_mobile,email,city,state,country,source,status,type,note",
    "Rohan Mehra,9876543210,,rohan@example.com,Delhi,Delhi,India,Website,New,Hot,Asked for MBA fee details",
    "Sana Qureshi,9876543211,,sana@example.com,Noida,Uttar Pradesh,India,Facebook Ads,Follow Up,Warm,Callback required tomorrow",
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="lead-import-sample.csv"',
    },
  });
}
