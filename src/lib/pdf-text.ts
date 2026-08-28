/**
 * Client-side PDF text extraction using pdf.js.
 *
 * Runs entirely in the browser — no backend and no third-party service.
 * Only extracts raw text; no analysis of any kind happens here.
 */

export type ExtractionStatus = "idle" | "extracting" | "done" | "error";

export type ExtractedDoc = {
  /** File name the text came from. */
  name: string;
  /** Raw extracted text (page contents joined by blank lines). */
  text: string;
  pageCount: number;
  charCount: number;
};

const isPdf = (file: File) =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

/**
 * Extract text from a single PDF File. Throws for non-PDF input so callers can
 * surface a clear limitation message (images require OCR, which is out of scope).
 */
export async function extractPdfText(file: File): Promise<ExtractedDoc> {
  if (!isPdf(file)) {
    throw new Error("Text extraction is only supported for PDF files.");
  }

  // Dynamic import keeps pdf.js out of the SSR bundle.
  // The legacy build is used because it is transpiled for broader browser
  // support (the modern build relies on very recent JS features and throws
  // "undefined is not a function" in Safari/older engines).
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const workerUrl = (await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;

  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/[ \t]+/g, " ")
      .trim();
    pages.push(text);
  }

  const text = pages.join("\n\n").trim();
  return { name: file.name, text, pageCount: doc.numPages, charCount: text.length };
}
