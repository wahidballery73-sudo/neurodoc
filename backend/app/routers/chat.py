import json
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from app.core.retrieve import retrieve
from app.core.generate import answer, answer_stream

router = APIRouter(prefix="/chat", tags=["chat"])

# Timeout for retrieval (embedding + vector search)
RETRIEVE_TIMEOUT_SECONDS = 15


class ChatRequest(BaseModel):
    question: str
    doc_id: Optional[str] = None


@router.post("")
async def chat(request: ChatRequest):
    try:
        chunks = retrieve(request.question, top_k=5, doc_id=request.doc_id)

        if not chunks:
            return {
                "answer": "I couldn't find that in the provided documents.",
                "sources": [],
            }

        generated_answer = answer(request.question, chunks)

        sources = [
            {
                "filename": chunk["filename"],
                "page": chunk["page"],
                "distance": chunk["distance"],
                "preview": chunk["text"][:100] + "...",
            }
            for chunk in chunks
        ]

        return {"answer": generated_answer, "sources": sources}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat generation failed: {str(e)}")


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """
    Streams the answer token-by-token via SSE.
    Adds a hard timeout on retrieval so we don't hang forever if Gemini's
    embedding endpoint is slow.
    """

    def event_stream():
        # ---------- STAGE 1: retrieval with timeout ----------
        try:
            with ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(
                    retrieve, request.question, 5, request.doc_id
                )
                chunks = future.result(timeout=RETRIEVE_TIMEOUT_SECONDS)
        except TimeoutError:
            yield "event: sources\ndata: []\n\n"
            err = "Retrieval timed out. Embedding service is slow right now — please try again."
            yield f"event: token\ndata: {json.dumps({'t': err})}\n\n"
            yield "event: done\ndata: {}\n\n"
            return
        except Exception as e:
            yield "event: sources\ndata: []\n\n"
            err = f"Retrieval failed: {type(e).__name__}: {e}"
            yield f"event: token\ndata: {json.dumps({'t': err})}\n\n"
            yield "event: done\ndata: {}\n\n"
            return

        # ---------- STAGE 2: emit sources ----------
        sources = [
            {
                "filename": chunk["filename"],
                "page": chunk["page"],
                "distance": chunk["distance"],
                "preview": chunk["text"][:100] + "...",
            }
            for chunk in (chunks or [])
        ]
        yield f"event: sources\ndata: {json.dumps(sources)}\n\n"

        # ---------- STAGE 3: stream the answer ----------
        try:
            for token in answer_stream(request.question, chunks):
                data = json.dumps({"t": token})
                yield f"event: token\ndata: {data}\n\n"
        except Exception as e:
            err = f"\n\n_(generation error: {type(e).__name__})_"
            yield f"event: token\ndata: {json.dumps({'t': err})}\n\n"

        yield "event: done\ndata: {}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )