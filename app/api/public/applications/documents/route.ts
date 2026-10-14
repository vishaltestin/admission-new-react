/**
 * Public application-document uploads. The applicant posts with their
 * sessionId (issued when they started the application) — that token is the
 * only auth. Form fields: sessionId, documentType, file.
 */
import { NextRequest, NextResponse } from "next/server";

import { sanitizeUpload, storeDocument } from "@/lib/documents";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const sessionId = String(formData.get("sessionId") ?? "");
  const documentType = String(formData.get("documentType") ?? "").trim();
  const file = formData.get("file");

  if (!sessionId || !documentType) {
    return NextResponse.json({ error: "sessionId and documentType are required" }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Please choose a file" }, { status: 400 });
  }

  const response = await prisma.applicationFormResponse.findFirst({
    where: { sessionId },
    select: { id: true, organizationId: true, leadId: true },
  });
  if (!response) {
    return NextResponse.json({ error: "Unknown session" }, { status: 403 });
  }
  if (response.leadId === 0) {
    return NextResponse.json(
      { error: "Submit your application first, then upload documents" },
      { status: 409 },
    );
  }

  const check = sanitizeUpload(file);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 422 });
  }

  try {
    const storedName = await storeDocument(response.id, file);
    const doc = await prisma.applicationDocument.create({
      data: {
        organizationId: response.organizationId,
        responseId: response.id,
        documentType,
        originalName: file.name.slice(0, 191),
        storedName,
        mimeType: file.type,
        sizeBytes: file.size,
      },
    });
    return NextResponse.json(
      {
        id: doc.id,
        documentType: doc.documentType,
        originalName: doc.originalName,
        sizeBytes: doc.sizeBytes,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("document upload failed", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

/** Remove an uploaded document (applicant-side, session-token authorized). */
export async function DELETE(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId") ?? "";
  const docId = Number(req.nextUrl.searchParams.get("id") ?? 0);
  if (!sessionId || !Number.isInteger(docId) || docId <= 0) {
    return NextResponse.json({ error: "sessionId and id are required" }, { status: 400 });
  }
  const response = await prisma.applicationFormResponse.findFirst({
    where: { sessionId },
    select: { id: true },
  });
  if (!response) {
    return NextResponse.json({ error: "Unknown session" }, { status: 403 });
  }
  const doc = await prisma.applicationDocument.findFirst({
    where: { id: docId, responseId: response.id },
  });
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { deleteStoredDocument } = await import("@/lib/documents");
  await prisma.applicationDocument.delete({ where: { id: doc.id } });
  await deleteStoredDocument(doc.storedName);
  return NextResponse.json({ ok: true });
}
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId") ?? "";
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }
  const response = await prisma.applicationFormResponse.findFirst({
    where: { sessionId },
    select: { id: true },
  });
  if (!response) {
    return NextResponse.json({ error: "Unknown session" }, { status: 403 });
  }
  const docs = await prisma.applicationDocument.findMany({
    where: { responseId: response.id },
    select: { id: true, documentType: true, originalName: true, sizeBytes: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ documents: docs });
}
