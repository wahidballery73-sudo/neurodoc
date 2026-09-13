from app.core.embeddings import embed_query
from app.core.vectorstore import query_chunks
from typing import List, Dict, Any, Optional

def retrieve(question: str, top_k: int = 5, doc_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Retrieves relevant chunks for a given question and formats them.
    """
    query_embedding = embed_query(question)
    raw_results = query_chunks(query_embedding, top_k=top_k, doc_id=doc_id)
    
    formatted_results = []
    for res in raw_results:
        meta = res.get("metadata", {})
        formatted_results.append({
            "text": res.get("text", ""),
            "page": meta.get("page"),
            "filename": meta.get("filename"),
            "doc_id": meta.get("doc_id"),
            "distance": res.get("distance")
        })
    
    return formatted_results
