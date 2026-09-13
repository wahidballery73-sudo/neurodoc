import uuid
import shutil
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from app.config import settings
from app.core.ingest import extract_and_chunk_pdf
from app.core.embeddings import embed_texts, embed_query
from app.core.vectorstore import add_chunks, query_chunks, get_collection

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Accepts PDF file, extracts text, chunks it, generates embeddings using Gemini API,
    and stores vectors in ChromaDB.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    doc_id = str(uuid.uuid4())
    filename = file.filename
    file_path = settings.upload_dir / f"{doc_id}_{filename}"

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {str(e)}")

    try:
        chunks = extract_and_chunk_pdf(file_path, doc_id=doc_id, filename=filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF text: {str(e)}")

    if not chunks:
        raise HTTPException(status_code=400, detail="No readable text found in PDF document.")

    try:
        texts = [c["text"] for c in chunks]
        embeddings = embed_texts(texts)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")

    try:
        add_chunks(chunks, embeddings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to store chunks in vector store: {str(e)}")

    return {
        "doc_id": doc_id,
        "filename": filename,
        "total_chunks": len(chunks),
        "message": "Document ingested and embedded successfully."
    }
@router.get("")
async def list_documents():
    """
    Lists all ingested documents with metadata aggregated by doc_id.
    """
    try:
        collection = get_collection()
        results = collection.get(include=["metadatas"])
        metadatas = results.get("metadatas", [])
        
        if not metadatas:
            return []
        
        docs_map = {}
        for meta in metadatas:
            doc_id = meta["doc_id"]
            if doc_id not in docs_map:
                docs_map[doc_id] = {
                    "doc_id": doc_id,
                    "filename": meta["filename"],
                    "chunk_count": 0,
                    "page_count": 0
                }
            
            docs_map[doc_id]["chunk_count"] += 1
            docs_map[doc_id]["page_count"] = max(docs_map[doc_id]["page_count"], meta["page"])
            
        doc_list = list(docs_map.values())
        doc_list.sort(key=lambda x: x["doc_id"], reverse=True)
        return doc_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list documents: {str(e)}")



@router.get("/search")
async def search_documents(
    query: str = Query(..., description="Search query string"),
    doc_id: Optional[str] = Query(None, description="Optional document ID filter"),
    top_k: int = Query(5, ge=1, le=20, description="Number of results to retrieve")
):
    """
    Searches vectors in ChromaDB for matching document chunks based on cosine distance.
    """
    try:
        query_embedding = embed_query(query)
        results = query_chunks(query_embedding, top_k=top_k, doc_id=doc_id)
        return {
            "query": query,
            "doc_id_filter": doc_id,
            "results_count": len(results),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
