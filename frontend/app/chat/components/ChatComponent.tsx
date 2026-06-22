import React, { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import MessageInput from "../components/MessageInput";
import { useLayoutContext } from '../../layout-context';
import { Message, ChatComponentProps } from '../types/chat.types';
import { useStreamChat } from '../hooks/useStreamChat';
import MessageBubble from '../components/MessageBubble';
import { usePlayer } from '../../player/usePlayer';
import { getAgentTheme } from '../../config/agentThemeConfig';

const ChatComponent: React.FC<ChatComponentProps> = ({
  threadId,
}) => {
  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const consumedPendingThreadRef = useRef<string | null>(null);
  const messagesEndRef = useRef(null);
  const { agentId, setAgentId, currentThreadId, setCurrentThreadId } = useLayoutContext()
  const { executeCommand } = usePlayer();
  const routeThreadId = threadId || null;

  const getPendingMessageKey = (id: string) => `chatPendingMessage-${id}`;
  const getMessageStorageKey = (id: string) => `chatMessages-${id}`;

  const createInitialMessages = (content: string, initialImages: string[] = []): Message[] => [
    {
      id: `user_${Date.now()}`,
      type: "user",
      content,
      images: initialImages,
    },
    {
      id: `ai_${Date.now()}`,
      type: "ai",
      content: "",
    },
  ];

  const { handleStream } = useStreamChat({
    agentId,
    setMessages,
    isStreaming,
    setIsStreaming,
    executePlayerCommand: executeCommand,
  });

  useEffect(() => {
    if (routeThreadId) {
      setCurrentThreadId(routeThreadId);
    } else {
      setCurrentThreadId(null);
    }
  }, [routeThreadId]);

  useEffect(() => {
    if (!routeThreadId) {
      return;
    }

    const storedMessages = localStorage.getItem(getMessageStorageKey(routeThreadId));

    if (storedMessages) {
      setMessages(JSON.parse(storedMessages));
    } else {
      setMessages([]);
    }
  }, [routeThreadId]);

  useEffect(() => {
    if (
      !routeThreadId ||
      consumedPendingThreadRef.current === routeThreadId
    ) {
      return;
    }

    const pendingMessageKey = getPendingMessageKey(routeThreadId);
    const pendingMessage = localStorage.getItem(pendingMessageKey);
    const pendingImages = JSON.parse(localStorage.getItem(`${pendingMessageKey}-images`) || "[]");

    if (!pendingMessage && pendingImages.length === 0) {
      return;
    }

    const streamTimer = window.setTimeout(() => {
      consumedPendingThreadRef.current = routeThreadId;
      localStorage.removeItem(pendingMessageKey);
      localStorage.removeItem(`${pendingMessageKey}-images`);
      handleStream(pendingMessage || "", routeThreadId, { appendMessages: false, images: pendingImages })
        .catch((error) => {
          console.error("handleStream failed after initiating thread:", error);
          setIsStreaming(false);
        })
    }, 0);

    return () => window.clearTimeout(streamTimer);
  }, [routeThreadId]);
  
  console.log("chat agentId", agentId)
  console.log("chat threadId", currentThreadId)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => scrollToBottom(), [messages]);

  useEffect(() => {
    if (!routeThreadId) {
      return;
    }
    if (messages.length > 0) {
      localStorage.setItem(
        getMessageStorageKey(routeThreadId),
        JSON.stringify(messages)
      );
    }
  }, [messages, routeThreadId]);


  const theme = getAgentTheme(agentId);

  const handleSend = async () => {
    if ((!input.trim() && images.length === 0) || isStreaming) return;

    const threadIdToUse = routeThreadId || uuidv4();
    const currentImages = [...images];
    if (!routeThreadId) {
      const initialMessages = createInitialMessages(input, currentImages);
      localStorage.setItem(`chatPendingMessage-${threadIdToUse}`, input);
      localStorage.setItem(`chatPendingMessage-${threadIdToUse}-images`, JSON.stringify(currentImages));
      localStorage.setItem(
        getMessageStorageKey(threadIdToUse),
        JSON.stringify(initialMessages)
      );
      window.dispatchEvent(
        new CustomEvent("add-session", {
          detail: { threadId: threadIdToUse, msg: input },
        })
      );
      setInput("");
      setImages([]);
      return;
    }

    const messageToSend = input;
    setInput("");
    setImages([]);
    setIsStreaming(true);
    await handleStream(messageToSend, threadIdToUse, { images: currentImages });
  };

  return (
    <div className="h-full">
      <div className="chat-messages overflow-y-auto p-4 h-[calc(100vh-280px)]">
        {messages.length === 0 && (
          <div className="flex flex-col justify-center items-center min-h-full text-gray-600 space-y-2">
            <div className="text-2xl font-medium">Welcome to use the AI ChatKit</div>
            <div className="text-base">
            You can start typing your questions now and I'll be here to help you!            </div>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} isStreaming={isStreaming} theme={theme} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput
        input={input}
        setInput={setInput}
        handleSend={handleSend}
        isStreaming={isStreaming}
        theme={theme}
        images={images}
        onImagesChange={setImages}
      />
    </div>
  );
};

export default ChatComponent;
