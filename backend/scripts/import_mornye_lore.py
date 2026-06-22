"""Rebuild Mornye character lore in ChromaDB from curated sections."""

from pathlib import Path
import sys

from langchain_core.documents import Document

BACKEND_DIR = Path(__file__).resolve().parents[1]
APP_DIR = BACKEND_DIR / "app"
WORKSPACE_DIR = BACKEND_DIR.parents[1]

sys.path.insert(0, str(APP_DIR))

from ai.rag.chromaClient import CHROMA_PATH, client, embeddings  # noqa: E402
from langchain_chroma import Chroma  # noqa: E402


COLLECTION_NAME = "character_lore_character-mornye"
LORE_FILE = WORKSPACE_DIR / "docs" / "characters" / "Mornye" / "Mornye.txt"


def load_curated_chunks() -> list[Document]:
    text = LORE_FILE.read_text(encoding="utf-8")
    sections: list[str] = []
    current: list[str] = []

    for line in text.splitlines():
        if line.startswith("【") and line.endswith("】") and current:
            sections.append("\n".join(current).strip())
            current = []
        current.append(line)

    if current:
        sections.append("\n".join(current).strip())

    chunks = [section for section in sections if section.startswith("【") and section.strip()]

    return [
        Document(
            page_content=chunk,
            metadata={
                "source": "mornye",
                "character": "Mornye",
                "chunk_index": index,
                "filename": LORE_FILE.name,
            },
        )
        for index, chunk in enumerate(chunks, start=1)
    ]


def main() -> None:
    try:
        client.delete_collection(COLLECTION_NAME)
        print(f"Deleted existing collection: {COLLECTION_NAME}")
    except ValueError:
        print(f"Collection does not exist yet: {COLLECTION_NAME}")

    vector_store = Chroma(
        collection_name=COLLECTION_NAME,
        persist_directory=str(CHROMA_PATH),
        embedding_function=embeddings,
        client=client,
        create_collection_if_not_exists=True,
    )

    docs = load_curated_chunks()
    vector_store.add_documents(docs)

    print(f"Imported {len(docs)} curated chunks from {LORE_FILE.name} into {COLLECTION_NAME}.")

    result = vector_store.similarity_search("莫宁是谁", k=3)
    print("Verification search:")
    for index, doc in enumerate(result, start=1):
        chunk_index = doc.metadata.get("chunk_index", "unknown")
        print(f"[{index}] chunk {chunk_index}: {doc.page_content[:160]}")


if __name__ == "__main__":
    main()
