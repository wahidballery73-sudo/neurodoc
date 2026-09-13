from typing import List, Dict, Any, Optional
import chromadb
from app.config import settings

def get_chroma_client() -> chromadb.PersistentClient:
    return chromadb.PersistentClient(path=str(settings.chroma_dir))

def get_collection():
    client = get_chroma_client()
    return client.get_or_create_collection(
        name="neurodoc",
        metadata={"hnsw:space": "cosine"}
    )

def add_chunks(chunks: List[Dict[str, Any]], embeddings: List[List[float]]) -> None:
    """
    Stores chunks and their embeddings in ChromaDB with metadata.
    Metadata format: doc_id, filename, page, chunk_index
    """
    if not chunks or not embeddings:
        return
        
    collection = get_collection()
    
    ids = [f"{chunk['doc_id']}_c{chunk['chunk_index']}" for chunk in chunks]
    documents = [chunk["text"] for chunk in chunks]
    metadatas = [
        {
            "doc_id": str(chunk["doc_id"]),
            "filename": str(chunk["filename"]),
            "page": int(chunk["page"]),
            "chunk_index": int(chunk["chunk_index"])
        }
        for chunk in chunks
    ]
    
    collection.add(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas
    )

def query_chunks(
    query_embedding: List[float],
    top_k: int = 5,
    doc_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Queries ChromaDB vector collection using cosine similarity.
    Optionally filters by doc_id.
    """
    collection = get_collection()
    where_filter = {"doc_id": doc_id} if doc_id else None

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where=where_filter
    )

    formatted_results = []
    if results and results.get("documents") and len(results["documents"]) > 0:
        docs = results["documents"][0]
        metas = results["metadatas"][0] if results.get("metadatas") else []
        distances = results["distances"][0] if results.get("distances") else []
        ids = results["ids"][0] if results.get("ids") else []

        for i in range(len(docs)):
            formatted_results.append({
                "id": ids[i],
                "text": docs[i],
                "metadata": metas[i] if i < len(metas) else {},
                "distance": distances[i] if i < len(distances) else None
            })

    return formatted_results
