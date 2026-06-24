<h1 align="center">🤖 AI-CHATKIT</h1>
<p align="center">
  <strong style="background-color: green; color: white; padding: 2px 8px; border-radius: 4px;">English</strong>
  |
  <a href="./README_zh.md" target="_Self">中文</a>
</p>

<p align="center">
  <strong>A Full-Stack AI Agent Chat Template for Enterprise Scenarios</strong>
</p>

<p align="center">
  Built with <strong>LangGraph + FastAPI + Next.js + ChromaDB</strong> — multi-agent collaboration, RAG retrieval,<br>
  MCP external services, image generation, and dynamic theming, ready out of the box.
</p>

<p align="center">
  <img src="./pictures/chat_img.png" width="700" alt="OA Assistant Chat Interface"/>
</p>

<details>
<summary>📸 Multi-Agent Collaboration Interface</summary>
<p align="center">
  <img src="./pictures/chat_multi_agent_img.png" width="700" alt="Multi-Agent Collaboration"/>
</p>
</details>

---

## 📋 Table of Contents

- [Features](#-features)
- [Agent Matrix](#-agent-matrix)
- [Project Structure](#-project-structure)
- [Architecture Overview](#-architecture-overview)
- [Quick Start](#-quick-start)
- [Configuration Guide](#-configuration-guide)
- [RAG Deployment](#-rag-deployment)
- [Architecture Decision Records](#-architecture-decision-records)
- [Technical Debt](#-technical-debt)

---

## ✨ Features

### Core Capabilities

| Domain | Capability |
|---|---|
| 🧠 **Agent Orchestration** | LangGraph StateGraph with ReAct loop — conditional routing, tool calling, checkpoint recovery |
| 🤝 **Multi-Agent Collaboration** | Supervisor pattern — one supervisor routes tasks to math/code/general three specialist sub-agents |
| 🎭 **Role-Playing** | 2 built-in character agents (Ameath/Mornye) with independent ChromaDB lore knowledge bases and personalized system prompts |
| 📚 **RAG Retrieval** | ChromaDB vector store + Ollama bge-m3 embeddings for semantic search over handbooks and character lore |
| 🎵 **Music Player** | MCP-based NetEase Cloud Music integration — natural language → search → security validation → browser player |
| 🎨 **AI Image Generation** | Jimeng (DreamSeed) API with text-to-image / image-to-image / multi-image fusion + Kimi prompt optimization |
| 🌊 **SSE Streaming** | Token-by-token progressive rendering with 5 event types: `token` / `message` / `player_command` / `error` / `end` |
| 🎨 **Dynamic Theming** | Agent-driven UI theme switching — 4 independent color palettes with gradient transitions |
| 💾 **IndexedDB Persistence** | Four-table storage (sessions / messages / assets / pending messages) with binary asset support |

### Engineering

| Domain | Capability |
|---|---|
| 🔄 **Multi-Model Support** | Unified LLM factory for DeepSeek / Kimi / OpenAI / Ollama / TongYi — switch models with 1 config line |
| 🖼️ **Auto Vision Switching** | Automatically switches to vision model (kimi-k2.7-code) when images are detected in the conversation |
| 🛡️ **Security** | 7-point URL validation for music playback (HTTPS enforcement, private IP blocking, domain allowlist, expiry check, etc.) |
| 🔻 **Graceful Degradation** | 3 fallback paths — MCP unavailable → mock mode, Ollama unavailable → error message, prompt optimization failure → raw input |
| 📝 **ADR Records** | 9 five-section architecture decision documents covering all key technical choices |
| 🗂️ **Glossary** | 18 core terms with precise code file mappings |
| ⚠️ **Technical Debt Tracking** | 6 identified debt items, each with explicit replacement triggers |

---

## 🤖 Agent Matrix

| Agent ID | Type | Description | Tools | Highlights |
|---|---|---|---|---|
| `oa-assistant` | Enterprise Assistant | Employee lookup / department query / handbook search / music control | 7 | Default agent, responds in Chinese, no hallucination |
| `multi-agent-supervisor` | Multi-Agent Collaboration | Supervisor routes to 3 specialist sub-agents (math/code/general) | 3 sub-agents | Sub-agent internal traces hidden from frontend |
| `character-ameath` | Role-Playing | Ameath — a character agent with complete backstory and personality | 8 | Independent lore KB (21 semantic chunks) |
| `character-mornye` | Role-Playing | Mornye — a character agent with complete backstory and personality | 8 | Independent lore KB |

> **Add a new agent in 3 steps**: Write agent file → Register in `agents.py` → Add frontend selector option.

---

## 📁 Project Structure

```
ai-chatkit/
├── README.md                         # English README (this file)
├── README_zh.md                      # 中文 README
├── docs/                             # 📖 Documentation
│   ├── SCOPE.md                      #   Project scope & hard constraints
│   ├── GLOSSARY.md                   #   Glossary (18 core terms)
│   ├── TECHDEBT.md                   #   Technical debt tracking (6 items)
│   ├── MUSIC_PLAYER_MCP_TECHNICAL.md #   Music player technical notes
│   ├── AMEATH_AGENT_IMPLEMENTATION.md#   Ameath agent implementation record
│   ├── ROLE_STYLE_THEME_SWITCH.md    #   Role theme switching design
│   ├── FRONTEND_ROLE_THEME_SWITCH_IMPLEMENTATION.md
│   └── DECISIONS/                    # 🏛️ Architecture Decision Records (9 ADRs)
│       ├── ADR-001-fullstack-split-and-sse.md
│       ├── ADR-002-langgraph-agent-and-supervisor.md
│       ├── ADR-003-rag-chroma-ollama.md
│       ├── ADR-004-browser-local-state.md
│       ├── ADR-005-mcp-music-player.md
│       ├── ADR-006-multi-model-llm-factory.md
│       ├── ADR-007-character-agent-and-lore-rag.md
│       ├── ADR-008-per-agent-frontend-theme.md
│       └── ADR-009-image-generation-pipeline.md
│
├── backend/                          # 🐍 FastAPI Backend
│   ├── .env                          #   Environment configuration
│   ├── pyproject.toml                #   Python dependencies (uv)
│   ├── app/
│   │   ├── main.py                   #   FastAPI entry + CORS + route mounting
│   │   ├── run_server.py             #   Uvicorn launcher
│   │   ├── core/config.py            #   Pydantic Settings
│   │   ├── ai/
│   │   │   ├── llm.py                #   LLM factory (5 providers)
│   │   │   ├── models.py             #   Model name enums
│   │   │   ├── agent/                #   Agent definitions
│   │   │   │   ├── agents.py         #     Central agent registry
│   │   │   │   ├── oa_assistant.py   #     OA Assistant
│   │   │   │   ├── multi_agent.py    #     Supervisor Multi-Agent
│   │   │   │   ├── Ameath.py         #     Ameath Character
│   │   │   │   └── Mornye.py         #     Mornye Character
│   │   │   ├── rag/chromaClient.py   #   ChromaDB client & collections
│   │   │   └── tools/                #   Agent tools
│   │   │       ├── oa_tools.py       #     Employee/Dept/Handbook
│   │   │       └── music_tools.py    #     Play/Pause/Resume/Stop
│   │   ├── api/                      #   REST endpoints
│   │   │   ├── chat_routes.py        #     /chat/invoke + /chat/stream (SSE)
│   │   │   ├── employee_routers.py   #     Employee CRUD
│   │   │   ├── department_routers.py #     Department CRUD
│   │   │   ├── image_workflow_routes.py #  Image generation
│   │   │   └── schema/chatSchema.py  #     Pydantic request/response models
│   │   ├── db/                       #   Database layer
│   │   │   ├── database.py           #     Async SQLAlchemy engine
│   │   │   ├── models/               #     SQLModel data models
│   │   │   └── repository/           #     Repository pattern
│   │   ├── music/                    #   Music player subsystem
│   │   │   ├── service.py            #     Business orchestration
│   │   │   ├── mcp_client.py         #     MCP client (with mock mode)
│   │   │   ├── security.py           #     URL validation (7 checks)
│   │   │   └── schemas.py            #     Data classes
│   │   ├── image_workflows/          #   Image generation subsystem
│   │   │   ├── service.py            #     Pipeline orchestration
│   │   │   ├── jimeng_client.py      #     Jimeng API client
│   │   │   ├── kimi_prompt_builder.py#     Kimi prompt optimizer
│   │   │   └── image_staging.py      #     Reference image staging
│   │   └── utils/chat_utils.py       #   LangChain message conversion
│   ├── mcp_servers/
│   │   └── music_mcp_server.py       #   MCP stdio music server
│   ├── resource/
│   │   ├── chroma_db/                #   ChromaDB persisted data
│   │   └── EmployeeHandbook.pdf      #   Source handbook
│   └── scripts/                      #   Knowledge base import scripts
│
├── frontend/                         # ⚛️ Next.js Frontend
│   ├── app/
│   │   ├── layout.tsx                #   Root layout (LayoutContext + PlayerProvider)
│   │   ├── chat/
│   │   │   ├── components/           #   Chat UI components
│   │   │   ├── hooks/                #   useStreamChat, useChatActions, useScrollToBottom
│   │   │   ├── storage/              #   IndexedDB persistence layer (4 repos)
│   │   │   ├── types/                #   Message type definitions
│   │   │   └── workflows/            #   Image generation frontend
│   │   ├── components/               #   Shared components (AgentSelector, Sider, etc.)
│   │   ├── config/                   #   Agent config & theme palettes
│   │   └── player/                   #   Audio player subsystem
│   └── package.json
│
└── pictures/                         # 📸 Screenshots
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend (Next.js 14)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ChatComponent│ │AgentSel.│ │GlobalPlayer│ │IndexedDB (4表)│  │
│  └─────┬────┘ └────┬─────┘ └─────┬─────┘ └───────┬───────┘  │
│        │           │             │               │           │
│        │   SSE Stream (fetch + ReadableStream)    │           │
├────────┼───────────┼─────────────┼───────────────┼───────────┤
│        ▼           ▼             ▼               │           │
│                 Backend (FastAPI + Uvicorn)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               /chat/stream (SSE)                       │   │
│  │  token │ message │ player_command │ error │ end      │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            LangGraph Agent (agents.py)                 │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐  │   │
│  │  │oa-assist.│ │multi-agent│ │character │ │character│  │   │
│  │  │          │ │supervisor│ │ -ameath  │ │ -mornye │  │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬────┘  │   │
│  └───────┼────────────┼────────────┼────────────┼───────┘   │
│          ▼            ▼            ▼            ▼            │
│  ┌──────────────── ToolNode ───────────────────────────┐   │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │   │
│  │ │Employee  │ │Handbook  │ │Music     │ │Char.   │  │   │
│  │ │Lookup    │ │RAG       │ │Control   │ │Lore RAG│  │   │
│  │ └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘  │   │
│  └──────┼────────────┼────────────┼────────────┼───────┘   │
│         ▼            ▼            ▼            ▼            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  MySQL   │ │ChromaDB  │ │ MCP Music│ │ChromaDB  │      │
│  │(Emp/Dept)│ │(handbook)│ │  Server  │ │(lore sets)│     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           LLM Factory (llm.py)                         │   │
│  │  DeepSeek │ Kimi/Moonshot │ OpenAI │ Ollama │ TongYi  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │     Image Workflow (Jimeng + Kimi Optimization)       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

| Component | Version | Purpose |
|---|---|---|
| Python | ≥ 3.12 | Backend runtime |
| Node.js | ≥ 18 | Frontend runtime |
| pnpm | Latest | Frontend package manager |
| uv | Latest | Python package manager |
| MySQL | ≥ 8.0 (or SQLite) | Data storage |
| Ollama | Latest | Local embedding model (required for RAG) |

### 1. Clone

```bash
git clone <repo-url>
cd ai-chatkit
```

### 2. Start Backend

```bash
cd backend

# Install uv (if not already installed)
pip install uv

# Install Python dependencies
uv sync --frozen

# Activate virtual environment
# Linux / macOS:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

# Configure environment (copy and edit .env)
cp .env.example .env   # See Configuration Guide below

# Start backend (default: http://localhost:8000)
python app/run_server.py
```

### 3. Deploy RAG (Optional but Recommended)

```bash
# Install Ollama and pull the bge-m3 embedding model
ollama pull bge-m3

# Import character lore (optional)
cd backend
python scripts/import_ameath_lore.py
python scripts/import_mornye_lore.py
```

### 4. Start Frontend

```bash
cd frontend

# Install dependencies
pnpm install

# Start dev server (default: http://localhost:3000)
pnpm dev
```

### 5. Open

Navigate to **http://localhost:3000/** and start chatting with AI agents.

---

## ⚙️ Configuration Guide

### Backend Environment (`backend/.env`)

<details>
<summary>📋 Full Configuration Reference (click to expand)</summary>

```properties
# ============================================================
# Database
# ============================================================
# SQLite (zero external dependencies)
DATABASE_URL=sqlite+aiosqlite:///resource/database.db
# MySQL (recommended for production)
# DATABASE_URL=mysql+aiomysql://root:password@localhost:3306/ai-chatkit

# ============================================================
# Application
# ============================================================
DEBUG=True
APP_NAME=AI ChatKit

# ============================================================
# LLM Provider (choose one)
# ============================================================

# Option A: DeepSeek (default, recommended for China)
DEEPSEEK_API_KEY=sk-your-deepseek-key
DEFAULT_MODEL=deepseek-v4-flash

# Option B: Kimi / Moonshot (vision + code)
# MOONSHOT_API_KEY=sk-your-moonshot-key
# MOONSHOT_BASE_URL=https://api.moonshot.cn/v1
# VISION_MODEL=kimi-k2.7-code
# DEFAULT_MODEL=moonshot-v1-8k

# Option C: OpenAI
# OPENAI_API_KEY=sk-your-openai-key
# OPENAI_BASE_URL=https://api.openai.com/v1
# DEFAULT_MODEL=gpt-4o-mini

# Option D: Ollama (offline-capable)
# DEFAULT_MODEL=qwen2.5:7b

# Option E: Alibaba TongYi
# DASHSCOPE_API_KEY=sk-your-dashscope-key
# DEFAULT_MODEL=qwen-plus

# ============================================================
# RAG / Embedding
# ============================================================
EMBEDDING_MODEL=bge-m3     # Requires Ollama local deployment
CHROMA_PATH=resource/chroma_db

# ============================================================
# Music Player MCP (optional)
# ============================================================
MUSIC_ENABLE_MCP=true                                   # true=real MCP, false=Mock mode
MUSIC_MCP_COMMAND=uv                                     # MCP launch command
MUSIC_MCP_SERVER_PATH=/absolute/path/to/music_mcp_server.py
MUSIC_ALLOWED_MEDIA_DOMAINS=                            # Domain allowlist (comma-separated)
MUSIC_MCP_TIMEOUT_SECONDS=15                            # Timeout in seconds

# ============================================================
# Image Generation (optional)
# ============================================================
ARK_API_KEY=ark-your-ark-key                            # Volcengine Ark API Key
JIMENG_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
JIMENG_MODEL=doubao-seedream-5-0-260128
JIMENG_DEFAULT_SIZE=2K
JIMENG_OUTPUT_FORMAT=png
JIMENG_WATERMARK=false

# Object storage for reference images (optional, needed for production)
TOS_ACCESS_KEY_ID=
TOS_SECRET_ACCESS_KEY=
TOS_ENDPOINT=
TOS_BUCKET=
TOS_PUBLIC_BASE_URL=
```

</details>

### Frontend Environment (`frontend/.env.local`)

```properties
# Backend API base URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### Switching LLM Providers

Change `DEFAULT_MODEL` and the corresponding API key in `.env`:

```bash
# Example: switch from DeepSeek to Kimi
DEFAULT_MODEL=moonshot-v1-8k
MOONSHOT_API_KEY=sk-your-key
# Comment out DEEPSEEK_API_KEY
```

---

## 📚 RAG Deployment

RAG features require **Ollama** running the `bge-m3` embedding model locally.

### Setup

```bash
# 1. Install Ollama
# macOS / Windows / Linux: https://ollama.com/download

# 2. Pull bge-m3
ollama pull bge-m3

# 3. Verify
ollama list | grep bge-m3
```

### Import Knowledge Bases

```bash
cd backend

# Import character lore (optional)
python scripts/import_ameath_lore.py
python scripts/import_mornye_lore.py
```

> 💡 **Troubleshooting**: If tools return `no result found`, check:
> 1. Is Ollama running? (`ollama list`)
> 2. Is ChromaDB path correct? (see ADR-007)
> 3. Did you restart the backend after import?

---

## 🏛️ Architecture Decision Records

This project uses **ADR (Architecture Decision Records)** to document all key technical decisions. Each ADR contains five sections: Context, Decision, Rationale, Consequences, and Evidence in Code.

| # | Decision | Summary |
|---|---|---|
| ADR-001 | Frontend/Backend Split + SSE | Next.js + FastAPI, SSE streaming chat |
| ADR-002 | LangGraph Agents | StateGraph + Supervisor multi-agent routing |
| ADR-003 | ChromaDB + Ollama RAG | Local vector DB + bge-m3 embeddings + tool-based retrieval |
| ADR-004 | Browser Local Storage | IndexedDB 4-table persistence + localStorage migration |
| ADR-005 | MCP Music Player | MCP stdio protocol + 7-point URL security validation |
| ADR-006 | Multi-Model Factory | Unified LLM factory for 5 providers + auto vision switching |
| ADR-007 | Character Agents | Independent ChromaDB lore KBs + architecture reuse pattern |
| ADR-008 | Dynamic Theme System | Agent-driven 10-color gradient palette system |
| ADR-009 | Image Generation Pipeline | Jimeng 3-mode generation + Kimi prompt optimization + graceful degradation |

> 📂 Full documents: [docs/DECISIONS/](docs/DECISIONS/)

---

## ⚠️ Technical Debt

**6 items identified** — see [docs/TECHDEBT.md](docs/TECHDEBT.md) for details:

| # | Item | Risk | Replacement Trigger |
|---|---|---|---|
| 1 | Chat history in browser IndexedDB | Medium | Server-side persistence or cross-device sync required |
| 2 | SSE parsing is line-based, fragile on chunk boundaries | Medium | Streaming throughput increases |
| 3 | Multi-agent sub-traces hidden from frontend | Low | Operator-facing trace inspection needed |
| 4 | CORS wide open | High | Deploy to public or shared environment |
| 5 | Embedding depends on local Ollama | Medium | Embeddings must be hosted remotely |
| 6 | Department route naming inconsistency | Low | API surface normalization |

> 💡 Each item is revisited when one of four triggers fires: related file changes / feature goes beyond demo use / regression test added / deployment moves to production.

---

## 📄 Related Documents

| Document | Description |
|---|---|
| [SCOPE.md](docs/SCOPE.md) | Project scope boundaries & hard constraints |
| [GLOSSARY.md](docs/GLOSSARY.md) | 18 core terms → code file mappings |
| [TECHDEBT.md](docs/TECHDEBT.md) | Technical debt tracking |
| [DECISIONS/](docs/DECISIONS/) | 9 Architecture Decision Records |
| [MUSIC_PLAYER_MCP_TECHNICAL.md](docs/MUSIC_PLAYER_MCP_TECHNICAL.md) | Music player technical details |
| [AMEATH_AGENT_IMPLEMENTATION.md](docs/AMEATH_AGENT_IMPLEMENTATION.md) | Ameath agent implementation record |
| [ROLE_STYLE_THEME_SWITCH.md](docs/ROLE_STYLE_THEME_SWITCH.md) | Role theme switching design |

---

## 📝 License

MIT
