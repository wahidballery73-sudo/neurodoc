from pathlib import Path
from typing import List, Dict, Any
from pypdf import PdfReader
from app.config import settings

def chunk_text_sliding_window(text: str, chunk_size: int, chunk_overlap: int) -> List[str]:
    """
    Splits a string into overlapping chunks using a sliding window.
    """
    if not text:
        return []
    
    chunks = []
    step = chunk_size - chunk_overlap
    if step <= 0:
        step = chunk_size
    
    start = 0
    text_len = len(text)
    
    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == text_len:
            break
        start += step
        
    return chunks

def extract_and_chunk_pdf(
    file_path: str | Path,
    doc_id: str,
    filename: str,
    chunk_size: int = settings.chunk_size,
    chunk_overlap: int = settings.chunk_overlap
) -> List[Dict[str, Any]]:
    """
    Extracts text page-by-page from a PDF and chunks each page using sliding window.
    Returns list of dicts with chunk metadata.
    """
    reader = PdfReader(str(file_path))
    chunks: List[Dict[str, Any]] = []
    chunk_index = 0

    for page_num, page in enumerate(reader.pages, start=1):
        page_text = page.extract_text() or ""
        page_text = page_text.strip()
        if not page_text:
            continue
        
        page_chunks = chunk_text_sliding_window(page_text, chunk_size, chunk_overlap)
        for text_chunk in page_chunks:
            chunks.append({
                "text": text_chunk,
                "doc_id": doc_id,
                "filename": filename,
                "page": page_num,
                "chunk_index": chunk_index
            })
            chunk_index += 1

    return chunks
