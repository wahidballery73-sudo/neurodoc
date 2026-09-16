"use client";

import { Document, Page, pdfjs } from "react-pdf";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PdfViewerProps {
  url: string;
  page: number;
  onLoadSuccess?: (numPages: number) => void;
}

export default function PdfViewer({ url, page, onLoadSuccess }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  function handleDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    onLoadSuccess?.(numPages);
  }

  useEffect(() => {
    if (!page) return;
    const el = pageRefs.current.get(page);
    const container = containerRef.current;
    if (el && container) {
      const top = el.offsetTop - 16;
      container.scrollTo({ top, behavior: "smooth" });
    }
  }, [page, numPages]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto p-4 bg-zinc-100 dark:bg-zinc-900 w-full h-full"
    >
      <Document
        file={url}
        onLoadSuccess={handleDocumentLoadSuccess}
        loading={
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading PDF…
          </div>
        }
        error={
          <div className="p-8 text-sm text-red-500 text-center">
            Failed to load PDF document.
          </div>
        }
      >
        {Array.from({ length: numPages }, (_, i) => {
          const pageNum = i + 1;
          return (
            <div
              key={pageNum}
              ref={(el) => {
                if (el) pageRefs.current.set(pageNum, el);
                else pageRefs.current.delete(pageNum);
              }}
              className="flex justify-center mb-4"
            >
              <Page
                pageNumber={pageNum}
                width={560}
                className="shadow-md rounded bg-white"
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </div>
          );
        })}
      </Document>
    </div>
  );
}