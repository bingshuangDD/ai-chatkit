# ADR-002: Use LangGraph agents with explicit supervisor routing

## Status

Accepted

## Context

The system needs one company assistant and one multi-agent demonstration mode. The latter must route math, code, and general questions to different specialists.

## Decision

- Implement `oa-assistant` as a LangGraph state graph with tool calls.
- Implement `multi-agent-supervisor` using a supervisor over specialist sub-agents.
- Register agents in a central lookup table.

## Rationale

- LangGraph gives explicit state and checkpoint support for multi-turn behavior.
- Tool-node execution makes database and retrieval access observable.
- Supervisor routing keeps specialist scope narrow and avoids mixed prompts.

## Consequences

- Agent IDs become a stable public contract.
- Tool behavior must remain compatible with LangChain message types.
- Streaming output needs filtering so internal sub-agent traces do not leak unnecessarily.

## Evidence in Code

- `backend/app/ai/agent/oa_assistant.py`
- `backend/app/ai/agent/multi_agent.py`
- `backend/app/ai/agent/agents.py`

