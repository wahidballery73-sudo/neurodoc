function apiBase(): string {
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:8000`;
  }
  return "http://127.0.0.1:8000";
}

export type Document = {
  doc_id: string;
  filename: string;
  chunk_count: number;
  page_count: number;
};

export type ChatSource = {
  filename: string;
  page: number;
  distance: number;
  preview: string;
};

export type ChatResponse = {
  answer: string;
  sources: ChatSource[];
};

export async function listDocuments(): Promise<Document[]> {
  const res = await fetch(`${apiBase()}/documents`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to list documents (${res.status})`);
  return res.json();
}

export async function uploadDocument(file: File): Promise<Document> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${apiBase()}/documents/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `Upload failed (${res.status})`);
  }
  return res.json();
}

export async function chat(
  question: string,
  docId?: string
): Promise<ChatResponse> {
  const res = await fetch(`${apiBase()}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, doc_id: docId || null }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `Chat failed (${res.status})`);
  }
  return res.json();
}

export async function chatStream(
  question: string,
  docId: string | undefined,
  onSources: (sources: ChatSource[]) => void,
  onToken: (t: string) => void,
  onDone: () => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${apiBase()}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, doc_id: docId || null }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`Stream failed (${res.status})`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    // Split on double newline — events are separated by \n\n
    const parts = buf.split("\n\n");
    buf = parts.pop() || "";
    for (const part of parts) {
      const lines = part.split("\n");
      let event = "", data = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) event = line.slice(7).trim();
        else if (line.startsWith("data: ")) data = line.slice(6);
      }
      if (!event || !data) continue;
      if (event === "sources") onSources(JSON.parse(data));
      else if (event === "token") onToken(JSON.parse(data).t);
      else if (event === "done") onDone();
    }
  }
}