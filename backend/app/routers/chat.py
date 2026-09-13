from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.core.retrieve import retrieve
from app.core.generate import answer

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatRequest(BaseModel):
    question: str
    doc_id: Optional[str] = None

@router.post("")
async def chat(request: ChatRequest):
    """
    Retrieves context and generates an answer to the provided question.
    """
    try:
        chunks = retrieve(request.question, top_k=5, doc_id=request.doc_id)
        
        if not chunks:
            return {"answer": "I couldn't find that in the provided documents.", "sources": []}
            
        generated_answer = answer(request.question, chunks)
        
        sources = [
            {
                "filename": chunk["filename"],
                "page": chunk["page"],
                "distance": chunk["distance"],
                "preview": chunk["text"][:100] + "..."
            }
            for chunk in chunks
        ]
        
        return {
            "answer": generated_answer,
            "sources": sources
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat generation failed: {str(e)}")
