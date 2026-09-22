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

import {
  chatStream,
  getSuggestions,
  listDocuments,
  type ChatResponse,
  type ChatSource,
  type Document as DocType,
} from "@/lib/api";

const PdfViewer = dynamic(() => import("@/components/pdf-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center p-8 text-sm text-muted">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading PDF…
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

function CitationChip({
  page,
  onClick,
}: {
  page: number;
  onClick: () => void;
}) {
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

const DEFAULT_SUGGESTIONS = [
  "What is the main topic of this document?",
  "Summarize the key points.",
];

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
  const [suggestions, setSuggestions] =
    useState<string[]>(DEFAULT_SUGGESTIONS);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const docPickerRef = useRef<HTMLDivElement>(null);

  const selectedDoc = docs.find((d) => d.doc_id === docId);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    listDocuments()
      .then(setDocs)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (urlDocId && urlDocId !== docId) setDocId(urlDocId);
  }, [urlDocId]);

  useEffect(() => {
    if (selectedDoc) setNumPages(selectedDoc.page_count);
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

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  // Close doc picker on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!docsOpen) return;
      if (
        docPickerRef.current &&
        !docPickerRef.current.contains(e.target as Node)
      ) {
        setDocsOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [docsOpen]);

  // Fetch suggestions when doc changes
  useEffect(() => {
    setSuggestions(DEFAULT_SUGGESTIONS);
    if (!docId) return;
    let cancelled = false;
    getSuggestions(docId).then((qs) => {
      if (!cancelled && qs.length > 0) setSuggestions(qs);
    });
    return () => {
      cancelled = true;
    };
  }, [docId]);

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
          content: "Pick a document first using the chip above.",
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

  const pdfUrl = docId ? `${apiBase()}/documents/${docId}/file` : null;

  const Composer = (
    <div className="rounded-[20px] border border-border bg-surface shadow-[0_2px_12px_rgba(0,0,0,0.04)] focus-within:border-accent/50 focus-within:shadow-[0_2px_16px_rgba(77,107,254,0.10)] transition-all">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={
          docId
            ? "Ask anything about this document…"
            : "Pick a document first…"
        }
        rows={1}
        className="w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] leading-relaxed text-text outline-none placeholder:text-muted/60"
      />
      <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
        <div className="px-1 text-[11px] text-muted/80">
          {docId ? "Scoped to current document" : "No document selected"}
        </div>
        <button
          type="button"
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white transition-opacity hover:opacity-90 disabled:opacity-30"
          aria-label="Send"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" strokeWidth={2.25} />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 h-screen overflow-hidden pb-16 md:pb-0">
      {/* CHAT */}
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-center border-b border-border px-4 md:pl-14">
          <div className="relative" ref={docPickerRef}>
            <button
              onClick={() => setDocsOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-text transition-colors hover:bg-bg"
            >
              <FileText className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
              <span className="max-w-[180px] truncate">
                {selectedDoc ? selectedDoc.filename : "Select document"}
              </span>
              {docId && numPages ? (
                <span className="text-muted">
                  · p.{currentPage}/{numPages}
                </span>
              ) : null}
              <ChevronDown className="h-3 w-3 text-muted" strokeWidth={2} />
            </button>

            {docsOpen && (
              <div className="absolute left-1/2 top-full z-30 mt-1.5 w-72 -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
                <div className="max-h-72 overflow-y-auto py-1">
                  {docs.length === 0 ? (
                    <div className="px-3 py-3 text-[13px] text-muted">
                      No documents yet. Upload one from Library.
                    </div>
                  ) : (
                    docs.map((d) => (
                      <button
                        key={d.doc_id}
                        onClick={() => pickDoc(d.doc_id)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-bg ${
                          d.doc_id === docId ? "bg-bg font-medium" : ""
                        }`}
                      >
                        <FileText
                          className="h-3.5 w-3.5 shrink-0 text-muted"
                          strokeWidth={1.75}
                        />
                        <span className="truncate">{d.filename}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {!hasMessages ? (
          <div className="flex flex-1 min-h-0 flex-col items-center justify-center px-6">
            <h1 className="mb-8 text-center text-[26px] font-semibold tracking-[-0.02em] text-text">
              {docId
                ? "What would you like to know?"
                : "How can I help you today?"}
            </h1>

            <div className="w-full max-w-2xl">{Composer}</div>

            {docId && (
              <div className="mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-border bg-surface px-3 py-1.5 text-[12.5px] text-muted transition-colors hover:bg-bg hover:text-text"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div
              className="flex-1 min-h-0 overflow-y-auto scrollbar-thin"
              ref={chatScrollRef}
            >
              <div className="mx-auto max-w-3xl space-y-6 px-5 py-6">
                {messages.map((m, i) => (
                  <div key={i}>
                    {m.role === "user" ? (
                      <div className="flex justify-end">
                        <div
                          className="max-w-[80%] rounded-[18px] rounded-br-[6px] px-4 py-2.5 text-[14.5px] leading-relaxed"
                          style={{
                            backgroundColor: "var(--color-user-bubble)",
                            color: "var(--color-user-bubble-text)",
                          }}
                        >
                          {m.content}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-[15px] leading-[1.7] [&_p]:my-3 [&_ul]:my-3 [&_ol]:my-3 [&_pre]:my-3">
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
                          {loading &&
                            i === messages.length - 1 &&
                            !m.content && (
                              <span className="inline-flex items-center gap-2 text-sm text-muted">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Thinking…
                              </span>
                            )}
                        </div>

                        {m.sources && m.sources.length > 0 && (
                          <div className="mt-4">
                            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                              Sources
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {m.sources.map((s, j) => (
                                <button
                                  key={j}
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleJumpToPage(s.page);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11.5px] text-muted transition-colors hover:bg-bg hover:text-text"
                                >
                                  <span className="font-mono text-[10px] text-text/70">
                                    [{j + 1}]
                                  </span>
                                  <span className="max-w-[140px] truncate text-text">
                                    {s.filename}
                                  </span>
                                  <span>p.{s.page}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="shrink-0 px-4 pb-4 pt-2">
              <div className="mx-auto max-w-3xl">{Composer}</div>
            </div>
          </>
        )}
      </div>

      {/* PDF (desktop) — only if a doc is picked */}
      <div className="hidden lg:flex flex-col bg-bg border-l border-border min-w-0 h-full min-h-0 overflow-hidden">
        {pdfUrl && isDesktop ? (
          <>
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                Source
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-muted">
                  Page {currentPage}
                  {numPages ? ` of ${numPages}` : ""}
                </span>
                {numPages && numPages > 1 && (
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() =>
                        setCurrentPage((p) => Math.max(1, p - 1))
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-text disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= numPages}
                      onClick={() =>
                        setCurrentPage((p) => Math.min(numPages, p + 1))
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-text disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ChevronRight className="h-4 w-4" />
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
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="max-w-xs text-center text-[13px] text-muted">
              Select a document to see its pages here.
            </p>
          </div>
        )}
      </div>

      {pdfUrl && (
        <button
          onClick={() => {
            if (pdfUrl) window.open(`${pdfUrl}#page=${currentPage}`, "_blank");
          }}
          className="lg:hidden fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-text px-4 py-2.5 text-[13px] font-medium text-bg shadow-lg"
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