# SCOPE

## Project Boundary

AI-CHATKIT is a full-stack AI chat template with:

- a Next.js frontend for chat sessions and agent selection
- a FastAPI backend for chat, employee, and department APIs
- LangGraph-based agent orchestration
- RAG retrieval over a local ChromaDB knowledge base
- optional model backends: OpenAI, DeepSeek, Ollama, TongYi, fake test model

## In Scope

### Frontend

- Render chat sessions in the browser
- Switch between `oa-assistant` and `multi-agent-supervisor`
- Send messages to backend `/chat/stream`
- Render SSE token stream and final messages
- Persist session list and message history in `localStorage`

### Backend

- Expose `/chat/invoke` and `/chat/stream`
- Support multi-turn dialogue via `thread_id`
- Support agent selection via `agent_id`
- Support agent configuration passthrough via `agent_config`
- Execute tool calls from LangGraph agents
- Provide employee CRUD APIs
- Provide department CRUD APIs

### AI / Retrieval

- Use LangGraph to orchestrate `oa-assistant`
- Use supervisor-based multi-agent routing for `multi-agent-supervisor`
- Use ChromaDB for handbook retrieval
- Use Ollama embeddings for vector search
- Use SQL-backed employee and department data in tools

### Runtime / Configuration

- Read runtime settings from `.env`
- Support SQLite and MySQL through async database URLs
- Run backend through Uvicorn
- Run frontend through Next.js dev server

## Out of Scope

- User authentication and authorization
- Multi-tenant isolation
- Production-grade conversation storage in a server database
- Admin console for agent authoring
- Prompt management UI
- Human review workflows
- Document ingestion UI
- File upload UI
- Full observability stack
- Rate limiting and abuse prevention
- Distributed tracing
- Search over arbitrary enterprise systems beyond the provided DB and Chroma store

## Hard Constraints

- Chat responses must be returned through `/chat/stream` as SSE events.
- `thread_id` must remain the unit of multi-turn continuity.
- `agent_id` must resolve to a registered compiled LangGraph agent.
- Reserved agent config keys must not be overwritten by user input.
- Tool-backed facts must come from the database or handbook retrieval, not hallucinated.

## Acceptance Boundaries

A change is in scope only if it can be validated by one of the following:

- a browser chat session
- a `curl` call to the chat API
- a CRUD call to employee or department APIs
- a direct inspection of stored browser history or Chroma results

