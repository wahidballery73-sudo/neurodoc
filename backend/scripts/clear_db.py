import shutil
from app.config import settings
from app.core.vectorstore import get_chroma_client

def clear_chroma_data():
    """
    Clears all data in the ChromaDB persistent storage directory.
    """
    if settings.chroma_dir.exists():
        shutil.rmtree(settings.chroma_dir)
        settings.chroma_dir.mkdir(parents=True, exist_ok=True)
        print(f"Cleared all data in {settings.chroma_dir}")
    else:
        print(f"Chroma directory {settings.chroma_dir} does not exist.")

if __name__ == "__main__":
    clear_chroma_data()
