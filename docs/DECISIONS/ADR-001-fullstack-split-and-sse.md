# ADR-001: Split frontend and backend, stream chat over SSE

## Status

Accepted

## Context

The product needs a chat UI that can show partial model output quickly, while the backend must also support agent tools, database access, and multi-turn state.

## Decision

- Use Next.js for the frontend.
- Use FastAPI for the backend API.
- Expose chat responses through `POST /chat/stream` as SSE.

## Rationale

- Next.js fits the existing browser UI and route-based chat pages.
- FastAPI fits async request handling and straightforward JSON APIs.
- SSE is simpler than WebSocket for one-way model token delivery.
- The frontend can progressively render tokens without waiting for full completion.

## Consequences

- The frontend must parse SSE frames and update state incrementally.
- The backend must preserve event order and always terminate streams cleanly.
- Non-streaming chat remains available through `/chat/invoke` for simpler callers.

## Evidence in Code

- `frontend/app/chat/hooks/useStreamChat.ts`
- `backend/app/api/chat_routes.py`
- `backend/app/main.py`

