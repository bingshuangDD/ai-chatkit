<h1 align="center">🤖 AI-CHATKIT</h1>
<p align="center">
  <a href="./README.md" target="_Self">English</a>
  |
  <strong style="background-color: green; color: white; padding: 2px 8px; border-radius: 4px;">中文</strong>
</p>

<p align="center">
  <strong>面向企业 AI Chat 场景的全栈智能体模板</strong>
</p>

<p align="center">
  基于 <strong>LangGraph + FastAPI + Next.js + ChromaDB</strong> 构建，集成多 Agent 协作、RAG 检索、<br>
  MCP 外部服务、图像生成与动态主题，开箱即用。
</p>

<p align="center">
  <img src="./pictures/chat_img.png" width="700" alt="OA 助手聊天界面"/>
</p>

<details>
<summary>📸 多智能体协作界面</summary>
<p align="center">
  <img src="./pictures/chat_multi_agent_img.png" width="700" alt="多智能体协作界面"/>
</p>
</details>

---

## 📋 目录

- [特性](#-特性)
- [智能体矩阵](#-智能体矩阵)
- [项目结构](#-项目结构)
- [技术架构](#-技术架构)
- [快速开始](#-快速开始)
- [配置指南](#-配置指南)
- [RAG 部署](#-rag-部署)
- [架构决策记录](#-架构决策记录)
- [技术债务](#-技术债务)

---

## ✨ 特性

### 核心能力

| 维度 | 能力 |
|---|---|
| 🧠 **Agent 编排** | 基于 LangGraph StateGraph 的 ReAct 循环，支持条件路由、工具调用、检查点恢复 |
| 🤝 **多 Agent 协作** | Supervisor 模式——主管 Agent 自动将任务路由到数学/编程/通用三个子 Agent |
| 🎭 **角色扮演** | 2 个预制角色智能体（爱弥斯/莫宁），独立 ChromaDB 知识库 + 个性化系统提示词 |
| 📚 **RAG 检索增强** | ChromaDB 向量存储 + Ollama bge-m3 嵌入模型，支持员工手册与角色知识库语义搜索 |
| 🎵 **音乐播放器** | 基于 MCP 协议接入网易云音乐，自然语言点歌 → 安全校验 → 前端播放器全链路 |
| 🎨 **AI 图像生成** | 接入即梦 (DreamSeed) API，支持文生图/图生图/多图融合 + Kimi 提示词自动优化 |
| 🌊 **SSE 流式输出** | 逐 token 渐进渲染，`token`/`message`/`player_command`/`error`/`end` 五种事件类型 |
| 🎨 **动态主题** | Agent 驱动的 UI 主题切换，4 套独立调色板 + 渐变过渡动画 |
| 💾 **IndexedDB 持久化** | 会话/消息/资源/待处理消息四表存储，图片等二进制资源本地存取 |

### 工程化

| 维度 | 能力 |
|---|---|
| 🔄 **多模型兼容** | 统一 LLM 工厂支持 DeepSeek / Kimi / OpenAI / Ollama / TongYi，模型切换仅需 1 行配置 |
| 🖼️ **视觉模型自动切换** | 检测到图片上传时，自动从文本模型切换到视觉模型（kimi-k2.7-code） |
| 🛡️ **安全防线** | 音乐 URL 7 项安全校验（HTTPS 强制、私有 IP 拦截、域名白名单、过期校验等） |
| 🔻 **优雅降级** | 3 条降级路径——MCP 不可用 → mock、Ollama 不可用 → 错误提示、提示词优化失败 → 原始输入 |
| 📝 **ADR 决策记录** | 9 份五段式架构决策文档，覆盖全部关键技术选型 |
| 🗂️ **术语表** | 18 个核心术语 → 代码文件的精确映射 |
| ⚠️ **技术债务追踪** | 6 条已识别的技术债务，每条标注触发替换的条件 |

---

## 🤖 智能体矩阵

| Agent ID | 类型 | 描述 | 工具数 | 特性 |
|---|---|---|---|---|
| `oa-assistant` | 企业助手 | 员工查询 / 部门查询 / 手册检索 / 音乐控制 | 7 | 默认 Agent，中文回复，拒绝编造 |
| `multi-agent-supervisor` | 多智能体协作 | Supervisor 路由到数学/编程/通用 3 个子 Agent | 3 个子 Agent 各自独立 | 子 Agent 内部 Trace 对前端透明 |
| `character-ameath` | 角色扮演 | 爱弥斯——拥有完整背景故事和个性的角色智能体 | 8 | 独立 lore 知识库（21 个语义块） |
| `character-mornye` | 角色扮演 | 莫宁——拥有完整背景故事和个性的角色智能体 | 8 | 独立 lore 知识库 |

> **新增 Agent 只需 3 步**：编写 Agent 文件 → 注册到 `agents.py` → 添加前端选择器选项。

---

## 📁 项目结构

```
ai-chatkit/
├── README.md                         # English README
├── README_zh.md                      # 中文 README（本文件）
├── docs/                             # 📖 项目文档
│   ├── SCOPE.md                      #   项目范围与硬性约束
│   ├── GLOSSARY.md                   #   术语表（18 个核心术语）
│   ├── TECHDEBT.md                   #   技术债务追踪（6 条）
│   ├── MUSIC_PLAYER_MCP_TECHNICAL.md #   音乐播放器技术说明
│   ├── AMEATH_AGENT_IMPLEMENTATION.md#   爱弥斯角色 Agent 实现记录
│   ├── ROLE_STYLE_THEME_SWITCH.md    #   角色主题切换方案
│   ├── FRONTEND_ROLE_THEME_SWITCH_IMPLEMENTATION.md
│   └── DECISIONS/                    # 🏛️ 架构决策记录（9 份 ADR）
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
├── backend/                          # 🐍 FastAPI 后端
│   ├── .env                          #   环境变量配置
│   ├── pyproject.toml                #   Python 依赖（uv 管理）
│   ├── app/
│   │   ├── main.py                   #   FastAPI 入口 + CORS + 路由挂载
│   │   ├── run_server.py             #   Uvicorn 启动脚本
│   │   ├── core/
│   │   │   └── config.py             #   Pydantic Settings 配置中心
│   │   ├── ai/
│   │   │   ├── llm.py                #   LLM 工厂函数（5 个提供商）
│   │   │   ├── models.py             #   模型名称枚举
│   │   │   ├── agent/
│   │   │   │   ├── agents.py         #   智能体中央注册表
│   │   │   │   ├── oa_assistant.py   #   OA 助手 Agent
│   │   │   │   ├── multi_agent.py    #   Supervisor 多 Agent
│   │   │   │   ├── Ameath.py         #   爱弥斯角色 Agent
│   │   │   │   └── Mornye.py         #   莫宁角色 Agent
│   │   │   ├── rag/
│   │   │   │   └── chromaClient.py   #   ChromaDB 客户端 + 集合管理
│   │   │   └── tools/
│   │   │       ├── oa_tools.py       #   OA 工具（员工/部门/手册检索）
│   │   │       └── music_tools.py    #   音乐工具（播放/暂停/恢复/停止）
│   │   ├── api/
│   │   │   ├── chat_routes.py        #   /chat/invoke + /chat/stream (SSE)
│   │   │   ├── employee_routers.py   #   员工 CRUD API
│   │   │   ├── department_routers.py #   部门 CRUD API
│   │   │   ├── image_workflow_routes.py # 图像生成 API
│   │   │   └── schema/
│   │   │       └── chatSchema.py     #   Pydantic 请求/响应模型
│   │   ├── db/
│   │   │   ├── database.py           #   异步 SQLAlchemy 引擎
│   │   │   ├── models/               #   SQLModel 数据模型
│   │   │   └── repository/           #   Repository 数据访问层
│   │   ├── music/                    #   音乐播放器子系统
│   │   │   ├── service.py            #     业务编排
│   │   │   ├── mcp_client.py         #     MCP 客户端（含 mock 模式）
│   │   │   ├── security.py           #     URL 安全校验（7 项检查）
│   │   │   └── schemas.py            #     数据类定义
│   │   ├── image_workflows/          #   图像生成子系统
│   │   │   ├── service.py            #     流水线编排
│   │   │   ├── jimeng_client.py      #     即梦 API 封装
│   │   │   ├── kimi_prompt_builder.py#     Kimi 提示词优化
│   │   │   └── image_staging.py      #     参考图暂存
│   │   └── utils/
│   │       └── chat_utils.py         #   LangChain 消息转换
│   ├── mcp_servers/
│   │   └── music_mcp_server.py       #   MCP stdio 音乐服务
│   ├── resource/
│   │   ├── chroma_db/                #   ChromaDB 持久化数据
│   │   └── EmployeeHandbook.pdf      #   员工手册源文件
│   └── scripts/
│       ├── import_ameath_lore.py      #   爱弥斯知识库导入
│       └── import_mornye_lore.py      #   莫宁知识库导入
│
├── frontend/                         # ⚛️ Next.js 前端
│   ├── .env.local                    #   前端环境变量
│   ├── package.json                  #   Node 依赖
│   ├── tailwind.config.ts            #   Tailwind CSS 配置
│   └── app/
│       ├── layout.tsx                #   根布局（LayoutContext + PlayerProvider）
│       ├── globals.css               #   全局样式 + 主题过渡动画
│       ├── chat/
│       │   ├── [threadId]/page.tsx   #   动态线程路由
│       │   ├── components/
│       │   │   ├── ChatComponent.tsx  #   聊天主组件
│       │   │   ├── MessageBubble.tsx  #   消息气泡渲染
│       │   │   ├── MessageInput.tsx   #   输入框 + 图片上传 + 生图触发
│       │   │   └── ImageGenerationConfirm.tsx  # 生图确认模态框
│       │   ├── hooks/
│       │   │   ├── useStreamChat.ts  #   SSE 流式处理核心 Hook
│       │   │   ├── useChatActions.ts #   聊天动作 Hook
│       │   │   └── useScrollToBottom.ts  # 自动滚动
│       │   ├── storage/              #   IndexedDB 持久化层
│       │   │   ├── db.ts             #     IDB 连接管理
│       │   │   ├── schema.ts         #     IDB Schema 定义
│       │   │   ├── repositories/     #     Repository 模式
│       │   │   │   ├── sessionRepository.ts
│       │   │   │   ├── messageRepository.ts
│       │   │   │   ├── assetRepository.ts
│       │   │   │   └── pendingMessageRepository.ts
│       │   │   ├── migrations/
│       │   │   │   └── localStorageMigration.ts  # localStorage → IDB
│       │   │   └── utils/dataUrl.ts
│       │   ├── types/chat.types.ts   #   消息类型定义
│       │   └── workflows/            #   图像生成前端调用
│       ├── components/
│       │   ├── AgentSelector.tsx      #   智能体选择器
│       │   ├── SiderComponent.tsx     #   侧边栏导航
│       │   ├── SessionListItem.tsx    #   会话列表项
│       │   └── NewChatButton.tsx      #   新建聊天按钮
│       ├── config/
│       │   ├── agentConfig.ts         #   智能体头像/颜色配置
│       │   └── agentThemeConfig.ts    #   智能体主题调色板
│       └── player/                    #   音频播放器子系统
│           ├── PlayerContext.tsx      #     播放器状态管理
│           ├── GlobalPlayer.tsx       #     全局播放器 UI
│           └── types.ts              #     播放器类型定义
│
└── pictures/                         # 📸 截图资源
    ├── chat_img.png
    └── chat_multi_agent_img.png
```

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js 14)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ChatComponent│ │AgentSel.│ │GlobalPlayer│ │IndexedDB (4表)│  │
│  └─────┬────┘ └────┬─────┘ └─────┬─────┘ └───────┬───────┘  │
│        │           │             │               │           │
│        │   SSE Stream (fetch + ReadableStream)    │           │
│        │   POST /chat/stream                     │           │
├────────┼───────────┼─────────────┼───────────────┼───────────┤
│        ▼           ▼             ▼               │           │
│                    Backend (FastAPI + Uvicorn)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  /chat/stream (SSE)                    │   │
│  │  token │ message │ player_command │ error │ end      │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              LangGraph Agent (agents.py)               │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐  │   │
│  │  │oa-assist.│ │multi-agent│ │character │ │character│  │   │
│  │  │          │ │supervisor│ │ -ameath  │ │ -mornye │  │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬────┘  │   │
│  └───────┼────────────┼────────────┼────────────┼───────┘   │
│          │            │            │            │            │
│          ▼            ▼            ▼            ▼            │
│  ┌─────────────────── ToolNode ────────────────────────┐   │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │   │
│  │ │员工/部门 │ │手册RAG   │ │音乐播放  │ │角色Lore│  │   │
│  │ │ 查询     │ │检索      │ │控制      │ │ 检索   │  │   │
│  │ └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘  │   │
│  └──────┼────────────┼────────────┼────────────┼───────┘   │
│         ▼            ▼            ▼            ▼            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  MySQL   │ │ChromaDB  │ │ MCP Music│ │ChromaDB  │      │
│  │(员工/部门)│ │(handbook)│ │  Server  │ │(lore集合)│      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              LLM Factory (llm.py)                      │   │
│  │  DeepSeek │ Kimi/Moonshot │ OpenAI │ Ollama │ TongYi  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Image Workflow (即梦 + Kimi 优化)             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 快速开始

### 前置要求

| 组件 | 版本 | 用途 |
|---|---|---|
| Python | ≥ 3.12 | 后端运行环境 |
| Node.js | ≥ 18 | 前端运行环境 |
| pnpm | 最新版 | 前端依赖管理 |
| uv | 最新版 | Python 依赖管理 |
| MySQL | ≥ 8.0（或 SQLite） | 数据存储 |
| Ollama | 最新版 | 本地 Embedding 模型（RAG 必需） |

### 1. 克隆项目

```bash
git clone <repo-url>
cd ai-chatkit
```

### 2. 启动后端

```bash
cd backend

# 安装 uv 工具（如未安装）
pip install uv

# 安装 Python 依赖
uv sync --frozen

# 激活虚拟环境
# Linux / macOS:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

# 配置环境变量（复制并修改 .env）
cp .env.example .env   # 参考下方配置指南

# 启动后端服务（默认 http://localhost:8000）
python app/run_server.py
```

### 3. 部署 RAG（可选但推荐）

```bash
# 安装 Ollama 并拉取 bge-m3 嵌入模型
ollama pull bge-m3

# 导入角色知识库（可选）
cd backend
python scripts/import_ameath_lore.py
python scripts/import_mornye_lore.py
```

### 4. 启动前端

```bash
cd frontend

# 安装依赖
pnpm install

# 启动开发服务器（默认 http://localhost:3000）
pnpm dev
```

### 5. 访问应用

浏览器打开 **http://localhost:3000/**，开始与 AI Agent 对话。

---

## ⚙️ 配置指南

### 后端环境变量 (`backend/.env`)

<details>
<summary>📋 完整配置项说明（点击展开）</summary>

```properties
# ============================================================
# 数据库配置
# ============================================================
# SQLite（无需额外安装数据库）
DATABASE_URL=sqlite+aiosqlite:///resource/database.db
# MySQL（生产环境推荐）
# DATABASE_URL=mysql+aiomysql://root:password@localhost:3306/ai-chatkit

# ============================================================
# 应用配置
# ============================================================
DEBUG=True
APP_NAME=AI ChatKit

# ============================================================
# LLM 模型配置（选择其一即可）
# ============================================================

# 方案 A：DeepSeek（默认，国内推荐）
DEEPSEEK_API_KEY=sk-your-deepseek-key
DEFAULT_MODEL=deepseek-v4-flash

# 方案 B：Kimi / Moonshot（支持视觉 + 代码）
# MOONSHOT_API_KEY=sk-your-moonshot-key
# MOONSHOT_BASE_URL=https://api.moonshot.cn/v1
# VISION_MODEL=kimi-k2.7-code
# DEFAULT_MODEL=moonshot-v1-8k

# 方案 C：OpenAI
# OPENAI_API_KEY=sk-your-openai-key
# OPENAI_BASE_URL=https://api.openai.com/v1
# DEFAULT_MODEL=gpt-4o-mini

# 方案 D：Ollama 本地模型（离线可用）
# DEFAULT_MODEL=qwen2.5:7b

# 方案 E：阿里云 TongYi
# DASHSCOPE_API_KEY=sk-your-dashscope-key
# DEFAULT_MODEL=qwen-plus

# ============================================================
# RAG / Embedding 配置
# ============================================================
EMBEDDING_MODEL=bge-m3     # 需通过 Ollama 本地部署
CHROMA_PATH=resource/chroma_db

# ============================================================
# 音乐播放器 MCP 配置（可选）
# ============================================================
MUSIC_ENABLE_MCP=true                                   # true=真实MCP, false=Mock模式
MUSIC_MCP_COMMAND=uv                                     # MCP 启动命令
MUSIC_MCP_SERVER_PATH=D:/path/to/music_mcp_server.py    # MCP Server 绝对路径
MUSIC_ALLOWED_MEDIA_DOMAINS=                            # 域名白名单（逗号分隔，留空不限制）
MUSIC_MCP_TIMEOUT_SECONDS=15                            # 超时时间

# ============================================================
# 图像生成配置（可选）
# ============================================================
ARK_API_KEY=ark-your-ark-key                            # 火山方舟 API Key
JIMENG_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
JIMENG_MODEL=doubao-seedream-5-0-260128
JIMENG_DEFAULT_SIZE=2K                                   # 输出尺寸
JIMENG_OUTPUT_FORMAT=png                                 # 输出格式
JIMENG_WATERMARK=false                                   # 是否添加水印

# 参考图对象存储（可选，生产环境需要）
TOS_ACCESS_KEY_ID=
TOS_SECRET_ACCESS_KEY=
TOS_ENDPOINT=
TOS_BUCKET=
TOS_PUBLIC_BASE_URL=
```

</details>

### 前端环境变量 (`frontend/.env.local`)

```properties
# 后端 API 地址
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### 模型切换

更换 LLM 提供商只需修改 `.env` 中的 `DEFAULT_MODEL` 和对应的 API Key，例如：

```bash
# 从 DeepSeek 切换到 Kimi
DEFAULT_MODEL=moonshot-v1-8k
MOONSHOT_API_KEY=sk-your-key
# 注释掉 DEEPSEEK_API_KEY
```

---

## 📚 RAG 部署

RAG 功能依赖 **Ollama** 本地运行 `bge-m3` 嵌入模型。

### 安装与启动

```bash
# 1. 安装 Ollama
# macOS / Windows / Linux: https://ollama.com/download

# 2. 拉取 bge-m3 模型
ollama pull bge-m3

# 3. 验证模型可用
ollama list | grep bge-m3
```

### 知识库导入

```bash
cd backend

# 导入角色知识库（可选）
.venv\Scripts\python scripts/import_ameath_lore.py   # Windows
python scripts/import_ameath_lore.py                   # Linux/macOS
```

> 💡 **故障排查**：若工具返回 `no result found`，请检查：
> 1. Ollama 是否正在运行（`ollama list`）
> 2. ChromaDB 路径是否正确（见 ADR-007）
> 3. 导入后是否重启了后端服务

---

## 🏛️ 架构决策记录

本项目采用 **ADR（Architecture Decision Record）** 制度记录所有关键技术决策。每份 ADR 包含背景、决策、理由、后果和代码证据五段。

| 编号 | 决策 | 核心内容 |
|---|---|---|
| ADR-001 | 前后端分离 + SSE | Next.js + FastAPI，SSE 流式聊天 |
| ADR-002 | LangGraph Agent | StateGraph + Supervisor 多智能体路由 |
| ADR-003 | ChromaDB + Ollama RAG | 本地向量库 + bge-m3 嵌入 + 工具化检索 |
| ADR-004 | 浏览器本地存储 | IndexedDB 四表持久化 + localStorage 迁移 |
| ADR-005 | MCP 音乐播放器 | MCP stdio 协议 + 7 项 URL 安全校验 |
| ADR-006 | 多模型工厂 | 统一 LLM 工厂支持 5 个提供商 + 视觉模型自动切换 |
| ADR-007 | 角色智能体 | 独立 ChromaDB 知识库 + 架构复用策略 |
| ADR-008 | 动态主题系统 | Agent 驱动 10 色渐变调色板 |
| ADR-009 | 图像生成流水线 | 即梦三模式 + Kimi 提示词优化 + 优雅降级 |

> 📂 完整文档：[docs/DECISIONS/](docs/DECISIONS/)

---

## ⚠️ 技术债务

当前已识别 **6 条技术债务**，详见 [docs/TECHDEBT.md](docs/TECHDEBT.md)：

| # | 债务项 | 风险等级 | 触发替换条件 |
|---|---|---|---|
| 1 | 聊天记录存浏览器 IndexedDB | 中 | 需要服务端持久化或跨设备同步 |
| 2 | SSE 解析为行级，跨 chunk 脆弱 | 中 | 流式吞吐量增长 |
| 3 | 多 Agent 子 Trace 前端不可见 | 低 | 需要运维级 Trace 查看 |
| 4 | CORS 全开 | 高 | 部署到公网或共享环境 |
| 5 | Embedding 依赖 Ollama 本地 | 中 | 嵌入服务需要远端托管 |
| 6 | Department 路由命名不一致 | 低 | API 规范化治理 |

> 💡 每条债务在以下四种场景之一发生时强制复盘：关联文件修改 / 功能超越 Demo 用途 / 新增回归测试 / 从本地部署迁移到生产环境。

---

## 📄 相关文档

| 文档 | 说明 |
|---|---|
| [SCOPE.md](docs/SCOPE.md) | 项目范围边界与硬性约束 |
| [GLOSSARY.md](docs/GLOSSARY.md) | 18 个核心术语 → 代码映射 |
| [TECHDEBT.md](docs/TECHDEBT.md) | 技术债务追踪 |
| [DECISIONS/](docs/DECISIONS/) | 9 份架构决策记录 |
| [MUSIC_PLAYER_MCP_TECHNICAL.md](docs/MUSIC_PLAYER_MCP_TECHNICAL.md) | 音乐播放器技术细节 |
| [AMEATH_AGENT_IMPLEMENTATION.md](docs/AMEATH_AGENT_IMPLEMENTATION.md) | 爱弥斯角色实现记录 |
| [ROLE_STYLE_THEME_SWITCH.md](docs/ROLE_STYLE_THEME_SWITCH.md) | 角色主题切换方案 |

---

## 📝 License

MIT
