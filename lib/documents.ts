/**
 * Application-document storage. Files land on the server filesystem under
 * `<project>/uploads/application-documents/` and are served back through
 * /api/documents/[id] (auth-guarded). Swap these two functions for an S3
 * adapter if you move to object storage.
 */
import { randomBytes } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

export const UPLOAD_DIR = path.join(
  process.cwd(),
  "uploads",
  "application-documents",
);

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
export const MAX_DOC_BYTES = 5 * 1024 * 1024;

export function sanitizeUpload(file: File):
  | { ok: true }
  | { ok: false; error: string } {
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, error: "Only JPG/PNG/WebP images or PDFs are allowed" };
  }
  if (file.size > MAX_DOC_BYTES) {
    return { ok: false, error: "Files must be under 5 MB" };
  }
  return { ok: true };
}

/** Persist the bytes and return the stored (unique) file name. */
export async function storeDocument(responseId: number, file: File): Promise<string> {
  const ext = path.extname(file.name).replace(/[^a-zA-Z0-9.]/g, "").slice(0, 10) || ".bin";
  const storedName = `${responseId}-${randomBytes(8).toString("hex")}${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, storedName), buffer);
  return storedName;
}

export async function readStoredDocument(storedName: string): Promise<Buffer> {
  return readFile(path.join(UPLOAD_DIR, path.basename(storedName)));
}

export async function deleteStoredDocument(storedName: string): Promise<void> {
  await unlink(path.join(UPLOAD_DIR, path.basename(storedName))).catch(() => {});
}
