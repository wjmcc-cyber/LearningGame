import { access, mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import { PDFParse } from "pdf-parse";
import { normalizeWhitespace, sha256Hex } from "@/lib/utils";

const SUPPORTED_EXTENSIONS = new Set(["txt", "md", "pdf"]);
const STORAGE_DIR = process.env.STORAGE_ROOT
  ? path.join(process.env.STORAGE_ROOT, "documents")
  : process.env.RAILWAY_VOLUME_MOUNT_PATH
    ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "storage", "documents")
    : path.join(process.cwd(), "storage", "documents");
const PDF_WORKER_PATH = pathToFileURL(
  path.join(process.cwd(), "node_modules", "pdf-parse", "dist", "pdf-parse", "cjs", "pdf.worker.mjs"),
).href;

function getExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

async function extractText(buffer: Buffer, extension: string) {
  if (extension === "txt" || extension === "md") {
    return normalizeWhitespace(buffer.toString("utf8"));
  }

  if (extension === "pdf") {
    PDFParse.setWorker(PDF_WORKER_PATH);
    const parser = new PDFParse({ data: buffer });

    try {
      const parsed = await parser.getText();
      return normalizeWhitespace(parsed.text);
    } catch {
      throw new Error("PDF uploads are not stable in this environment yet. Use TXT or MD for now.");
    } finally {
      await parser.destroy();
    }
  }

  throw new Error("Unsupported document type.");
}

export async function parseStudyDocument(file: File) {
  if (!file.name || file.size === 0) {
    throw new Error("Choose a non-empty file.");
  }

  const extension = getExtension(file.name);

  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error("Only PDF, TXT, and MD files are supported.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const textContent = await extractText(buffer, extension);

  if (!textContent) {
    throw new Error("This document does not contain extractable text.");
  }

  return {
    buffer,
    contentHash: sha256Hex(buffer),
    extension,
    mimeType: file.type || "application/octet-stream",
    originalName: file.name,
    sizeBytes: file.size,
    textContent,
  };
}

export async function saveStudyDocument(buffer: Buffer, contentHash: string, extension: string) {
  await mkdir(STORAGE_DIR, { recursive: true });
  const storedName = `${contentHash}.${extension}`;
  const filePath = path.join(STORAGE_DIR, storedName);

  try {
    await access(filePath);
  } catch {
    await writeFile(filePath, buffer);
  }

  return storedName;
}

export async function deleteStudyDocument(storedName: string) {
  try {
    await unlink(path.join(STORAGE_DIR, storedName));
  } catch {
    // Ignore missing files for local MVP storage.
  }
}
