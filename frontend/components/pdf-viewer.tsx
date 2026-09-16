"use client";

import { Document, Page, pdfjs } from "react-pdf";
import { Loader2 } from "lucide-react";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PdfViewerProps {
  url: string;
  page: number;
  onLoadSuccess?: (numPages: number) => void;
}

export default function PdfViewer({ url, page, onLoadSuccess }: PdfViewerProps) {
  function handleDocumentLoadSuccess({ numPages }: { numPages: number }) {
    if (onLoadSuccess) {
      onLoadSuccess(numPages);
    }
  }

  return (
    <div className="flex-1 overflow-auto p-4 flex justify-center items-start bg-zinc-100 dark:bg-zinc-900 w-full h-full">
      <Document
        file={url}
        onLoadSuccess={handleDocumentLoadSuccess}
        loading={
          <div className="flex items-center gap-2 p-8 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading PDF…
          </div>
        }
        error={
          <div className="p-8 text-sm text-red-500">
            Failed to load PDF document.
          </div>
        }
      >
        <Page
          key={`page_${page}`}
          pageNumber={page}
          width={560}
          className="shadow-md rounded bg-white"
          renderTextLayer={true}
          renderAnnotationLayer={true}
        />
      </Document>
    </div>
  );
}
