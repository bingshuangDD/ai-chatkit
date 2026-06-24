# ADR-002：采用 LangGraph 构建智能体，配合 Supervisor 实现多智能体路由

## 状态

已采纳

## 背景

系统需要两种智能体模式：
1. **公司助手（OA Assistant）**：回答员工信息查询、部门查询、员工手册相关问题，并能控制音乐播放器；
2. **多智能体演示模式（Multi-Agent Supervisor）**：将数学、编程和通用问题分别路由到不同的专家子智能体处理。

核心挑战在于：
- 多轮对话需要保持状态连续性（`thread_id` 级别的上下文）；
- 工具调用需要在 LLM 与外部系统（数据库、向量搜索、音乐 MCP 服务）之间可靠编排；
- 多智能体场景需要清晰的消息路由，避免子智能体的内部推理泄露到前端。

## 决策

- 所有智能体统一基于 **LangGraph `StateGraph`** 构建，采用 ReAct（推理-行动）循环模式；
- **`oa-assistant`**：单一 `StateGraph`，包含 `model` 节点（LLM + 工具绑定）和 `tools` 节点（`ToolNode`），通过条件边在有工具调用时循环执行；
- **`multi-agent-supervisor`**：使用 `langgraph_supervisor` 包构建 Supervisor 架构，由一个主管 LLM 将请求路由到三个 `create_react_agent` 子智能体（`math_agent`、`code_agent`、`general_agent`）；
- **角色智能体**（`character-ameath`、`character-mornye`）：与 OA 助手相同的 LangGraph 架构，额外附加角色知识库检索工具；
- 所有智能体通过 **`agents.py` 中央注册表**（`dict[str, StateGraph]`）暴露，由 `agent_id` 解析。

## 理由

### LangGraph 的优势

- **显式状态管理**：`StateGraph(MessagesState)` 提供消息列表的声明式管理，每次节点执行后自动合并状态；
- **检查点支持**：`MemorySaver`（内存检查点）支持多轮对话的状态持久化，同一 `thread_id` 下的对话历史可在后续请求中恢复；
- **条件路由**：`pending_tool_calls` 条件边根据 LLM 的输出动态决定是继续调用工具还是结束——无工具调用时走向 `END`，有工具调用时走向 `tools` 节点执行后再回到 `model` 节点；
- **流式模式**：`agent.astream(stream_mode=["updates", "messages", "custom"])` 支持多种粒度的流式输出，`messages` 模式用于 token 级流式传输，`updates` 模式用于状态变更通知。

### Supervisor 模式的价值

- **关注点分离**：每个子智能体拥有独立且聚焦的系统提示词——数学智能体只处理数学问题，编程智能体只处理代码，各自不互相污染；
- **输出模式**：使用 `output_mode="last_message"`，主管仅向调用方透传子智能体的最终输出，而非整个推理链；
- **流式过滤**：子智能体标记为 `skip_stream`，前端 SSE 流中不会出现数学/编程智能体的内部推理 token，保持 UI 简洁（调试信息可通过后端日志获取）。

### 中央注册表设计

- `agents.py` 中的 `agents` 字典将 `agent_id`（字符串）映射到已编译的 LangGraph 图，API 层只需调用 `get_agent(agent_id)` 即可获取；
- 新增智能体只需在注册表中添加条目，不需修改路由逻辑；
- `get_all_agent_info()` 为前端 `AgentSelector` 组件提供可用智能体列表。

### 实际智能体清单

| agent_id | 描述 | 注册的工具 |
|---|---|---|
| `oa-assistant` | 公司 OA 助手，回答员工/部门/手册问题 | `get_user_info`、`get_user_department`、`search_handbook`、`play_music`、`pause_music`、`resume_music`、`stop_music` |
| `multi-agent-supervisor` | 主管路由多智能体 | 路由到 `math_agent` / `code_agent` / `general_agent` |
| `character-ameath` | "爱弥斯"角色扮演智能体 | OA 全套工具 + `search_character_lore`（爱弥斯角色知识库） |
| `character-mornye` | "莫宁"角色扮演智能体 | OA 全套工具 + `search_character_lore`（莫宁角色知识库） |

## 后果

### 稳定性约束

- `agent_id` 成为前端与后端的**稳定公共契约**，变更需同步更新 `AgentSelector.tsx` 中的选项列表和 `agentConfig.ts` 中的主题配置；
- 工具函数的签名和行为需保持与 LangChain 消息类型（`HumanMessage`、`AIMessage`、`ToolMessage`）兼容，否则 LangGraph 的 `ToolNode` 无法正确解析。

### 流式输出的特殊处理

- 多智能体模式下，主管节点仅保留最终 AI/工具消息，子智能体的中间消息被置为 `new_messages = []`，防止泄露到 SSE 流；
- `skip_stream` 标记的智能体会跳过 token 级别事件，直接发送最终 message 事件；
- 因此，多智能体模式的用户在前端看到的是"等待 → 完整回复"，而非逐 token 渲染——这是一种刻意的 UI 权衡。

### 可观测性代价

- 子智能体的内部推理在当前架构下对前端不可见，调试需依赖后端日志；
- 全局启用的 `set_debug(True)` 提供了详细的图执行日志，但增加了运行时噪音。

## 代码证据

- `backend/app/ai/agent/oa_assistant.py` — OA 助手的 `StateGraph` 定义：`model` 节点（7 个工具绑定）、`tools` 节点（`ToolNode`）、条件边 `pending_tool_calls`
- `backend/app/ai/agent/multi_agent.py` — Supervisor 多智能体：`create_supervisor` + 三个 `create_react_agent` 子智能体
- `backend/app/ai/agent/agents.py` — 智能体中央注册表：`agents: dict[str, Agent]`
- `backend/app/ai/agent/Ameath.py` — 爱弥斯角色智能体（与 OA 架构同构，增加角色知识检索）
- `backend/app/ai/agent/Mornye.py` — 莫宁角色智能体（与 OA 架构同构，增加角色知识检索）
- `backend/app/ai/tools/oa_tools.py` — OA 工具函数：`get_user_info`、`get_user_department`、`search_handbook`
- `backend/app/ai/tools/music_tools.py` — 音乐工具函数：`play_music`、`pause_music`、`resume_music`、`stop_music`
- `backend/app/ai/llm.py` — LLM 模型工厂（支持 DeepSeek、Kimi/Moonshot、OpenAI、Ollama、TongYi）
- `backend/app/ai/models.py` — 模型名称枚举和类型别名 `ModelT`
- `backend/app/api/chat_routes.py` — 流式事件过滤逻辑（主管子智能体消息屏蔽、`skip_stream` 判断）
- `frontend/app/components/AgentSelector.tsx` — 前端智能体选择器
- `frontend/app/config/agentConfig.ts` — 智能体头像/颜色配置
- `frontend/app/config/agentThemeConfig.ts` — 智能体主题色配置
