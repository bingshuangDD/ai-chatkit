# GLOSSARY

## Terms and Code Mapping

| Term | Meaning | Code mapping |
|---|---|---|
| `chat` | User-facing conversation feature | `frontend/app/chat/*`, `backend/app/api/chat_routes.py` |
| `thread_id` | Conversation continuity key | `backend/app/api/schema/chatSchema.py`, `backend/app/api/chat_routes.py`, `frontend/app/chat/hooks/useStreamChat.ts` |
| `agent_id` | Selected agent identifier | `backend/app/ai/agent/agents.py`, `frontend/app/components/AgentSelector.tsx` |
| `agent_config` | Extra runtime config passed to an agent | `backend/app/api/schema/chatSchema.py`, `backend/app/api/chat_routes.py` |
| `oa-assistant` | OA-style assistant agent | `backend/app/ai/agent/oa_assistant.py` |
| `multi-agent-supervisor` | Supervisor that routes among sub-agents | `backend/app/ai/agent/multi_agent.py`, `backend/app/ai/agent/agents.py` |
| `tool` | Function callable by an LLM | `backend/app/ai/tools/oa_tools.py` |
| `RAG` | Retrieval-augmented generation over handbook docs | `backend/app/ai/rag/chromaClient.py`, `backend/app/ai/tools/oa_tools.py` |
| `ChromaDB` | Local vector store for handbook search | `backend/app/resource/chroma_db/*` |
| `embedding model` | Text-to-vector model used by retrieval | `backend/app/core/config.py`, `backend/app/ai/rag/chromaClient.py` |
| `SSE` | Streaming protocol for chat responses | `backend/app/api/chat_routes.py`, `frontend/app/chat/hooks/useStreamChat.ts` |
| `Message` | Frontend chat message record | `frontend/app/chat/types/chat.types.ts` |
| `run_id` | Per-request execution identifier | `backend/app/api/chat_routes.py`, `backend/app/api/schema/chatSchema.py` |
| `localStorage` | Browser-side persistence for sessions and messages | `frontend/app/layout.tsx`, `frontend/app/chat/components/ChatComponent.tsx` |
| `Employee` | Employee data row | `backend/app/db/models/employee.py` |
| `Department` | Department data row | `backend/app/db/models/department.py` |
| `Repository` | Database access wrapper | `backend/app/db/repository/*.py` |

## Domain-to-Technical Equivalents

- `OA assistant` means the company-information assistant built on LangGraph, not a generic chatbot.
- `multi-agent` means one supervisor plus multiple specialist sub-agents, not parallel agent fan-out.
- `handbook search` means semantic search over the local Chroma collection named `handbook`.
- `chat history` means browser-stored state unless a future design explicitly moves it to the backend.

## Reserved Keys

These keys are reserved in `agent_config` and must not be overridden by callers:

- `thread_id`
- `model`

