"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Send,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
  ChevronDown,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import {
  chatStream,
  listDocuments,
  type ChatResponse,
  type ChatSource,
  type Document as DocType,
} from "@/lib/api";

const PdfViewer = dynamic(() => import("@/components/pdf-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center p-8 text-sm text-muted">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading PDF Viewer…
    </div>
  ),
});

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: ChatResponse["sources"];
};

function apiBase(): string {
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:8000`;
  }
  return "http://127.0.0.1:8000";
}

function CitationChip({ page, onClick }: { page: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex items-center rounded bg-accent/10 text-accent hover:bg-accent/20 px-1.5 py-0.5 text-[11px] font-mono mx-0.5 align-baseline transition-colors cursor-pointer"
    >
      p.{page}
    </button>
  );
}

function preprocessCitations(text: string): string {
  if (!text) return "";
  return text
    .replace(/\[p\.\s*(\d+)\]/gi, "[p.$1](#citation-$1)")
    .replace(/\(p\.\s*(\d+)\)/gi, "[p.$1](#citation-$1)");
}

function ChatPageInner() {
  const searchParams = useSearchParams();
  const urlDocId = searchParams.get("doc_id") || undefined;
  const [isDesktop, setIsDesktop] = useState(false);

  const [docId, setDocId] = useState<string | undefined>(urlDocId);
  const [docs, setDocs] = useState<DocType[]>([]);
  const [docsOpen, setDocsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const selectedDoc = docs.find((d) => d.doc_id === docId);

  useEffect(() => {
    listDocuments()
      .then(setDocs)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (urlDocId && urlDocId !== docId) setDocId(urlDocId);
  }, [urlDocId]);

  useEffect(() => {
    if (selectedDoc) {
      setNumPages(selectedDoc.page_count);
    }
  }, [selectedDoc]);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const c = chatScrollRef.current;
    if (c) c.scrollTop = c.scrollHeight;
  }, [messages]);

  function pickDoc(id: string | undefined) {
    setDocId(id);
    setCurrentPage(1);
    setNumPages(null);
    setMessages([]);
    setDocsOpen(false);
    if (typeof window !== "undefined") {
      const url = id ? `/chat?doc_id=${id}` : "/chat";
      window.history.replaceState(null, "", url);
    }
  }

  // Centralized: jump to a page. Desktop → scroll in-page viewer.
  // Mobile → open the PDF in a new browser tab (native viewer, full scroll/zoom).
  function handleJumpToPage(page: number) {
    setCurrentPage(page);
    if (typeof window === "undefined") return;
    if (window.innerWidth < 1024 && docId) {
      const url = `${apiBase()}/documents/${docId}/file#page=${page}`;
      window.open(url, "_blank");
    }
  }

  async function send(question: string) {
    if (!question.trim() || loading) return;
    if (!docId) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: question },
        {
          role: "assistant",
          content:
            "Please pick a document first. Tap the document name at the top of the chat.",
        },
      ]);
      setInput("");
      return;
    }

    setInput("");
    setLoading(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: "", sources: [] },
    ]);

    try {
      await chatStream(
        question,
        docId,
        (sources: ChatSource[]) => {
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
              updated[lastIdx] = { ...updated[lastIdx], sources };
            }
            return updated;
          });
        },
        (token: string) => {
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: updated[lastIdx].content + token,
              };
            }
            return updated;
          });
        },
        () => setLoading(false)
      );
    } catch (err: any) {
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: `Error: ${err?.message || "Something went wrong."}`,
          };
        }
        return updated;
      });
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      send(input);
    }
  }

  const suggestions = [
    "What is the main topic of this document?",
    "Summarize the key points.",
    "What are the most important tags?",
    "Give me an example from the document.",
  ];

  const pdfUrl = docId ? `${apiBase()}/documents/${docId}/file` : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 h-screen overflow-hidden pb-16 md:pb-0">
      {/* LEFT: chat */}
      <div className="flex flex-col border-r border-border min-w-0 h-full min-h-0 overflow-hidden">
        {/* Header with doc selector */}
        <div className="px-4 md:px-6 py-3 border-b border-border shrink-0">
          <div className="relative">
            <button
              onClick={() => setDocsOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-bg transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-muted shrink-0" />
                <span className="truncate text-text">
                  {selectedDoc ? selectedDoc.filename : "Select a document"}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted shrink-0" />
            </button>

            {docsOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 rounded-md border border-border bg-surface shadow-md max-h-64 overflow-y-auto">
                {docs.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-muted">
                    No documents. Upload one from Library.
                  </div>
                ) : (
                  docs.map((d) => (
                    <button
                      key={d.doc_id}
                      onClick={() => pickDoc(d.doc_id)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-bg transition-colors flex items-center gap-2 ${
                        d.doc_id === docId ? "bg-bg font-medium" : ""
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5 text-muted shrink-0" />
                      <span className="truncate">{d.filename}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {docId && (
            <p className="text-[11px] text-muted mt-2">
              Page {currentPage}
              {numPages ? ` of ${numPages}` : ""}
            </p>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto" ref={chatScrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6">
              <p className="text-sm text-muted mb-6 text-center">
                {docId
                  ? "Ask anything about this document."
                  : "Pick a document to get started."}
              </p>
              {docId && (
                <div className="flex flex-col gap-2 w-full max-w-md">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left text-sm px-3 py-2 rounded-md border border-border bg-surface hover:bg-bg transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 md:p-6 space-y-6">
              {messages.map((m, i) => (
                <div key={i}>
                  {m.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-md bg-surface border border-border px-4 py-2 text-sm">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-none">
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2">
                        <ReactMarkdown
                          components={{
                            a: ({ href, children }) => {
                              if (href?.startsWith("#citation-")) {
                                const page = parseInt(
                                  href.replace("#citation-", ""),
                                  10
                                );
                                if (!isNaN(page)) {
                                  return (
                                    <CitationChip
                                      page={page}
                                      onClick={() => handleJumpToPage(page)}
                                    />
                                  );
                                }
                              }
                              return (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {children}
                                </a>
                              );
                            },
                          }}
                        >
                          {preprocessCitations(m.content)}
                        </ReactMarkdown>
                      </div>
                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
                            Sources
                          </p>
                          <div className="space-y-1">
                            {m.sources.map((s, j) => (
                              <button
                                key={j}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleJumpToPage(s.page);
                                }}
                                className="w-full text-left text-xs text-muted flex items-baseline gap-2 hover:text-text transition-colors cursor-pointer"
                              >
                                <span className="font-mono text-text">
                                  [{j + 1}]
                                </span>
                                <span className="text-text">{s.filename}</span>
                                <span>· p.{s.page}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking…
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border p-3 md:p-4 shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask a question… (⌘/Ctrl+Enter to send)"
              rows={2}
              className="flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <Button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              size="icon"
              className="h-9 w-9 shrink-0"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* RIGHT: PDF viewer (desktop only) */}
      <div className="hidden lg:flex flex-col bg-bg border-l border-border min-w-0 h-full min-h-0 overflow-hidden">
        {pdfUrl && isDesktop ? (
          <>
            <div className="px-6 py-4 border-b border-border shrink-0 flex items-center justify-between">
              <span className="text-xs font-medium text-muted uppercase tracking-wide">
                Source
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted">
                  Page {currentPage}
                  {numPages ? ` of ${numPages}` : ""}
                </span>
                {numPages && numPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-1 rounded hover:bg-surface disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 text-muted" />
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= numPages}
                      onClick={() =>
                        setCurrentPage((p) => Math.min(numPages, p + 1))
                      }
                      className="p-1 rounded hover:bg-surface disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="h-3.5 w-3.5 text-muted" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <PdfViewer
              url={pdfUrl}
              page={currentPage}
              onLoadSuccess={(n) => setNumPages(n)}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-sm text-muted text-center max-w-xs">
              Pick a document on the left to view its pages here.
            </p>
          </div>
        )}
      </div>

      {/* MOBILE: floating View PDF button → opens native tab */}
      {pdfUrl && (
        <button
          onClick={() => {
            if (pdfUrl)
              window.open(`${pdfUrl}#page=${currentPage}`, "_blank");
          }}
          className="lg:hidden fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-text text-bg px-4 py-3 text-sm font-medium shadow-lg"
        >
          <FileText className="h-4 w-4" />
          View PDF
        </button>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-sm text-muted">Loading…</div>}
    >
      <ChatPageInner />
    </Suspense>
  );
}