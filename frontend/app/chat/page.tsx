"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { chat, type ChatResponse } from "@/lib/api";

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: ChatResponse["sources"];
};

function ChatPageInner() {
  const searchParams = useSearchParams();
  const docId = searchParams.get("doc_id") || undefined;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const suggestions = [
    "What is the main topic of this document?",
    "Summarize the key points.",
    "What are the most important tags?",
    "Give me an example from the document.",
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] h-screen">
      <div className="flex flex-col border-r border-border">
        <div className="px-6 py-4 border-b border-border">
          <h1 className="text-sm font-semibold">Chat</h1>
          {docId && (
            <p className="text-xs text-muted mt-0.5">
              Scoped to one document
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
                      <div className="max-w-[80%] rounded-md bg-surface border border-border px-4 py-2 text-sm">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-none">
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
                            Sources
                          </p>
                          <div className="space-y-1">
                            {m.sources.map((s, j) => (
                              <div
                                key={j}
                                className="text-xs text-muted flex items-baseline gap-2"
                              >
                                <span className="font-mono">
                                  [{j + 1}]
                                </span>
                                <span className="text-text">
                                  {s.filename}
                                </span>
                                <span>· p.{s.page}</span>
                              </div>
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

        <div className="border-t border-border p-4">
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

      <div className="hidden lg:flex items-center justify-center bg-bg border-l border-border">
        <p className="text-sm text-muted">
          PDF viewer coming in Phase 8
        </p>
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