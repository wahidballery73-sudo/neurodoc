"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, MoreHorizontal, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { listDocuments, uploadDocument, type Document } from "@/lib/api";

export default function LibraryPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch (err) {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are supported");
      return;
    }
    setUploading(true);
    try {
      await uploadDocument(file);
      toast.success(`Uploaded "${file.name}"`);
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mb-8 cursor-pointer rounded-md border border-dashed p-8 text-center transition-colors ${
          dragOver ? "border-accent bg-accent/5" : "border-border bg-surface"
        }`}
      >
        <p className="text-sm text-muted">
          Drop a PDF here, or click to browse
        </p>
      </div>

      <div className="rounded-md border border-border bg-surface overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_100px_60px] gap-4 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted border-b border-border">
          <div>Name</div>
          <div className="text-right">Pages</div>
          <div className="text-right">Chunks</div>
          <div />
        </div>

        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_100px_100px_60px] gap-4 px-4 items-center h-12 border-b border-border last:border-b-0"
              >
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-12 ml-auto" />
                <Skeleton className="h-4 w-12 ml-auto" />
                <Skeleton className="h-4 w-6" />
              </div>
            ))}
          </>
        ) : documents.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted">
              No documents yet. Drop a PDF to get started.
            </p>
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.doc_id}
              className="grid grid-cols-[1fr_100px_100px_60px] gap-4 px-4 items-center h-12 border-b border-border last:border-b-0 hover:bg-bg transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-muted shrink-0" />
                <span className="text-sm truncate">{doc.filename}</span>
              </div>
              <div className="text-right text-sm text-muted tabular-nums">
                {doc.page_count}
              </div>
              <div className="text-right text-sm text-muted tabular-nums">
                {doc.chunk_count}
              </div>
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => router.push(`/chat?doc_id=${doc.doc_id}`)}
                    >
                      Ask about this
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => console.log("delete", doc.doc_id)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
