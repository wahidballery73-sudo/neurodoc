from typing import List, Union
from google import genai
from google.genai import types
from app.config import settings

def get_genai_client() -> genai.Client:
    api_key = settings.GEMINI_API_KEY
    if not api_key or api_key == "your_key_here":
        raise ValueError("GEMINI_API_KEY is not configured in backend/.env")
    return genai.Client(api_key=api_key)

def embed_texts(texts: List[str], task: str = "RETRIEVAL_DOCUMENT") -> List[List[float]]:
    """
    Embeds a list of texts using google-genai SDK.
    """
    if not texts:
        return []

    client = get_genai_client()
    config = types.EmbedContentConfig(task_type=task)

    response = client.models.embed_content(
        model=settings.embed_model,
        contents=texts,
        config=config
    )

    if hasattr(response, "embeddings") and response.embeddings:
        return [item.values for item in response.embeddings]
    elif hasattr(response, "embedding") and response.embedding:
        return [response.embedding.values]
    
    raise ValueError("No embeddings returned from Gemini API.")

def embed_query(query: str) -> List[float]:
    """
    Embeds a single query string using RETRIEVAL_QUERY task type.
    """
    client = get_genai_client()
    config = types.EmbedContentConfig(task_type="RETRIEVAL_QUERY")

    response = client.models.embed_content(
        model=settings.embed_model,
        contents=query,
        config=config
    )

    if hasattr(response, "embedding") and response.embedding:
        return response.embedding.values
    elif hasattr(response, "embeddings") and response.embeddings:
        return response.embeddings[0].values
        
    raise ValueError("No embedding returned for query from Gemini API.")
