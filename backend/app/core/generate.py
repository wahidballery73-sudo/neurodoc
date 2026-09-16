from google import genai
from google.genai import types
from app.config import settings
from app.core.prompts import SYSTEM_PROMPT, build_user_prompt

def answer(question: str, chunks: list) -> str:
    """
    Generates an answer based on retrieved context using Gemini.
    """
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    
    prompt = build_user_prompt(question, chunks)
    
    response = client.models.generate_content(
        model=settings.chat_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.2,
            max_output_tokens=1024,
        )
    )
    
    return response.text


def answer_stream(question: str, chunks: list):
    if not chunks:
        yield "I couldn't find that in the provided documents."
        return
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    stream = client.models.generate_content_stream(
        model=settings.chat_model,
        contents=build_user_prompt(question, chunks),
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.2,
            max_output_tokens=1024,
        ),
    )
    for event in stream:
        if event.text:
            yield event.text

