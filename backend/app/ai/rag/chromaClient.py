from pathlib import Path

import chromadb
from chromadb.config import Settings
from langchain_ollama import OllamaEmbeddings

from langchain_chroma import Chroma
from core.config import settings


BACKEND_DIR = Path(__file__).resolve().parents[3]
CHROMA_PATH = Path(settings.CHROMA_PATH or "resource/chroma_db")
if not CHROMA_PATH.is_absolute():
    CHROMA_PATH = BACKEND_DIR / CHROMA_PATH

client = chromadb.PersistentClient(
    path=str(CHROMA_PATH),
    settings=Settings(anonymized_telemetry=False),
)
#
embeddings = OllamaEmbeddings(
    model=settings.EMBEDDING_MODEL,
)

# collection = client.get_or_create_collection(name="handbook")
      
hand_book_vector_store = Chroma(
    collection_name="handbook",
    persist_directory=str(CHROMA_PATH),  # Where to save data locally, remove if not necessary
    embedding_function=embeddings,
    client=client,
    create_collection_if_not_exists=True,
)
