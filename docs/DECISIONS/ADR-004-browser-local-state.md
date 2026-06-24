# ADR-004：聊天会话与历史记录存储在浏览器本地

## 状态

已采纳（已演进：从 localStorage 迁移至 IndexedDB）

## 背景

AI-CHATKIT 定位为模板和演示级聊天产品，需要轻量级的会话持久化方案，避免增加后端存储复杂度。核心需求包括：
- 页面刷新后能恢复聊天会话列表和消息历史；
- 支持多会话管理（创建、切换、删除会话）；
- 支持会话间传递待发送消息（用户从首页发送消息后导航到新会话页面）；
- 不引入后端数据库表变更（无 schema 迁移负担）。

## 决策

- **存储引擎**：当前使用浏览器 **IndexedDB**（数据库名 `"ai-chatkit"`，版本 1），直接操作原生 IDB API，无第三方包装库；
- **会话列表**：存储在 `sessions` object store 中，以 `threadId` 为主键，包含 `updatedAt` 和 `agentId` 索引；
- **消息历史**：存储在 `messages` object store 中，以自增 `id` 为主键，通过 `threadId` 索引和复合索引 `[threadId+createdAt]` 查询；
- **二进制资源**：图片（用户上传和 AI 生成）存储在 `assets` object store 中，通过 `threadId` 和 `kind` 索引；
- **待处理消息**：存储在 `pendingMessages` object store 中，用于跨路由的消息传递（`/chat` → `/chat/[threadId]`）；
- **历史兼容**：启动时自动执行 `localStorage → IndexedDB` 迁移（`localStorageMigration.ts`），将旧版 localStorage 数据迁移到 IndexedDB 后设置迁移完成标记；
- 以 `thread_id` 作为浏览器端会话恢复的唯一标识键。

## 理由

### IndexedDB 优于 localStorage

- **存储容量**：IndexedDB 无严格的大小限制（通常为磁盘可用空间的一定比例），远大于 localStorage 的 5-10MB 限制，适合存储图片等二进制数据；
- **异步 API**：不阻塞主线程，适合聊天场景中频繁的读写操作；
- **结构化存储**：支持索引、复合查询、事务，适合消息按 `threadId` 过滤和排序的场景；
- **二进制支持**：可直接存储 Blob/ArrayBuffer，用户上传的图片无需转为 Base64 字符串存储在 localStorage 中。

### 为什么不用后端存储

- **模板/演示定位**：项目的 SCOPE 明确将"服务端会话存储"列为 Out of Scope——当前阶段不需要服务端持久化；
- **零后端改动**：新增会话相关功能不需要写数据库 migration、不需要新增 API 端点；
- **即时可用**：用户打开浏览器即可使用，不需要后端数据库预先创建表结构；
- **快速开发迭代**：前端独立管理存储 schema，不需要前后端协调。

### 仓库模式设计

存储层采用 **Repository 模式**封装 IndexedDB 操作：

| 仓库模块 | 职责 |
|---|---|
| `sessionRepository` | 会话 CRUD，按 `updatedAt` 降序排列；删除会话时级联删除关联的消息、资源和待处理条目 |
| `messageRepository` | 消息的增删改查，支持 `hydrateMessages`（加载时还原图片 data URL）和 `persistUiMessages`（保存时提取图片到 assets） |
| `assetRepository` | 图片资源的存取，支持 `saveGeneratedImageAsset`（从远程 URL 获取并本地存储）和 `createObjectUrl`（创建 Blob URL 用于显示） |
| `pendingMessageRepository` | 会话间消息传递：`savePendingMessage`（写入）和 `consumePendingMessage`（读取并删除） |

### 持久化时机策略

- **去抖持久化**：消息变化时启动 500ms 定时器，连续 500ms 无变化后才写入 IndexedDB（避免流式过程中频繁写入每个 token）；
- **刷新持久化**：`isStreaming` 变为 `false` 时，取消去抖定时器并立即强制写入（确保流结束后的消息不会丢失）；
- 使用 `useRef` 保存最新消息引用，解决去抖回调中的闭包过期问题。

## 后果

### 数据局部性

- 历史记录与浏览器和设备绑定——在 Chrome 中的对话无法在 Firefox 或移动设备上访问；
- 清除浏览器数据（缓存/存储）将永久删除所有对话记录；
- 跨设备同步**刻意不支持**——这是模板产品的设计范围边界。

### 存储迁移

- 旧版 localStorage 数据通过 `localStorageMigration.ts` 一次性迁移到 IndexedDB，迁移后旧数据保留在 localStorage 中（不主动删除）；
- 迁移标记 `"indexedDbMigration:v1"` 存储在 localStorage 中，确保迁移只执行一次；
- 未来若需变更 IndexedDB schema（如新增 object store 或索引），需提升数据库版本号并编写 version change 迁移逻辑。

### 会话删除的级联清理

- 删除会话时，`sessionRepository.deleteSession()` 并行删除关联的 messages、assets 和 pendingMessages，保证无数据残留。

### 待处理消息模式

- 用户在 `/` 或 `/chat` 路由下发送第一条消息时，消息先写入 IndexedDB 的 `pendingMessages` store，然后导航到 `/chat/[newThreadId]`；
- 目标页面挂载后，从 `pendingMessages` 读取并消费（读取后删除），然后发起 SSE 流式请求；
- 这种模式避免了将消息内容放在 URL 查询参数中（URL 可能过长）或全局状态中（刷新后丢失）。

## 代码证据

- `frontend/app/chat/storage/db.ts` — IndexedDB 连接管理（`openDB`、`promisifyRequest`）
- `frontend/app/chat/storage/schema.ts` — IndexedDB schema 类型定义（`ChatDB`、各 Store 的类型）
- `frontend/app/chat/storage/repositories/sessionRepository.ts` — 会话仓库（CRUD + 级联删除）
- `frontend/app/chat/storage/repositories/messageRepository.ts` — 消息仓库（CRUD + 序列化/反序列化）
- `frontend/app/chat/storage/repositories/assetRepository.ts` — 资源仓库（图片存取 + Object URL 管理）
- `frontend/app/chat/storage/repositories/pendingMessageRepository.ts` — 待处理消息仓库
- `frontend/app/chat/storage/migrations/localStorageMigration.ts` — localStorage → IndexedDB 迁移逻辑
- `frontend/app/chat/storage/utils/dataUrl.ts` — data URL / Blob 转换工具
- `frontend/app/layout.tsx` — 根布局：启动时调用 `migrateLocalStorageToIndexedDB()`，提供 `LayoutContext`
- `frontend/app/chat/components/ChatComponent.tsx` — 聊天主组件：消息加载、持久化、待处理消息消费
- `frontend/app/chat/hooks/useChatActions.ts` — 聊天动作 hook：消息发送与状态管理
