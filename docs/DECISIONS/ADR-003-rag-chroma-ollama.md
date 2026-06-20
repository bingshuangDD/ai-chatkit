# ADR-003: Use ChromaDB plus Ollama embeddings for handbook RAG

## Status

Accepted

## Context

The assistant must answer questions about company handbook content using local knowledge instead of hallucinating policies.

## Decision

- Store handbook vectors in local ChromaDB.
- Use Ollama embeddings with `bge-m3`.
- Expose handbook search as an agent tool.

## Rationale

- ChromaDB is simple to persist locally inside the repo runtime.
- `bge-m3` supports Chinese and English well enough for the project's target content.
- Tool-based retrieval keeps knowledge access inside the agent boundary.

## Consequences

- RAG depends on a local embedding runtime.
- Handbook freshness is tied to re-indexing, not live document sync.
- If Chroma is empty or Ollama is unavailable, the tool must fail safely.

## Evidence in Code

- `backend/app/ai/rag/chromaClient.py`
- `backend/app/ai/tools/oa_tools.py`
- `backend/app/resource/chroma_db/*`

