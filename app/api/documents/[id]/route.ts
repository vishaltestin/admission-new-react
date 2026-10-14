/**
 * Auth-guarded document downloads. Admins view a document linked to one of
 * their org's application responses.
 */
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { readStoredDocument } from "@/lib/documents";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const docId = Number(id);
  if (!Number.isInteger(docId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const scope =
    session.user.organizationId != null
      ? { organizationId: session.user.organizationId }
      : {};
  const doc = await prisma.applicationDocument.findFirst({
    where: { id: docId, ...scope },
  });
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const data = await readStoredDocument(doc.storedName);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": doc.mimeType ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${doc.originalName.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing on disk" }, { status: 410 });
  }
}
