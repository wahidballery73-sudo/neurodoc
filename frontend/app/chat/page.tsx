"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Send, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { chat, type ChatResponse } from "@/lib/api";

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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
  // Replaces [p.1], [p. 1], (p.1), (p. 1) with markdown links [p.1](#citation-1)
  return text
    .replace(/\[p\.\s*(\d+)\]/gi, "[p.$1](#citation-$1)")
    .replace(/\(p\.\s*(\d+)\)/gi, "[p.$1](#citation-$1)");
}

function ChatPageInner() {
  const searchParams = useSearchParams();
  const docId = searchParams.get("doc_id") || undefined;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("[ChatPage] docId from searchParams:", docId);
  }, [docId]);

  useEffect(() => {
    console.log("[ChatPage] currentPage updated to:", currentPage);
  }, [currentPage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(question: string) {
    if (!question.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await chat(question, docId);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: res.answer, sources: res.sources },
      ]);
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Error: ${err?.message || "Something went wrong."}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      send(input);
    }
  }

  function jumpToPage(page: number) {
    console.log("[ChatPage] jumpToPage requested page:", page);
    setCurrentPage(page);
  }

  const suggestions = [
    "What is the main topic of this document?",
    "Summarize the key points.",
    "What are the most important tags?",
    "Give me an example from the document.",
  ];

  const pdfUrl = docId ? `${API_URL}/documents/${docId}/file` : null;

  return (
    <div className="grid grid-cols-2 h-screen">
      {/* LEFT: chat */}
      <div className="flex flex-col border-r border-border min-w-0 h-screen">
        <div className="px-6 py-4 border-b border-border shrink-0">
          <h1 className="text-sm font-semibold">Chat</h1>
          {docId && (
            <p className="text-xs text-muted mt-0.5">
              Scoped to document <span className="font-mono">{docId.slice(0, 8)}…</span> · page {currentPage}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8">
              <p className="text-sm text-muted mb-6">
                Ask anything about your documents.
              </p>
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
            </div>
          ) : (
            <div className="p-6 space-y-6">
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
                                const pageStr = href.replace("#citation-", "");
                                const page = parseInt(pageStr, 10);
                                if (!isNaN(page)) {
                                  return (
                                    <CitationChip
                                      page={page}
                                      onClick={() => jumpToPage(page)}
                                    />
                                  );
                                }
                              }
                              return (
                                <a href={href} target="_blank" rel="noopener noreferrer">
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
                                  jumpToPage(s.page);
                                }}
                                className="w-full text-left text-xs text-muted flex items-baseline gap-2 hover:text-text transition-colors cursor-pointer"
                              >
                                <span className="font-mono text-text">
                                  [{j + 1}]
                                </span>
                                <span className="text-text">
                                  {s.filename}
                                </span>
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

        <div className="border-t border-border p-4 shrink-0">
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

      {/* RIGHT: PDF viewer */}
      <div className="flex flex-col bg-bg border-l border-border min-w-0 h-screen overflow-hidden">
        {pdfUrl ? (
          <>
            <div className="px-6 py-4 border-b border-border shrink-0 flex items-center justify-between">
              <span className="text-xs font-medium text-muted uppercase tracking-wide">
                Source
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted">
                  Page {currentPage}{numPages ? ` of ${numPages}` : ""}
                </span>
                {numPages && numPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-1 rounded hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      title="Previous Page"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 text-muted" />
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= numPages}
                      onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                      className="p-1 rounded hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      title="Next Page"
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
              Open a document from the Library and click "Ask about this" to see
              it here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted">Loading…</div>}>
      <ChatPageInner />
    </Suspense>
  );
}