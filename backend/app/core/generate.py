import json
import time

from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.config import settings
from app.core.prompts import SYSTEM_PROMPT, build_user_prompt


# Module-level singleton with a hard timeout.
# Prevents infinite hangs when Gemini accepts the connection but never responds.
_client_instance: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client_instance
    if _client_instance is None:
        _client_instance = genai.Client(
            api_key=settings.GEMINI_API_KEY,
            http_options=types.HttpOptions(
                timeout=30_000,  # 30 seconds, in milliseconds
            ),
        )
    return _client_instance


def answer(question: str, chunks: list) -> str:
    if not chunks:
        return "I couldn't find that in the provided documents."
    client = _get_client()
    response = client.models.generate_content(
        model=settings.chat_model,
        contents=build_user_prompt(question, chunks),
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.2,
            max_output_tokens=1024,
        ),
    )
    return response.text or ""


def answer_stream(question: str, chunks: list):
    if not chunks:
        yield "I couldn't find that in the provided documents."
        return

    client = _get_client()

    def _create():
        return client.models.generate_content_stream(
            model=settings.chat_model,
            contents=build_user_prompt(question, chunks),
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.2,
                max_output_tokens=1024,
            ),
        )

    for attempt in range(3):
        try:
            stream = _create()
            iterator = iter(stream)

            try:
                first = next(iterator)
            except StopIteration:
                yield "I couldn't find that in the provided documents."
                return

            if first.text:
                yield first.text

            for event in iterator:
                if event.text:
                    yield event.text
            return

        except APIError as e:
            code = getattr(e, "code", None)
            if code == 503 and attempt < 2:
                time.sleep(1.5)
                continue
            yield f"Gemini is busy right now (error {code}). Please click send again."
            return

        except Exception as e:
            if attempt < 2:
                time.sleep(1.5)
                continue
            yield f"Error: {type(e).__name__}. Please retry."
            return


def suggest_questions(chunks: list) -> list[str]:
    if not chunks:
        return []

    sample = "\n\n".join(c["text"][:600] for c in chunks[:4])
    prompt = f"""Based on the following document excerpt, generate exactly 3 short questions a user might want to ask about this document.

Rules:
- Each question must be answerable from the document content.
- Keep each under 60 characters.
- Be specific to the topic — avoid generic questions like "summarize".
- Return ONLY a JSON array of 3 strings. No preamble, no explanation, no markdown.

Document excerpt:
{sample}

Return format: ["Question 1?", "Question 2?", "Question 3?"]"""

    try:
        client = _get_client()
        resp = client.models.generate_content(
            model=settings.chat_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.4,
                max_output_tokens=200,
                response_mime_type="application/json",
            ),
        )
        questions = json.loads(resp.text or "[]")
        return [str(q).strip() for q in questions if str(q).strip()][:3]
    except Exception:
        return []