import path from "path";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import mammoth from "mammoth";

export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".markdown", ".docx"];

export class UnsupportedFileError extends Error {}

// Everything stored or imported goes through this allow-list so a document can
// never carry scripts, event handlers or unexpected markup.
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "b", "em", "i", "u", "s", "h1", "h2", "h3",
    "ul", "ol", "li", "blockquote", "code", "pre", "hr", "a",
  ],
  allowedAttributes: { a: ["href", "title", "rel", "target"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
  },
};

export function sanitize(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function textToHtml(text: string): string {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return "<p></p>";
  return paragraphs.map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("");
}

export function markdownToHtml(markdown: string): string {
  return sanitize(marked.parse(markdown, { async: false }) as string);
}

export async function docxToHtml(buffer: Buffer): Promise<string> {
  const result = await mammoth.convertToHtml({ buffer });
  return sanitize(result.value);
}

export interface ImportedDocument {
  title: string;
  html: string;
}

export async function fileToDocument(filename: string, buffer: Buffer): Promise<ImportedDocument> {
  const ext = path.extname(filename).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new UnsupportedFileError(
      `Unsupported file type "${ext || "unknown"}". Supported: .txt, .md, .docx`,
    );
  }
  const title = path.basename(filename, path.extname(filename)).trim().slice(0, 200) || "Imported document";

  let html: string;
  if (ext === ".txt") html = textToHtml(buffer.toString("utf8"));
  else if (ext === ".docx") html = await docxToHtml(buffer);
  else html = markdownToHtml(buffer.toString("utf8"));

  return { title, html: html || "<p></p>" };
}
