# 新建对话首条消息流式显示修复说明

## 背景

前端在新建对话后发送第一句话时，出现过几类相关问题：

- 第一条用户消息没有显示，只被用作左侧会话标题。
- LLM 实际返回了第一条消息的回复，但页面中看不到。
- 某些修复版本中，同一条用户消息或 AI 回复会重复出现多次。
- 第二次发送消息时，可能会补出第一次请求的内容。

这些问题集中发生在从 `/chat` 新建会话并跳转到 `/chat/{threadId}` 的首条消息流程中。

## 根因

首条消息和普通消息的路径不同。普通消息已经有 `routeThreadId`，可以直接在当前页面追加用户气泡、AI 占位并发起流式请求；但新建会话的第一句话需要先生成 `threadId`，创建左侧会话，再跳转到新路由。

旧逻辑里主要有三个风险点：

1. `currentThreadId` 是异步更新的，新建会话后立即发请求时可能仍然拿到旧值或空值。
2. `/chat` 到 `/chat/{threadId}` 的路由切换会导致组件重建，组件内 state 中的首条消息容易丢失。
3. React 18 开发模式下 effect 可能被重复执行或重挂，pending 消息如果过早删除，就会出现“请求发了，但新页面没有可见消息”的状态。

重复输出的问题则来自 pending 消息被多个 effect 或多次渲染重复消费，同时 `handleStream` 每次都会追加用户消息和 AI 占位。

## 最终修复方案

修复后的设计把“首条消息可见”和“触发流式请求”拆开处理。

### 1. 新建会话时先持久化可见消息

当用户在 `/chat` 页面发送第一句话时：

- 生成新的 `threadId`。
- 把原始输入写入 `chatPendingMessage-{threadId}`，用于新页面触发一次流式请求。
- 同时把用户消息和空 AI 占位写入 `chatMessages-{threadId}`。
- 通过 `add-session` 事件创建左侧会话，并跳转到 `/chat/{threadId}`。

这样即使路由切换或组件重挂，新页面也能立即从 `localStorage` 读取并显示第一条用户消息。

### 2. 只让路由页面消费 pending 消息

`ChatComponent` 使用 `routeThreadId = threadId || null` 作为当前页面的真实会话 ID。

消息读取、消息保存、pending 消费都绑定到 `routeThreadId`，而不是全局 `currentThreadId`。这样可以避免旧 `/chat` 页面在跳转瞬间抢先消费 pending 或把消息写入错误会话。

### 3. pending 流式请求延后一拍启动

pending effect 中使用 `setTimeout(..., 0)` 延后一拍启动流，并在 cleanup 中清理 timer。

这能避开 React 18 Strict Mode 下临时挂载抢先删除 pending 的问题。真正稳定挂载的新页面会消费 pending 并启动流。

### 4. `handleStream` 支持填充已有占位

`useStreamChat.handleStream` 现在接收明确的 `threadId` 参数，不再依赖外部 `currentThreadId`。

它还支持 `{ appendMessages: false }`：

- 普通发送：追加用户消息和 AI 空占位。
- 新会话首条 pending：不重复追加消息，只填充已经持久化并显示的 AI 占位。
- 如果 React state 尚未恢复消息，则兜底补出用户消息和 AI 占位。

## 涉及文件

- `frontend/app/chat/components/ChatComponent.tsx`
  - 新增 pending 消息 key 和 message storage key。
  - 新建会话时先写入 `chatMessages-{threadId}`。
  - 使用 `routeThreadId` 驱动消息加载、保存和 pending 消费。
  - pending 流式请求通过 timer 延后一拍启动。

- `frontend/app/chat/hooks/useStreamChat.ts`
  - `handleStream(input, threadId, options)` 显式传入线程 ID。
  - 支持 `appendMessages: false` 以填充已有 AI 占位。

- `frontend/app/layout-context.ts`
  - `currentThreadId` 类型改为 `string | null`，支持 `/chat` 新建页没有会话 ID 的状态。

- `frontend/app/components/SiderComponent.tsx`
  - `selectedKeys` 在没有当前会话时传空数组，避免把 `null` 传给 Ant Design Menu。

- `frontend/app/chat/components/MessageBubble.tsx`
- `frontend/app/chat/components/MessageInput.tsx`
- `frontend/app/components/NewChatButton.tsx`
  - theme prop 改为复用 `AgentTheme`，修复主题字段类型不完整的问题。

## 验证

已执行：

```bash
npx.cmd tsc --noEmit
```

类型检查通过。

`npm run lint` 在当前 Windows PowerShell 环境下会被执行策略拦截；改用 `npm.cmd run lint` 后进入 Next.js ESLint 首次配置交互，因此没有自动生成 ESLint 配置。

## 后续排查建议

如果首条消息仍有异常，优先检查：

- 浏览器 `localStorage` 中是否生成了 `chatPendingMessage-{threadId}`。
- 同一个 `threadId` 下是否同时生成了 `chatMessages-{threadId}`。
- 新路由 `/chat/{threadId}` 是否正确渲染。
- `/chat/stream` 请求的 `thread_id` 是否等于路由上的 `threadId`。
- React 开发模式下是否有重复请求；如果有，重点检查 pending key 是否被重复写入或重复消费。
