# PDF extraction root-cause diagnosis

No application code, packages, UI, prompts, or architecture were changed during this investigation.

## A. Actual root cause

The current browser is iPad/WebKit (`AppleWebKit/605.1.15`). In this environment, `ReadableStream.prototype[Symbol.asyncIterator]` and `ReadableStream.prototype.values` are undefined.

`pdfjs-dist@6.2.108` implements `PDFPageProxy.getTextContent()` with:

```text
const readableStream = this.streamTextContent(params)
for await (const value of readableStream) { ... }
```

The PDF loads and the page is obtained, but `getTextContent()` fails when it tries to asynchronously iterate that stream. The reproduced original exception is:

```text
TypeError: undefined is not a function
(near '...value of readableStream...')
```

The same fresh text-based PDF succeeds in Chromium and fails in WebKit. This is therefore a browser compatibility defect in the current text-extraction call path, not a malformed-PDF finding.

## B. Exact file/function responsible

- `src/lib/pdf-text.ts`, `extractPdfText(file)`
  - Correctly receives the browser `File`.
  - Correctly converts it with `await file.arrayBuffer()` and `new Uint8Array(...)`.
  - Correctly loads the PDF and pages.
  - Fails at `await page.getTextContent()` on WebKit.
- The failing dependency implementation is in `pdfjs-dist/legacy/build/pdf.mjs`, inside `PDFPageProxy.getTextContent()`, at the `for await (const value of readableStream)` loop.

All extraction call sites use this same function:

1. `src/lib/session.tsx` — `setSyllabusFile`
2. `src/lib/session.tsx` — `addPyqFiles`
3. `src/lib/session.tsx` — syllabus re-extraction in `runAnalysis`
4. `src/lib/session.tsx` — missing-PYQ re-extraction in `runAnalysis`

There is no second PDF extraction implementation.

## C. Why the previous build claimed it was fixed

The prior verification was consistent with testing in Chromium, where the current implementation does work. I reproduced a successful fresh extraction there, including the expected text in `csa-text-v1`.

That verification did not establish compatibility with the user’s iPad/WebKit execution environment. The previous switch to the PDF.js “legacy” build does not fix this issue: version 6.2.108’s legacy build still uses async iteration over `ReadableStream` in `getTextContent()`.

Stale state could make an incomplete test misleading because extracted text is persisted, but stale data is not required to explain the contradiction. A clean Chromium extraction succeeds while a clean WebKit extraction fails. In the currently connected failed preview session, `sessionStorage` is empty, so its current Analysis failure is not being supported by stale extracted text.

## D. Why the current upload still fails

On selection, `upload.tsx` passes the real browser `File` to the session provider. `extractPdfText()` reaches PDF.js and loads the document, then WebKit throws at `page.getTextContent()`.

`src/lib/pdf-text.ts` catches that original `TypeError` and replaces it with:

```text
Couldn't read this PDF. Please try another PDF.
```

`src/lib/session.tsx` stores only that replacement message in `syllabusError`/`pyqError`, and `src/routes/upload.tsx` displays it. This is why the actionable underlying exception is invisible in the UI and console.

The named Macroeconomics files were not mounted in the workspace, so their exact bytes could not be inspected. However, a newly generated ordinary text PDF reproduced the same displayed failure in WebKit, proving that special content, size, or corruption is not necessary to trigger it.

## E. Whether PDF.js itself is working

Partially:

- Installed correctly: `pdfjs-dist@6.2.108`.
- Legacy module import succeeds.
- Worker module import succeeds.
- Worker URL resolves same-origin with HTTP 200.
- Module workers are supported in the tested WebKit environment.
- `getDocument()` succeeds.
- `getPage()` succeeds.
- Ordinary text extraction succeeds in Chromium.
- Text extraction fails specifically at `getTextContent()` in WebKit because the stream is not async-iterable there.

No worker CORS failure was observed. File conversion is correct. No file-size limit is implemented, but the reproduced 1 KB failure rules out file size as the root cause. MIME handling accepts an `application/pdf` or `.pdf` filename; it is not the cause in the reproduced case.

## F. Whether the problem is extraction, state, worker configuration, or UI

**Primary problem: extraction/browser compatibility.**

- **Worker configuration:** functioning in the reproduced environment.
- **File/Blob conversion:** functioning.
- **React state:** downstream of the failure; no successful `ExtractedDoc` exists to store.
- **sessionStorage:** runs only after React receives extracted text. It is not involved before extraction completes and is not causing this fresh failure.
- **UI:** accurately shows the generic error state, but the extractor has already discarded the original error. Separately, file metadata is set before extraction and the card labels the file `READY`; metadata is not treated as extracted text by `runAnalysis`, but that label can misrepresent extraction readiness.
- **Race conditions:** the code can duplicate extraction if navigation occurs while initial extraction is in flight, and concurrent PYQ batches share one status. Those are real secondary risks, but they do not explain this deterministic WebKit failure.

## G. Smallest reliable fix

Keep the installed PDF.js package, worker, upload flow, state model, and AI path. In `extractPdfText()`, avoid `page.getTextContent()` and consume `page.streamTextContent()` through its standard reader API:

```text
const reader = page.streamTextContent().getReader()
while (true) {
  const { value, done } = await reader.read()
  if (done) break
  collect value.items
}
```

`ReadableStream.getReader()` is available in the affected browser and does not depend on `Symbol.asyncIterator`. Also preserve/log the original extraction error during diagnosis rather than replacing every PDF.js failure with one generic message.

This is narrower and safer than replacing PDF.js, installing a polyfill, changing the worker, or altering session storage.

## H. Exact files/components that need changing

For the smallest fix:

- `src/lib/pdf-text.ts` only — replace the incompatible `getTextContent()` consumption path and retain useful underlying error context.

No change is required to `upload.tsx`, `session.tsx`, `analyzing.tsx`, the worker import, AI provider, prompts, or storage architecture to correct this root cause.

## I. How to verify the fix with fresh Psychology PDFs

1. Test in both iPad/WebKit and Chromium.
2. Clear `sessionStorage` first, ensuring neither `csa-session-v1` nor `csa-text-v1` can supply stale content.
3. Upload a fresh `Test_Syllabus_Psychology.pdf` and `Test_PYQs_Psychology_2022_2025.pdf` through the real file inputs.
4. Confirm both files reach `extractPdfText()` as browser `File` objects.
5. Confirm worker requests return 200 and extraction produces non-empty documents.
6. Inspect newly written `csa-text-v1` and verify its fresh text contains:
   - Introduction to Psychology
   - Learning and Memory
   - Motivation and Emotion
   - Social Psychology
   - classical conditioning
   - theories of emotion
   - conformity
7. Select 3 hours and Just Pass, then build the plan.
8. Confirm `runAnalysis()` sends those exact extracted strings to `analyzeUploads`, not file metadata or fixture data.
9. Confirm the resulting strategy is Psychology-based and contains no Economics fallback.
10. Repeat after clearing storage again to prove the result does not depend on persisted state.

The current “Analysis failed / No syllabus text is available” state is a downstream consequence of the upload extraction failure: because extraction never creates `syllabusText`, `runAnalysis()` retries the same incompatible path and then fails before making the AI request.
