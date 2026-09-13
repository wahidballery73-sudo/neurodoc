const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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
  const res = await fetch(`${API_URL}/documents`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to list documents (${res.status})`);
  return res.json();
}

export async function uploadDocument(file: File): Promise<Document> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/documents/upload`, {
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
  const res = await fetch(`${API_URL}/chat`, {
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