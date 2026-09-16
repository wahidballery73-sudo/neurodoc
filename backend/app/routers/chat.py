import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from app.core.retrieve import retrieve
from app.core.generate import answer, answer_stream

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


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """
    Streams the answer to the provided question token-by-token via SSE.
    """
    def event_stream():
        try:
            chunks = retrieve(request.question, top_k=5, doc_id=request.doc_id)
            sources = [
                {
                    "filename": chunk["filename"],
                    "page": chunk["page"],
                    "distance": chunk["distance"],
                    "preview": chunk["text"][:100] + "..."
                }
                for chunk in chunks
            ] if chunks else []

            yield f"event: sources\ndata: {json.dumps(sources)}\n\n"

            for token in answer_stream(request.question, chunks):
                data = json.dumps({"t": token})
                yield f"event: token\ndata: {data}\n\n"

            yield "event: done\ndata: {}\n\n"

        except Exception as e:
            yield f"event: sources\ndata: {json.dumps([])}\n\n"
            err_data = json.dumps({"t": f"Error: {str(e)}"})
            yield f"event: token\ndata: {err_data}\n\n"
            yield "event: done\ndata: {}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )

