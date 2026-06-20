# ADR-004: Keep chat sessions and history in browser localStorage

## Status

Accepted

## Context

The project is a template and demo-grade chat product. It needs lightweight session persistence without adding backend storage complexity.

## Decision

- Store session lists in `localStorage`.
- Store per-thread messages in `localStorage`.
- Use `thread_id` as the browser-side key for restoration.

## Rationale

- No backend schema migration is needed.
- The UX works immediately after page reload.
- Session recovery is fast for local development.

## Consequences

- History is device- and browser-specific.
- Clearing browser storage deletes conversations.
- Cross-device sync is intentionally not supported.

## Evidence in Code

- `frontend/app/layout.tsx`
- `frontend/app/chat/components/ChatComponent.tsx`
- `frontend/app/chat/hooks/useChatActions.ts`

