# ADR-001：前后端分离架构，采用 SSE 实现流式聊天

## 状态

已采纳

## 背景

产品需要一个聊天 UI，能够快速展示模型的部分输出（逐 token 渲染），同时后端需支持智能体工具调用、数据库访问以及多轮对话状态管理。

在技术选型阶段，面临以下核心问题：
- 前端需要渐进式渲染 AI 回复，用户不应等待完整回复生成后才能看到内容；
- 后端需要异步处理能力，以支撑 LLM 调用、工具执行、数据库查询等耗时操作；
- 前后端通信协议需要在"实时性"与"实现复杂度"之间取得平衡。

## 决策

- **前端**：使用 Next.js 14（App Router）构建浏览器端聊天界面。
- **后端**：使用 FastAPI（Python 3.13 + Uvicorn）构建 RESTful API 服务。
- **流式通信**：通过 `POST /chat/stream` 端点，以 SSE（Server-Sent Events，`text/event-stream`）协议推送聊天回复。
- **非流式通信**：同时保留 `POST /chat/invoke` 端点，返回单次完整回复，供简单调用场景使用。

## 理由

### 前端选型：Next.js

- Next.js App Router 提供基于文件的路由系统，聊天页面（`/`、`/chat`、`/chat/[threadId]`）可自然映射到路由文件；
- React 组件化架构适合构建消息气泡、输入框、侧边栏等可复用 UI 模块；
- 实际采用 Next.js 14 + React 18 + Ant Design 5 + Tailwind CSS 3 的技术栈，经验证可良好协作。

### 后端选型：FastAPI

- 原生 `async/await` 支持，适合处理 LLM 调用的长等待时间和数据库异步查询；
- Pydantic v2 提供请求/响应模型的类型安全校验（详见 `chatSchema.py` 中的 `UserInput`、`StreamInput`、`ChatMessage`、`ToolCall` 定义）；
- 自动生成 OpenAPI 文档，便于前后端联调；
- 实际通过 Uvicorn 运行，支持热重载开发。

### 通信协议：SSE 而非 WebSocket

- SSE 是单向的（服务端 → 客户端），恰好匹配"模型逐 token 输出"的需求——客户端只需接收，不需双向通信；
- SSE 基于标准 HTTP，无需额外协议升级，实现更简单；
- 前端通过 `fetch` + `ReadableStream` + `response.body.getReader()` 即可消费流，无需引入 WebSocket 库；
- SSE 天然支持断线重连（浏览器内置），且与 HTTP/2 兼容。

### 渐进式渲染

- 前端 `useStreamChat` hook 按 `\n\n` 分隔符解析 SSE 事件，区分以下事件类型：
  - `token`：增量文本 token，追加到当前 AI 消息的 `content` 末尾；
  - `message`：完整消息结构（含 `tool_calls`、图片等元数据）；
  - `player_command`：音乐播放器控制指令；
  - `error`：流式传输错误；
  - `end`：流结束信号。
- 用户在收到第一个 `token` 事件时即可看到回复开始渲染，无需等待完整生成。

## 后果

### 前端承担的责任

- 必须手动解析 SSE 帧（按 `data:` 前缀提取 JSON 负载），处理跨块边界和部分 JSON 行的情况（当前实现为行级解析，在极端分块场景下存在脆弱性，记录在 TECHDEBT 中）；
- 需要在流式过程中增量更新 React 状态（`messages` 数组），配合 500ms 去抖持久化到 IndexedDB；
- 流式结束后触发刷新持久化（`isStreaming` 变为 `false` 时强制写入 IndexedDB）。

### 后端承担的责任

- 必须保证事件顺序（token → message → end），且在异常情况下也要发送 `error` 事件并干净地终止流；
- `message_generator()` 异步生成器中需处理多智能体场景的消息过滤（主管模式下隐藏子智能体内部 trace）；
- 需正确处理中断恢复（通过 LangGraph 的 `Command(resume=...)` 机制支持 agent 暂停等待用户输入）。

### 架构约束

- 所有聊天回复的核心路径必须经过 `/chat/stream`（SSE），作为项目的硬性约束（见 SCOPE.md）；
- 前端与后端通过 `NEXT_PUBLIC_API_BASE_URL`（默认 `http://localhost:8000`）连接；
- CORS 当前全开（`allow_origins=["*"]`），仅适合开发环境，生产部署前需要收紧。

## 代码证据

- `frontend/app/chat/hooks/useStreamChat.ts` — SSE 流解析、token 累积、消息状态更新的核心逻辑
- `frontend/app/chat/components/ChatComponent.tsx` — 聊天主组件，管理消息列表和流式状态
- `frontend/app/chat/types/chat.types.ts` — Message 类型定义
- `backend/app/api/chat_routes.py` — `/chat/invoke` 和 `/chat/stream` 端点实现，含 `message_generator()` 异步生成器
- `backend/app/api/schema/chatSchema.py` — `UserInput`、`StreamInput`、`ChatMessage`、`ToolCall` 的 Pydantic 模型
- `backend/app/main.py` — FastAPI 应用入口，CORS 中间件配置，路由挂载
- `backend/app/utils/chat_utils.py` — LangChain 消息类型到 ChatMessage 的转换工具
