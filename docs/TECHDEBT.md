# TECHDEBT

## Known Temporary Decisions

### 1. Chat history stored in browser localStorage

- Location: `frontend/app/layout.tsx`, `frontend/app/chat/components/ChatComponent.tsx`
- Status: intentional shortcut for a template/demo product
- Risk: history is tied to one browser profile and can be lost on clear/reset
- Replace when: server-side persistence or cross-device sync becomes required

### 2. SSE parsing is line-based and minimal

- Location: `frontend/app/chat/hooks/useStreamChat.ts`
- Status: working but fragile
- Risk: chunk boundaries and partial JSON lines can break parsing in edge cases
- Replace when: streaming volume grows or partial-frame handling becomes a real issue

### 3. Multi-agent streaming hides sub-agent traces

- Location: `backend/app/api/chat_routes.py`
- Status: deliberate UI simplification
- Risk: debugging sub-agent reasoning requires backend logs instead of frontend visibility
- Replace when: operator-facing trace inspection is required

### 4. CORS is wide open

- Location: `backend/app/main.py`
- Status: development-friendly default
- Risk: accepts any origin
- Replace when: deployment target is public or shared

### 5. Embedding backend assumes Ollama availability

- Location: `backend/app/ai/rag/chromaClient.py`
- Status: local-first assumption
- Risk: RAG breaks if Ollama or `bge-m3` is absent
- Replace when: embeddings must be hosted remotely or bundled differently

### 6. Department-by-name route is inconsistent

- Location: `backend/app/api/department_routers.py`
- Status: implementation mismatch in current code
- Risk: route name and parameter handling do not align cleanly
- Replace when: API surface is normalized and tested

## Debt Policy

Each item must be revisited when one of these happens:

- the related file changes
- the feature becomes user-facing beyond demo usage
- a regression test is added for the same behavior
- deployment moves from local/dev to production

