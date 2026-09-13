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
