# ADR-003：采用 ChromaDB + Ollama Embedding 实现手册 RAG 检索

## 状态

已采纳

## 背景

OA 助手必须基于公司员工手册的真实内容回答问题（例如考勤制度、报销流程、请假规定等），而不能凭空编造（幻觉）。这需要一个本地化的知识检索系统，在 LLM 生成回复之前，先从句量数据库中检索相关文档片段作为上下文。

关键约束：
- 手册内容为中文文档（`resource/EmployeeHandbook.pdf`）；
- 检索需在智能体工具调用边界内完成（而非作为独立的外部 API）；
- 系统作为模板/演示项目，应优先选择可本地运行的轻量方案，避免引入外部云服务依赖。

## 决策

- **向量存储**：使用 **ChromaDB**（`langchain_chroma.Chroma`），持久化存储在 `backend/app/resource/chroma_db/` 目录下；
- **嵌入模型**：使用 **Ollama** 本地运行的 **`bge-m3`** 模型进行文本向量化（通过 `OllamaEmbeddings`）；
- **检索方式**：以 `search_handbook(query)` 工具函数的形式暴露给智能体，通过 `similarity_search(query, k=10)` 返回 Top-10 最相关文档片段；
- **集合管理**：使用 `create_collection_if_not_exists=True`，集合延迟创建，名称为 `"handbook"`。

## 理由

### ChromaDB 的优势

- **本地持久化**：无需独立的数据库服务，ChromaDB 以文件形式存储在项目目录下，启动即可用；
- **与 LangChain 原生集成**：`langchain_chroma.Chroma` 提供与 LangGraph 工具节点无缝配合的 API；
- **零配置**：对于模板项目的使用者而言，不需要额外安装和配置向量数据库，降低入门门槛。

### bge-m3 嵌入模型的选择

- **中英文双语支持**：BGE-M3 是 BAAI 发布的通用嵌入模型，对中文语义理解能力良好，适合员工手册的中文内容检索；
- **Ollama 本地运行**：通过 Ollama 在本地拉取和运行，无需调用付费嵌入 API，无网络依赖，无数据外泄风险；
- **一致的嵌入维度**：bge-m3 输出 1024 维向量，与 ChromaDB 配合稳定。

### 工具化暴露的理由

- `search_handbook` 作为 `@tool` 装饰的函数注册到 LangGraph 的 `ToolNode`，LLM 在判断用户问题涉及公司制度时自主决定调用；
- 检索结果以字符串形式注入 LLM 上下文，模型在回复中引用检索到的制度原文，而非凭空生成；
- 这种"检索作为工具"的模式将知识获取限制在智能体边界之内，确保所有制度类回答都经过检索验证。

### 非手册类知识库扩展

系统还实现了角色知识库的检索：
- **爱弥斯角色知识库**：通过 `scripts/import_ameath_lore.py` 导入，存储在 ChromaDB 集合 `character_lore_character-ameath` 中，由 `search_character_lore` 工具检索；
- **莫宁角色知识库**：通过 `scripts/import_mornye_lore.py` 导入，存储在 ChromaDB 集合 `character_lore_character-mornye` 中；
- 这些知识库与手册知识库使用相同的 ChromaDB 实例和嵌入模型，仅通过不同的集合名称隔离。

## 后果

### 运行时依赖

- RAG 功能强依赖本地 Ollama 服务运行且已拉取 `bge-m3` 模型——若 Ollama 不可用或模型未安装，`search_handbook` 工具将失败；
- 工具失败时必须安全降级：返回明确的中文错误信息（如"知识库暂时不可用"），而非崩溃或返回空结果；
- 当前实现中的降级策略为：让 `OllamaEmbeddings` 初始化失败自然抛出异常，由 LangGraph 的错误处理机制捕获并包装为 `ToolMessage` 中的错误信息。

### 数据新鲜度

- 手册内容的更新不会自动反映到检索结果中——需要手动重新索引（重新导入 Embedding 并写入 ChromaDB）；
- 当前项目中不存在自动化文档同步机制（如监听文件变更、定时重新索引），这是技术债务；
- 在模板/演示场景下，手动索引是可接受的；若进入生产环境，需要引入文档管道。

### 向量存储的可移植性

- ChromaDB 的持久化文件（`resource/chroma_db/`）是二进制格式，与 ChromaDB 版本绑定；
- 跨环境部署时，建议在新的环境中重新执行导入脚本（`scripts/` 目录下），而非直接复制持久化文件；
- 集合名称（`"handbook"`、`character_lore_*`）需要与代码中的硬编码名称保持一致。

## 代码证据

- `backend/app/ai/rag/chromaClient.py` — ChromaDB 向量存储初始化：`hand_book_vector_store`（`"handbook"` 集合）+ `OllamaEmbeddings(model="bge-m3")`
- `backend/app/ai/tools/oa_tools.py` — `search_handbook(query)` 工具函数：调用 `hand_book_vector_store.similarity_search(query, k=10)`
- `backend/app/core/config.py` — `EMBEDDING_MODEL`（`bge-m3`）和 `CHROMA_PATH`（`resource/chroma_db`）配置项
- `backend/app/resource/chroma_db/*` — ChromaDB 持久化数据目录
- `backend/app/resource/EmployeeHandbook.pdf` — 员工手册源文档
- `backend/scripts/import_ameath_lore.py` — 爱弥斯角色知识库导入脚本
- `backend/scripts/import_mornye_lore.py` — 莫宁角色知识库导入脚本
- `backend/app/ai/agent/Ameath.py` — 爱弥斯智能体定义（包含 `search_character_lore` 工具）
- `backend/app/ai/agent/Mornye.py` — 莫宁智能体定义（包含 `search_character_lore` 工具）
