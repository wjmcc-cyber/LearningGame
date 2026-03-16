import { getCloudflareEnv } from "@/lib/cloudflare";
import { normalizeWhitespace, sha256Hex } from "@/lib/utils";

const SUPPORTED_EXTENSIONS = new Set(["txt", "md", "pdf"]);

function getExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

async function getLocalStorageDir() {
  const path = await import("path");

  if (process.env.STORAGE_ROOT) {
    return path.join(process.env.STORAGE_ROOT, "documents");
  }

  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    return path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "storage", "documents");
  }

  return path.join(process.cwd(), "storage", "documents");
}

async function extractText(buffer: Buffer, extension: string) {
  if (extension === "txt" || extension === "md") {
    return normalizeWhitespace(buffer.toString("utf8"));
  }

  if (extension === "pdf") {
    const cloudflareEnv = await getCloudflareEnv();

    if (cloudflareEnv?.STUDY_DOCUMENTS_BUCKET) {
      throw new Error("PDF uploads are not stable in the Cloudflare runtime yet. Use TXT or MD for now.");
    }

    const path = await import("path");
    const { pathToFileURL } = await import("url");
    const { PDFParse } = await import("pdf-parse");

    const pdfWorkerPath = pathToFileURL(
      path.join(process.cwd(), "node_modules", "pdf-parse", "dist", "pdf-parse", "cjs", "pdf.worker.mjs"),
    ).href;

    PDFParse.setWorker(pdfWorkerPath);
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
  const storedName = `${contentHash}.${extension}`;
  const cloudflareEnv = await getCloudflareEnv();

  if (cloudflareEnv?.STUDY_DOCUMENTS_BUCKET) {
    await cloudflareEnv.STUDY_DOCUMENTS_BUCKET.put(storedName, buffer, {
      httpMetadata: {
        contentType: extension === "md" ? "text/markdown" : extension === "txt" ? "text/plain" : "application/pdf",
      },
    });

    return storedName;
  }

  const storageDir = await getLocalStorageDir();
  const fs = await import("fs/promises");
  const path = await import("path");
  const filePath = path.join(storageDir, storedName);

  await fs.mkdir(storageDir, { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, buffer);
  }

  return storedName;
}

export async function deleteStudyDocument(storedName: string) {
  const cloudflareEnv = await getCloudflareEnv();

  if (cloudflareEnv?.STUDY_DOCUMENTS_BUCKET) {
    await cloudflareEnv.STUDY_DOCUMENTS_BUCKET.delete(storedName);
    return;
  }

  const storageDir = await getLocalStorageDir();
  const fs = await import("fs/promises");
  const path = await import("path");

  try {
    await fs.unlink(path.join(storageDir, storedName));
  } catch {
    // Ignore missing files for local MVP storage.
  }
}
