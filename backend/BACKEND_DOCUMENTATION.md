# AI ChatKit 后端技术说明与使用手册

> **版本**: 0.1.0 | **Python**: >= 3.13 | **框架**: FastAPI + LangChain/LangGraph | **日期**: 2026-06-07

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈](#2-技术栈)
3. [项目结构](#3-项目结构)
4. [核心架构](#4-核心架构)
5. [配置系统](#5-配置系统)
6. [AI 模型模块](#6-ai-模型模块)
7. [智能体 (Agent) 系统](#7-智能体-agent-系统)
8. [RAG 知识库模块](#8-rag-知识库模块)
9. [数据库模块](#9-数据库模块)
10. [API 接口文档](#10-api-接口文档)
11. [部署与运行](#11-部署与运行)
12. [开发指南](#12-开发指南)
13. [测试说明](#13-测试说明)
14. [常见问题 (FAQ)](#14-常见问题-faq)

---

## 1. 项目概述

AI ChatKit 是一个**企业级智能 OA 助手系统**的后端服务。它基于 LangChain/LangGraph 构建了多智能体协作框架，支持多种大语言模型（DeepSeek、OpenAI、Ollama 本地模型、通义千问），并集成了 RAG（检索增强生成）能力，可以通过向量检索企业知识库来回答员工问题。

### 核心功能

| 功能模块 | 说明 |
|---------|------|
| **多模型支持** | DeepSeek / OpenAI / Ollama / 通义千问 / Fake 测试模型 |
| **多智能体** | OA 助手（查员工/部门/规章制度）+ Supervisor 多智能体协作 |
| **RAG 知识库** | ChromaDB 向量数据库 + bge-m3 嵌入模型，支持员工手册检索 |
| **流式对话** | 基于 SSE (Server-Sent Events) 的实时流式对话 |
| **多轮对话** | 基于 thread_id 的对话持久化，支持中断/恢复 |
| **RESTful API** | 完整的员工/部门 CRUD 接口 |
| **异步架构** | 全异步 FastAPI + 异步数据库操作 |

### 适用场景

- 企业 OA 智能问答（查员工信息、部门信息、公司制度）
- 多领域智能客服（数学/编程/通用问题分流处理）
- 企业内部知识库 RAG 检索
- 作为 AI 聊天机器人后端，对接任意前端 UI

---

## 2. 技术栈

### 核心依赖

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **Web 框架** | FastAPI | >=0.115.12 | REST API + WebSocket/SSE 支持 |
| **ASGI 服务器** | Uvicorn | >=0.34.2 | 生产级异步服务器 |
| **ORM** | SQLModel | >=0.0.24 | 数据库模型与查询 |
| **异步数据库驱动** | aiomysql | >=0.2.0 | MySQL 异步连接 |
| | aiosqlite | >=0.21.0 | SQLite 异步连接（开发环境） |
| **AI 框架** | LangChain | >=0.3.25 | LLM 应用开发框架 |
| | LangGraph | >=0.5.0 | 有状态多步骤 AI Agent |
| | LangGraph-Supervisor | >=0.0.27 | 多智能体监督者模式 |
| **模型接入** | langchain-deepseek | >=0.1.3 | DeepSeek 模型集成 |
| | langchain-openai | >=0.3.17 | OpenAI 模型集成 |
| | langchain-ollama | >=0.3.3 | Ollama 本地模型集成 |
| | dashscope | >=1.24.2 | 阿里通义千问模型 |
| **向量数据库** | ChromaDB | >=0.6.3 | RAG 向量存储 |
| | langchain-chroma | >=0.2.3 | ChromaDB 的 LangChain 封装 |
| **配置管理** | pydantic-settings | >=2.9.1 | 环境变量与配置管理 |
| **文档处理** | pypdf | >=5.6.0 | PDF 文档解析（RAG 数据导入） |

### 模型支持列表

| 提供商 | 模型标识符 | API 模型名 | 说明 |
|--------|-----------|-----------|------|
| **DeepSeek** | `deepseek-chat` | deepseek-chat | DeepSeek 通用对话 |
| | `deepseek-v4-flash` | deepseek-chat | DeepSeek V4 Flash（快速版） |
| **OpenAI** | `gpt-4o-mini` | gpt-4o-mini | OpenAI 轻量级 |
| | `gpt-4o` | gpt-4o | OpenAI 旗舰版 |
| **Ollama** | `ollama` | 由 `OLLAMA_MODEL` 配置 | 本地部署模型 |
| **通义千问** | `qwen-plus` | qwen-plus | 阿里通义千问 Plus |
| | `qwen-max` | qwen-max | 阿里通义千问 Max |
| **测试** | `fake` | - | 假模型，返回固定响应（测试用） |

---

## 3. 项目结构

```
backend/
├── app/                          # 应用主目录
│   ├── __init__.py
│   ├── main.py                   # FastAPI 应用入口
│   ├── run_server.py             # 服务器启动脚本
│   │
│   ├── core/                     # 核心配置
│   │   ├── __init__.py
│   │   └── config.py             # 配置类（Settings）
│   │
│   ├── ai/                       # AI 模块
│   │   ├── llm.py                # 模型工厂（获取 LLM 实例）
│   │   ├── models.py             # 模型名称枚举定义
│   │   │
│   │   ├── agent/                # 智能体 (Agent)
│   │   │   ├── agents.py         # Agent 注册表
│   │   │   ├── oa_assistant.py   # OA 助手 Agent（LangGraph 状态图）
│   │   │   └── multi_agent.py    # 多智能体监督者 (Supervisor)
│   │   │
│   │   ├── rag/                  # RAG 检索增强
│   │   │   └── chromaClient.py   # ChromaDB 客户端与向量存储
│   │   │
│   │   └── tools/                # Agent 工具
│   │       └── oa_tools.py       # OA 业务工具函数
│   │
│   ├── api/                      # API 路由层
│   │   ├── __init__.py
│   │   ├── chat_routes.py        # 对话接口（/chat）
│   │   ├── department_routers.py # 部门 CRUD 接口
│   │   ├── employee_routers.py   # 员工 CRUD 接口
│   │   ├── services.py           # 业务逻辑层
│   │   ├── schemas.py            # 通用数据模型
│   │   └── schema/
│   │       └── chatSchema.py     # 对话相关 Pydantic 模型
│   │
│   ├── db/                       # 数据库模块
│   │   ├── __init__.py           # 旧版 SQLite 同步引擎（遗留）
│   │   ├── database.py           # 异步数据库引擎与会话管理
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── base.py           # 基础模型（含时间戳）
│   │   │   ├── department.py     # 部门表模型
│   │   │   └── employee.py       # 员工表模型
│   │   └── repository/
│   │       ├── __init__.py
│   │       ├── department_repo.py # 部门数据访问层
│   │       └── employee_repo.py   # 员工数据访问层
│   │
│   └── utils/                    # 工具模块
│       └── chat_utils.py         # 消息格式转换工具
│
├── resource/                     # 资源文件
│   └── chroma_db/                # ChromaDB 持久化数据
│
├── tests/                        # 测试目录
│   ├── __init__.py
│   ├── db/
│   │   └── SqlModelTest.py       # 数据库模型测试
│   └── rag/
│       ├── importRag.py          # RAG 数据导入脚本
│       └── queryChroma.py        # ChromaDB 查询测试
│
├── .env                          # 环境变量配置（需要自行创建）
├── .env.example                  # 环境变量模板
├── .gitignore
├── .python-version               # Python 版本声明
├── pyproject.toml                # 项目依赖与元数据
└── uv.lock                       # 依赖锁定文件
```

---

## 4. 核心架构

### 4.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                       前端 (React/Vue/...)                    │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/SSE
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Application                      │
│                       (main.py)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Chat Routes  │  │Employee Routes│  │Department Routes │   │
│  │  /chat/*      │  │ /employee/*  │  │  /department/*   │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                 │                     │            │
│         ▼                 ▼                     ▼            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   Repository 层                        │   │
│  │   EmployeeRepository / DepartmentRepository           │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              SQLModel (ORM) + AsyncSession             │   │
│  └──────────────────────┬───────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │    MySQL / SQLite      │
              └───────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      AI Agent 层                              │
│                                                              │
│  ┌──────────────────┐    ┌─────────────────────────────┐    │
│  │   OA Assistant    │    │   Multi-Agent Supervisor    │    │
│  │  (LangGraph)      │    │   (langgraph-supervisor)    │    │
│  │                   │    │                             │    │
│  │  ┌─────────────┐  │    │  ┌──────────┐ ┌──────────┐ │    │
│  │  │ call_model  │  │    │  │math_agent│ │code_agent│ │    │
│  │  └──────┬──────┘  │    │  └──────────┘ └──────────┘ │    │
│  │         │         │    │  ┌──────────────┐           │    │
│  │    ┌────▼─────┐   │    │  │general_agent │           │    │
│  │    │pending?  │   │    │  └──────────────┘           │    │
│  │    └──────────┘   │    └─────────────────────────────┘    │
│  │    done │ tools   │                                       │
│  │    ┌────▼─────┐   │                                       │
│  │    │ ToolNode  │   │     ┌─────────────────────────┐     │
│  │    │ (3 tools) │   │     │     LLM Factory          │     │
│  │    └──────────┘   │     │  (get_model function)     │     │
│  └──────────────────┘     │  DeepSeek | OpenAI |      │     │
│                            │  Ollama | TongYi | Fake   │     │
│  ┌──────────────────┐     └─────────────────────────┘     │
│  │  RAG Module       │                                      │
│  │  ┌────────────┐  │                                       │
│  │  │ ChromaDB   │  │                                       │
│  │  │ + bge-m3   │  │                                       │
│  │  └────────────┘  │                                       │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 请求处理流程

#### 对话请求流程 (`POST /chat/stream`)

```
1. 客户端发送 StreamInput
       │
2. _handle_input() 解析输入
   ├── 生成 run_id (UUID)
   ├── 解析 thread_id (多轮对话持久化)
   ├── 合并 agent_config 到 RunnableConfig
   └── 检测中断 (interrupt) 是否需要恢复
       │
3. get_agent(agent_id) 获取 Agent
   ├── "oa-assistant" → oa_assistant (LangGraph StateGraph)
   └── "multi-agent-supervisor" → supervisor_agent
       │
4. agent.astream() 流式生成
   ├── stream_mode="updates" → 节点输出（supervisor 路由等）
   ├── stream_mode="messages" → LLM token 流
   └── stream_mode="custom" → 自定义事件
       │
5. message_generator() 处理事件
   ├── 过滤中间节点输出（math_agent/code_agent 内部推理不暴露）
   ├── 只保留 supervisor 最终回复
   ├── 提取 AIMessageChunk → SSE token 事件
   └── 序列化为 JSON → yield SSE 格式
       │
6. 客户端接收 SSE 事件流
   ├── {"type": "token", "content": "..."}
   ├── {"type": "message", "content": {...}}
   └── {"type": "end"}
```

#### 非流式对话请求流程 (`POST /chat/invoke`)

```
1. 客户端发送 UserInput
       │
2. _handle_input() 解析（同上）
       │
3. agent.ainvoke() 同步调用
   ├── 返回 [(response_type, response)]
   │   ├── "values" → 正常完成，取最后一条消息
   │   └── "updates" + __interrupt__ → Agent 中断，返回中断信息
       │
4. 返回 ChatMessage (JSON)
```

### 4.3 数据流与状态管理

```
┌─────────────┐     HumanMessage     ┌───────────────┐
│   用户输入    │ ──────────────────▶  │  Agent State   │
└─────────────┘                      │  (MessagesState)│
                                     └───────┬───────┘
                                             │
                              ┌──────────────┼──────────────┐
                              │              │              │
                              ▼              ▼              ▼
                        ┌─────────┐   ┌──────────┐   ┌─────────┐
                        │  model   │──▶│ tools?    │──▶│  tools   │
                        │  (LLM)   │   │ condition │   │  (执行)  │
                        └─────────┘   └──────────┘   └─────────┘
                              │           │  done          │
                              │           ▼                │
                              │       ┌──────┐             │
                              │       │ END  │             │
                              │       └──────┘             │
                              │                            │
                              └────────── 循环 ─────────────┘
```

---

## 5. 配置系统

### 5.1 配置文件 (`.env`)

项目使用 `.env` 文件管理配置，基于 `pydantic-settings` 自动加载。

**位置**: [backend/.env](.env)

**完整配置项说明**:

```env
# ==================== 数据库配置 ====================

# SQLite (开发环境推荐)
# DATABASE_URL=sqlite+aiosqlite:///resource/database.db

# MySQL (生产环境)
DATABASE_URL=mysql+aiomysql://root:root@localhost/ai-chatkit

# ==================== 应用配置 ====================
DEBUG=True                          # 调试模式
APP_NAME=AI ChatKit                 # 应用名称

# ==================== 模型配置 ====================

# --- OpenAI ---
# OPENAI_BASE_URL=
# OPENAI_API_KEY=
# DEFAULT_MODEL=gpt-4o-mini

# --- DashScope (通义千问) ---
# DASHSCOPE_API_KEY=
# DEFAULT_MODEL=qwen-plus

# --- DeepSeek (当前使用) ---
DEEPSEEK_API_KEY=sk-xxxx            # DeepSeek API 密钥
DEFAULT_MODEL=deepseek-v4-flash     # 默认模型

# ==================== 嵌入模型配置 ====================

# bge-m3 嵌入模型（中英文双语），需要 Ollama 本地部署
EMBEDDING_MODEL=bge-m3

# ==================== 向量数据库配置 ====================

# ChromaDB 持久化存储路径（相对路径）
CHROMA_PATH=resource/chroma_db
```

### 5.2 配置类代码 (`core/config.py`)

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=find_dotenv(),       # 自动查找 .env 文件
        env_file_encoding="utf-8",
        env_ignore_empty=True,        # 忽略空值
        extra="ignore",               # 忽略未定义的额外字段
        validate_default=False,
    )

    APP_NAME: str = "AI ChatKit"
    DEBUG: bool = True
    DATABASE_URL: str | None = None
    HOST: str = "127.0.0.1"           # 服务器监听地址
    PORT: int = 8000                  # 服务器端口
    DEV: bool = True                  # 开发模式（启用热重载）

    DEEPSEEK_API_KEY: str | None = None
    OLLAMA_BASE_URL: str | None = None
    OLLAMA_MODEL: str | None = None
    DEFAULT_MODEL: str | None = None
    EMBEDDING_MODEL: str | None = None
    CHROMA_PATH: str | None = None

    def is_dev(self) -> bool:
        return self.DEV
```

---

## 6. AI 模型模块

### 6.1 模型名称定义 (`ai/models.py`)

文件 [ai/models.py](app/ai/models.py) 定义了所有支持的模型枚举：

```python
class OpenAIModelName(StrEnum):
    GPT_4O_MINI = "gpt-4o-mini"
    GPT_4O = "gpt-4o"

class DeepseekModelName(StrEnum):
    DEEPSEEK_CHAT = "deepseek-chat"
    DEEPSEEK_V4_FLASH = "deepseek-v4-flash"

class OllamaModelName(StrEnum):
    OLLAMA_GENERIC = "ollama"

class FakeModelName(StrEnum):
    FAKE = "fake"         # 测试用假模型

class TongYiModelName(StrEnum):
    QWEN_PLUS = "qwen-plus"
    QWEN_MAX = "qwen-max"

AllModelEnum = OpenAIModelName | DeepseekModelName | OllamaModelName | FakeModelName | TongYiModelName
```

### 6.2 模型工厂 (`ai/llm.py`)

**核心函数**: `get_model(model_name: AllModelEnum) -> ModelT`

该函数使用 `@cache` 装饰器实现单例缓存，根据传入的模型名称返回对应的 LangChain 模型实例。

**模型路由表**:

```python
_MODEL_TABLE = {
    OpenAIModelName.GPT_4O_MINI: "gpt-4o-mini",
    OpenAIModelName.GPT_4O: "gpt-4o",
    DeepseekModelName.DEEPSEEK_CHAT: "deepseek-chat",
    DeepseekModelName.DEEPSEEK_V4_FLASH: "deepseek-chat",
    OllamaModelName.OLLAMA_GENERIC: "ollama",
    FakeModelName.FAKE: "fake",
    TongYiModelName.QWEN_PLUS: "qwen-plus",
}
```

**模型类型联合**: `ModelT = ChatOpenAI | ChatOllama | ChatDeepSeek | FakeToolModel | ChatTongyi`

**关键参数**:
- 所有模型均使用 `temperature=0.5`（平衡创造性与准确性）
- 所有真实模型均启用 `streaming=True`（支持流式输出）
- DeepSeek 模型需要传入 `api_key`

### 6.3 添加新模型

要添加一个新的模型提供商，需要完成以下步骤：

1. **在 `ai/models.py` 中添加新的模型枚举类**
2. **在 `_MODEL_TABLE` 中添加映射关系**
3. **在 `get_model()` 函数中添加模型创建逻辑**
4. **在 `ModelT` 类型别名中添加新类型**

---

## 7. 智能体 (Agent) 系统

### 7.1 Agent 注册表 (`ai/agent/agents.py`)

系统当前注册了两个 Agent：

```python
agents: dict[str, Agent] = {
    "oa-assistant": Agent(
        description="A oa intelligent assistant.",
        graph=oa_assistant
    ),
    "multi-agent-supervisor": Agent(
        description="A supervisor for multi-agent assistant.",
        graph=supervisor_agent
    ),
}
```

**默认 Agent**: `DEFAULT_AGENT = "oa-assistant"`

#### API

| 函数 | 说明 |
|------|------|
| `get_agent(agent_id: str) -> CompiledStateGraph` | 根据 agent_id 获取编译后的 Agent 图 |
| `get_all_agent_info() -> list[AgentInfo]` | 获取所有 Agent 的列表信息 |

### 7.2 OA 助手 Agent (`ai/agent/oa_assistant.py`)

#### 架构设计（LangGraph 状态图）

```
┌──────────┐
│  START   │
└────┬─────┘
     │
     ▼
┌──────────┐     AIMessage      ┌──────────────┐
│  model   │ ─────────────────▶ │pending_tool   │
│ (LLM调用) │                    │  _calls()     │
└──────────┘                    └───┬──────┬────┘
     ▲                             │      │
     │                   工具调用?  │      │ 无需工具
     │        ┌────────────────────┘      │
     │        │                           │
     │        ▼                           ▼
     │   ┌──────────┐               ┌──────────┐
     └───│  tools   │               │   END    │
         │ (执行工具) │               └──────────┘
         └──────────┘
```

#### Agent 状态

```python
class AgentState(MessagesState):
    """继承 MessagesState，自动包含 messages 字段"""
```

#### 工具列表

OA 助手绑定了 3 个工具：

| 工具 | 功能 | 数据来源 |
|------|------|---------|
| `get_user_info(user_name)` | 查询员工信息 | MySQL 数据库 |
| `get_user_department(user_name)` | 查询员工所属部门 | MySQL 数据库 |
| `search_handbook(query)` | 检索公司规章制度 | ChromaDB 向量库 |

#### 系统提示词 (System Prompt)

```text
You are an assistant of a company's OA system, and your task is to help users
query the administrative and personnel information within the company.

You need to use tools to query relevant information from the database and
knowledge base based on the user's questions and return it to the user.

It is not allowed to forge the relevant regulations of the company at will
to avoid misleading users out of thin air.

You need to answer the users' questions and ensure the accuracy and
completeness of the answers.

You need to pay attention to the users' questions and avoid answering
questions that they don't care about.

The current time is: {current_time}
```

#### 关键实现细节

- **模型绑定**: 使用 `model.bind_tools(tools)` 将工具绑定到 LLM
- **状态预处理**: `RunnableLambda` 在每次调用时将系统提示词注入消息列表
- **检查点**: 使用 `MemorySaver()` 实现对话状态持久化
- **模型选择**: 从 `RunnableConfig` 的 `configurable.model` 读取，支持动态切换
- **调试模式**: `set_debug(True)` 输出详细的 LangChain 调试日志

### 7.3 多智能体监督者 (`ai/agent/multi_agent.py`)

基于 `langgraph-supervisor` 库实现的 **Supervisor 模式**，由一个中央监督者负责将用户问题路由到最合适的子代理。

#### 子代理配置

| 子代理 | 名称 | 职责 | 特点 |
|--------|------|------|------|
| 数学专家 | `math_agent` | 数学计算、代数 | `skip_stream` 标签 |
| 编程专家 | `code_agent` | 编程、算法 | `skip_stream` 标签 |
| 通用助手 | `general_agent` | 其他通用问题 | `skip_stream` 标签 |

#### 监督者配置

```python
supervisor = create_supervisor(
    agents=[general_agent, code_agent, math_agent],
    model=model,
    output_mode="last_message",        # 只返回最后一个 Agent 的输出
    parallel_tool_calls=False,         # 禁止并行工具调用
    add_handoff_back_messages=False,   # 不添加交接消息
    tools=[forwarding_tool],           # 用于消息转发的工具
)
```

#### 监督者提示词

监督者根据用户问题的领域选择合适的子代理：
- **数学问题** → `math_agent`
- **编程/代码问题** → `code_agent`
- **其他通用问题** → `general_agent`
- 如果子代理已提供答案，直接返回结果而不是再次推理

#### 流式处理特殊逻辑

在 `chat_routes.py` 的 `message_generator()` 中，对 supervisor 模式的流式输出做了特殊处理：

```python
# 只保留 supervisor 节点的最终输出
if node == "supervisor":
    if isinstance(update_messages[-1], AIMessage):
        update_messages = [update_messages[-1]]

# 隐藏子代理的内部推理过程
if node in ("math_agent", "code_agent"):
    update_messages = []

# skip_stream 标签阻止子代理的 token 级别流式输出
if "skip_stream" in metadata.get("tags", []):
    continue
```

---

## 8. RAG 知识库模块

### 8.1 架构说明

RAG 模块使用 **Ollama Embeddings + ChromaDB** 实现企业知识库（员工手册）的向量检索。

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  文档导入脚本  │ ──▶ │  OllamaEmbeddings │ ──▶ │   ChromaDB      │
│ (importRag.py)│     │  (bge-m3 模型)    │     │ (持久化向量存储)  │
└──────────────┘     └──────────────────┘     └────────┬────────┘
                                                        │
                                                        │ similarity_search()
                                                        ▼
                                               ┌─────────────────┐
                                               │  检索结果        │
                                               │  (top-k=10)     │
                                               └─────────────────┘
```

### 8.2 ChromaDB 客户端 (`ai/rag/chromaClient.py`)

```python
# 持久化客户端
client = chromadb.PersistentClient(
    path=settings.CHROMA_PATH,
    settings=Settings(anonymized_telemetry=False)
)

# 嵌入函数
embeddings = OllamaEmbeddings(model=settings.EMBEDDING_MODEL)

# 向量存储
hand_book_vector_store = Chroma(
    collection_name="handbook",
    persist_directory=settings.CHROMA_PATH,
    embedding_function=embeddings,
    client=client,
    create_collection_if_not_exists=True,
)
```

### 8.3 关键配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `EMBEDDING_MODEL` | `bge-m3` | BGE-M3 模型，支持中英双语，通过 Ollama 本地部署 |
| `CHROMA_PATH` | `resource/chroma_db` | 向量数据库持久化路径 |
| `collection_name` | `handbook` | 知识库集合名称 |
| `similarity_search k` | `10` | 每次检索返回最相关的 10 条结果 |

### 8.4 数据导入

参考 [tests/rag/importRag.py](tests/rag/importRag.py) 脚本进行知识库数据的导入。

**前提条件**:
1. Ollama 已安装并运行
2. 已拉取 bge-m3 模型：`ollama pull bge-m3`

---

## 9. 数据库模块

### 9.1 数据库连接 (`db/database.py`)

#### 异步引擎

```python
async_engine = create_async_engine(settings.DATABASE_URL)

async_session_maker = async_sessionmaker(
    async_engine, expire_on_commit=False, class_=AsyncSession
)
```

#### 会话依赖注入

```python
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session

SessionDep = Annotated[AsyncSession, Depends(get_async_session)]
```

#### 数据库初始化

```python
async def create_db_and_tables():
    async with async_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
```

### 9.2 数据模型

#### 基类模型 (`db/models/base.py`)

```python
class DBBaseModel(SQLModel):
    create_time: datetime | None = Field(default=datetime.now)
    edit_time: datetime | None = Field(default=datetime.now)
```

所有业务模型继承 `DBBaseModel`，自动获得创建时间和更新时间字段。

#### 部门模型 (`db/models/department.py`)

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int (PK) | 部门 ID，主键，自增 |
| `name` | str(50) | 部门名称 |
| `parent_id` | int | 父部门 ID（0=顶级部门） |
| `manager_id` | int | 部门负责人 ID |
| `create_time` | datetime | 创建时间（继承自基类） |
| `edit_time` | datetime | 更新时间（继承自基类） |

#### 员工模型 (`db/models/employee.py`)

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int (PK) | 员工 ID，主键，自增 |
| `employee_no` | str(50) | 员工工号 |
| `name` | str(50) | 员工姓名（有索引） |
| `gender` | int | 性别：0=未知, 1=男, 2=女 |
| `department_id` | int | 所属部门 ID |
| `position` | str(50) | 职位 |
| `phone` | str(11) | 手机号 |
| `email` | str(50) | 邮箱 |
| `status` | int | 状态：1=试用, 2=正式, 3=离职 |
| `entry_date` | str(50) | 入职日期 |
| `create_time` | datetime | 创建时间 |
| `edit_time` | datetime | 更新时间 |

### 9.3 Repository 模式

项目采用 **Repository 模式** 封装数据库操作，所有数据访问通过 Repository 类的类方法进行。

#### EmployeeRepository

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `create_employee(session, employee)` | Employee | 创建员工 |
| `get_employee(session, employee_id)` | Optional[Employee] | 按 ID 查询 |
| `get_employee_by_name(session, name)` | Optional[Employee] | 按姓名查询 |
| `get_all_employees(session)` | List[Employee] | 查询所有员工 |
| `update_employee(session, employee_id, data)` | Optional[Employee] | 更新员工信息 |
| `delete_employee(session, employee_id)` | bool | 删除员工 |

#### DepartmentRepository

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `create_department(session, department)` | Department | 创建部门 |
| `get_department(session, department_id)` | Optional[Department] | 按 ID 查询 |
| `get_all_departments(session)` | List[Department] | 查询所有部门 |
| `update_department(session, id, data)` | Optional[Department] | 更新部门信息 |
| `delete_department(session, department_id)` | bool | 删除部门 |

### 9.4 数据库连接字符串格式

```bash
# MySQL (需要先创建数据库)
mysql+aiomysql://用户名:密码@主机地址:端口/数据库名

# SQLite
sqlite+aiosqlite:///相对路径/数据库文件.db
```

**创建 MySQL 数据库**:
```sql
CREATE DATABASE `ai-chatkit` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 10. API 接口文档

FastAPI 自动生成 Swagger 文档：
- **Swagger UI**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`

### 10.1 对话接口 (`/chat`)

#### `POST /chat/invoke` — 非流式对话

**请求体**:
```json
{
  "message": "查询员工张三的信息",
  "thread_id": "optional-thread-uuid",
  "agent_id": "oa-assistant",
  "agent_config": {}
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `message` | string | ✅ | 用户输入消息 |
| `thread_id` | string \| null | ❌ | 线程 ID，用于多轮对话持久化。不传则自动生成 |
| `agent_id` | string \| null | ❌ | Agent ID，默认 `"oa-assistant"` |
| `agent_config` | dict | ❌ | 额外配置，传递给 Agent。不可包含 `thread_id` 或 `model` 等保留键 |

**保留的 agent_config 键**（不可在 agent_config 中使用）:
- `thread_id`
- `model`

**响应** (200 OK):
```json
{
  "type": "ai",
  "content": "张三，工号 EMP001，市场部员工，职位：市场专员...",
  "tool_calls": [],
  "tool_call_id": null,
  "run_id": "uuid-string",
  "response_metadata": {},
  "custom_data": {}
}
```

**错误响应**:
- `422 Unprocessable Entity` — agent_config 包含保留键
- `500 Internal Server Error` — 代理执行出错

---

#### `POST /chat/stream` — 流式对话 (SSE)

**请求体**:
```json
{
  "message": "查询员工张三的信息",
  "thread_id": null,
  "agent_id": "oa-assistant",
  "agent_config": {},
  "stream_tokens": true
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `stream_tokens` | bool | ❌ | 是否流式输出 LLM token，默认 `true` |

**响应格式** (SSE, `text/event-stream`):

```
data: {"type": "message", "content": {"type": "ai", "content": "...", ...}}

data: {"type": "token", "content": "张"}

data: {"type": "token", "content": "三"}

data: {"type": "token", "content": "..."}

data: {"type": "end"}
```

**事件类型**:

| type | 说明 |
|------|------|
| `message` | 完整的 AI 消息 |
| `token` | LLM token 流片段 |
| `error` | 错误信息 |
| `end` | 流结束标记 |

---

### 10.2 员工接口 (`/employee`)

| 方法 | 路径 | 说明 | 状态码 |
|------|------|------|--------|
| `POST` | `/employee/add` | 新增员工 | 201 Created |
| `GET` | `/employee/get/{employee_id}` | 按 ID 查询员工 | 200 OK / 404 |
| `GET` | `/employee/get_by_name/{name}` | 按姓名查询员工 | 200 OK / 404 |
| `GET` | `/employee/get_all` | 查询所有员工 | 200 OK |
| `PUT` | `/employee/update/{employee_id}` | 更新员工信息 | 200 OK / 404 |
| `DELETE` | `/employee/delete/{employee_id}` | 删除员工 | 204 No Content / 404 |

**新增员工请求示例**:
```json
{
  "employee_no": "EMP001",
  "name": "张三",
  "gender": 1,
  "department_id": 1,
  "position": "市场专员",
  "phone": "13800138000",
  "email": "zhangsan@company.com",
  "status": 2,
  "entry_date": "2024-01-15"
}
```

**按姓名查询（通过 OA 工具）**:
`GET /employee/get_by_name/张三`

返回：
```json
{
  "id": 1,
  "employee_no": "EMP001",
  "name": "张三",
  "gender": 1,
  "department_id": 1,
  "position": "市场专员",
  "phone": "13800138000",
  "email": "zhangsan@company.com",
  "status": 2,
  "entry_date": "2024-01-15",
  "create_time": "2024-01-15T09:00:00",
  "edit_time": "2024-01-15T09:00:00"
}
```

### 10.3 部门接口 (`/department`)

| 方法 | 路径 | 说明 | 状态码 |
|------|------|------|--------|
| `POST` | `/department/add` | 创建部门 | 201 Created |
| `GET` | `/department/{department_id}` | 按 ID 查询部门 | 200 OK / 404 |
| `GET` | `/department/get_by_name/{name}` | 按名称查询部门 | 200 OK / 404 |
| `GET` | `/department/` | 查询所有部门 | 200 OK |
| `PUT` | `/department/update/{department_id}` | 更新部门信息 | 200 OK / 404 |
| `DELETE` | `/department/del/{department_id}` | 删除部门 | 204 No Content / 404 |

**创建部门请求示例**:
```json
{
  "name": "市场部",
  "parent_id": 0,
  "manager_id": 1
}
```

---

## 11. 部署与运行

### 11.1 环境要求

| 组件 | 版本要求 | 说明 |
|------|---------|------|
| Python | >= 3.13 | 推荐使用 `pyenv` 管理版本 |
| MySQL | 8.0+ | 生产环境（可选，也支持 SQLite） |
| Ollama | latest | 本地部署嵌入模型 (bge-m3) 时必需 |
| Git | 2.0+ | 版本控制 |

### 11.2 安装步骤

#### 1) 克隆项目

```bash
git clone <repository-url>
cd ai-chatkit/backend
```

#### 2) 创建虚拟环境并安装依赖

推荐使用 `uv` (项目已使用 `uv.lock`):

```bash
# 安装 uv
pip install uv

# 同步依赖
uv sync
```

或使用传统 pip:

```bash
python -m venv .venv
source .venv/bin/activate   # Linux/Mac
# 或 .venv\Scripts\activate  # Windows
pip install -e .
```

#### 3) 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库、API 密钥等
```

#### 4) 准备数据库

使用 MySQL:
```sql
CREATE DATABASE `ai-chatkit` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

或使用 SQLite（修改 `.env` 中的 `DATABASE_URL`）:
```env
DATABASE_URL=sqlite+aiosqlite:///resource/database.db
```

表结构会在应用启动时通过 `SQLModel.metadata.create_all` 自动创建。

#### 5) 安装 Ollama 并拉取嵌入模型 (RAG 必需)

```bash
# 安装 Ollama (macOS/Linux)
curl -fsSL https://ollama.ai/install.sh | sh

# 拉取 bge-m3 嵌入模型
ollama pull bge-m3
```

#### 6) 导入知识库数据 (可选)

```bash
python tests/rag/importRag.py
```

### 11.3 启动服务

#### 开发模式（热重载）

```bash
# 方式一：使用项目自带的启动脚本
python -m app.run_server

# 方式二：直接使用 uvicorn
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

`run_server.py` 在开发模式下 (`DEV=True`) 会自动启用热重载。Windows 平台会自动设置事件循环策略。

#### 生产模式

```bash
# 先设置 DEV=False 在 .env 中
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

**生产部署建议**:
- 使用 `gunicorn` + `uvicorn.workers.UvicornWorker`
- 在反向代理 (Nginx/Caddy) 后面运行
- 启用 HTTPS
- 配置环境变量 `DEV=False` 禁用热重载

#### 验证服务

```bash
curl http://127.0.0.1:8000/docs
```

### 11.4 环境变量完整参考

| 变量名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `APP_NAME` | str | `"AI ChatKit"` | 应用名称 |
| `DEBUG` | bool | `True` | 调试模式 |
| `DEV` | bool | `True` | 开发模式（控制热重载） |
| `HOST` | str | `"127.0.0.1"` | 绑定地址 |
| `PORT` | int | `8000` | 绑定端口 |
| `DATABASE_URL` | str\|None | None | 数据库连接 URL |
| `DEEPSEEK_API_KEY` | str\|None | None | DeepSeek API 密钥 |
| `OLLAMA_BASE_URL` | str\|None | None | Ollama 服务地址（默认 localhost:11434） |
| `OLLAMA_MODEL` | str\|None | None | Ollama 使用的模型名 |
| `DEFAULT_MODEL` | str\|None | None | 默认 LLM 模型标识符 |
| `EMBEDDING_MODEL` | str\|None | None | 嵌入模型名（用于 RAG） |
| `CHROMA_PATH` | str\|None | None | ChromaDB 持久化目录 |

---

## 12. 开发指南

### 12.1 添加新的 Agent 工具

在 [ai/tools/oa_tools.py](app/ai/tools/oa_tools.py) 中添加：

```python
from langchain_core.tools import tool

@tool
async def my_new_tool(param: str) -> str:
    """工具描述——LangChain 会用它来决定何时调用此工具"""
    # 实现逻辑
    return result

# 然后在 oa_assistant.py 的 tools 列表中添加它
tools = [get_user_info, get_user_department, search_handbook, my_new_tool]
```

### 12.2 添加新的 Agent

1. **创建 Agent 定义文件** (如 `ai/agent/my_agent.py`)

```python
from langgraph.graph import StateGraph, MessagesState, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver

# 定义状态图
agent = StateGraph(MessagesState)
# ... 添加节点和边 ...
compiled_agent = agent.compile(checkpointer=MemorySaver())
```

2. **在 `ai/agent/agents.py` 中注册**

```python
from ai.agent.my_agent import compiled_agent as my_agent

agents: dict[str, Agent] = {
    "oa-assistant": Agent(description="...", graph=oa_assistant),
    "multi-agent-supervisor": Agent(description="...", graph=supervisor_agent),
    "my-agent": Agent(description="My custom agent", graph=my_agent),
}
```

### 12.3 添加新的数据模型

1. 在 `db/models/` 中定义模型（继承 `DBBaseModel`）
2. 在 `db/repository/` 中创建对应的 Repository 类
3. 在 `api/` 中创建对应的路由文件
4. 在 `main.py` 中注册路由

### 12.4 日志调试

LangChain 调试模式在 `oa_assistant.py` 和 `multi_agent.py` 中全局启用：

```python
set_debug(True)   # LangChain 调试日志
set_verbose(False)

# 标准日志
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(filename)s[line:%(lineno)d] - %(funcName)s() - %(message)s'
)
```

**生产环境建议**：将 `set_debug(True)` 改为 `set_debug(False)`。

### 12.5 跨域配置

在 [main.py](app/main.py) 中配置：

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # 生产环境请改为具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**生产环境安全建议**：将 `allow_origins=["*"]` 改为前端实际部署的域名列表。

---

## 13. 测试说明

### 13.1 数据库测试 (`tests/db/SqlModelTest.py`)

用于测试 SQLModel 的 ORM 功能，包括模型创建、CRUD 操作等。

```bash
python -m pytest tests/db/ -v
```

### 13.2 RAG 测试

| 脚本 | 用途 |
|------|------|
| `tests/rag/importRag.py` | 导入文档到 ChromaDB 向量库 |
| `tests/rag/queryChroma.py` | 测试 ChromaDB 查询功能 |

```bash
# 导入知识库数据
python tests/rag/importRag.py

# 测试查询
python tests/rag/queryChroma.py
```

### 13.3 API 测试

项目启动后，访问 Swagger UI 进行手动测试：

```
http://127.0.0.1:8000/docs
```

**快速测试对话接口**:

```bash
# 非流式对话
curl -X POST http://127.0.0.1:8000/chat/invoke \
  -H "Content-Type: application/json" \
  -d '{"message": "你好", "agent_id": "oa-assistant"}'

# 流式对话
curl -X POST http://127.0.0.1:8000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "查询员工张三", "stream_tokens": true}'
```

---

## 14. 常见问题 (FAQ)

### Q1: 启动时报 `ModuleNotFoundError: No module named 'xxx'`

**A**: 确保已安装所有依赖：
```bash
uv sync
# 或
pip install -e .
```

### Q2: 数据库连接失败

**A**: 检查以下几点：
- `.env` 中的 `DATABASE_URL` 格式是否正确
- MySQL 服务是否运行：`mysql -u root -p`
- 数据库是否已创建：`CREATE DATABASE \`ai-chatkit\`;`
- 如使用 SQLite，确保 `resource/` 目录存在

### Q3: Ollama 嵌入模型不可用

**A**: RAG 功能依赖 Ollama 本地部署 bge-m3 模型：
```bash
# 确认 Ollama 运行中
ollama list

# 拉取模型
ollama pull bge-m3
```

如果不需要 RAG 功能，OA 助手在知识库为空时会返回 "no result found"。

### Q4: DeepSeek API 返回 401 错误

**A**: 在 `.env` 中配置正确的 `DEEPSEEK_API_KEY`。可在 [DeepSeek 平台](https://platform.deepseek.com) 获取 API Key。

### Q5: Windows 下运行报 asyncio 相关错误

**A**: `run_server.py` 已自动处理 Windows 事件循环策略：
```python
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
```
请使用 `python -m app.run_server` 启动而不是直接使用 `uvicorn`。

### Q6: 如何切换使用的模型？

**A**: 修改 `.env` 中的 `DEFAULT_MODEL` 和对应的 API 密钥：

| 切换到 | 配置 |
|--------|------|
| DeepSeek V4 | `DEFAULT_MODEL=deepseek-v4-flash` + `DEEPSEEK_API_KEY=sk-xxx` |
| OpenAI | `DEFAULT_MODEL=gpt-4o-mini` + `OPENAI_API_KEY=sk-xxx` |
| 通义千问 | `DEFAULT_MODEL=qwen-plus` + `DASHSCOPE_API_KEY=sk-xxx` |
| Ollama 本地 | `DEFAULT_MODEL=ollama` + `OLLAMA_MODEL=qwen2.5:7b` |

### Q7: 多轮对话如何实现？

**A**: 客户端需要保存第一次请求返回的 `thread_id`，后续请求带上相同的 `thread_id`：

```json
// 第一轮
{"message": "我叫张三", "thread_id": null}
// 响应: run_id="xxx", 前端保存 thread_id

// 第二轮（使用相同的 thread_id）
{"message": "我的工号是多少", "thread_id": "<第一轮生成的thread_id>"}
```

### Q8: 如何更新 ChromaDB 中的知识库？

**A**: 重新运行导入脚本，新的向量数据会追加到现有集合中。如需清空重建，可删除 `resource/chroma_db/` 目录后重新导入。

### Q9: 流式响应中看不到子 Agent 的推理过程

**A**: 这是设计如此。在 `chat_routes.py` 的 `message_generator()` 中：
- `math_agent` 和 `code_agent` 节点的输出被显式过滤 (`update_messages = []`)
- 子 Agent 的 token 流通过 `skip_stream` 标签跳过
- 只有 `supervisor` 节点的最终输出会返回给客户端

### Q10: 如何监控和排查 Agent 行为？

**A**: 
1. 查看控制台输出的 LangChain DEBUG 日志（`set_debug(True)` 时）
2. 查看 `response_metadata` 中的 token 使用量等信息
3. 访问 `http://127.0.0.1:8000/docs` 直接测试接口
4. 生产环境建议接入 APM 工具（如 LangSmith）追踪 Agent 执行链路

---

## 附录

### A. 依赖关系图

```
FastAPI
├── uvicorn (ASGI)
├── pydantic-settings (配置)
├── SQLModel (ORM)
│   ├── aiomysql (MySQL 异步)
│   └── aiosqlite (SQLite 异步)
└── LangChain/LangGraph
    ├── langchain-deepseek (DeepSeek)
    ├── langchain-openai (OpenAI)
    ├── langchain-ollama (Ollama)
    ├── langchain-chroma (ChromaDB)
    ├── langgraph-supervisor (多智能体)
    └── dashscope (通义千问)
```

### B. 关键术语对照

| 术语 | 英文 | 说明 |
|------|------|------|
| 智能体 | Agent | 能自主决策、使用工具的 AI 程序 |
| 监督者 | Supervisor | 管理多个子智能体的调度器 |
| 检索增强生成 | RAG | 结合信息检索与文本生成的技术 |
| 向量存储 | Vector Store | 存储嵌入向量的数据库 |
| 嵌入 | Embedding | 将文本转换为高维向量的过程 |
| 流式输出 | Streaming | 逐步生成响应而非一次返回 |
| 状态图 | StateGraph | LangGraph 中的有向图工作流 |
| 中断 | Interrupt | LangGraph 中人机交互的暂停机制 |
| 检查点 | Checkpoint | 对话状态的快照，用于多轮对话持久化 |
| 工具调用 | Tool Call | LLM 决定调用外部函数的能力 |
| SSE | Server-Sent Events | 服务器推送事件，用于流式传输 |

---

> **文档维护**: 本文档应随项目迭代同步更新。如有疑问或建议，请联系项目维护者。
