"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { message as antMessage } from "antd";
import MessageInput from "../components/MessageInput";
import { useLayoutContext } from '../../layout-context';
import { Message, ChatComponentProps } from '../types/chat.types';
import { useStreamChat } from '../hooks/useStreamChat';
import MessageBubble from '../components/MessageBubble';
import ImageGenerationConfirm from "../components/ImageGenerationConfirm";
import { usePlayer } from '../../player/usePlayer';
import { getAgentTheme } from '../../config/agentThemeConfig';
import {
  hydrateMessages,
  persistUiMessages,
} from "../storage/repositories/messageRepository";
import {
  savePendingMessage,
  consumePendingMessage,
} from "../storage/repositories/pendingMessageRepository";
import { saveImageAsset, saveGeneratedImageAsset, listAssetsByThread } from "../storage/repositories/assetRepository";
import { blobToDataUrl } from "../storage/utils/dataUrl";
import { requestImageGeneration } from "../workflows/imageGenerationWorkflow";
import { buildGenerateImageRequest } from "../workflows/imageGenerationTypes";

const ChatComponent: React.FC<ChatComponentProps> = ({ threadId }) => {
  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showGenConfirm, setShowGenConfirm] = useState(false);
  const genPendingRef = useRef<{ prompt: string; threadId: string; referenceImages: string[] } | null>(null);
  const consumedPendingThreadRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const { agentId, setAgentId, currentThreadId, setCurrentThreadId } = useLayoutContext();
  const { executeCommand } = usePlayer();
  const routeThreadId = threadId || null;

  // Keep ref in sync for debounced persist
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const createInitialMessages = (content: string, initialImages: string[] = []): Message[] => [
    {
      id: `user_${Date.now()}`,
      type: "user",
      content,
      ...(initialImages.length > 0 ? { images: initialImages } : {}),
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

  // Sync routeThreadId to layout context
  useEffect(() => {
    if (routeThreadId) {
      setCurrentThreadId(routeThreadId);
    } else {
      setCurrentThreadId(null);
    }
  }, [routeThreadId]);

  // Load messages from IndexedDB when entering a thread
  useEffect(() => {
    if (!routeThreadId) return;

    (async () => {
      const hydrated = await hydrateMessages(routeThreadId);
      setMessages(hydrated);
    })();
  }, [routeThreadId]);

  // Debounced persist to IndexedDB (avoids writing on every token during streaming)
  const debouncedPersist = useCallback(() => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = setTimeout(async () => {
      const currentMessages = messagesRef.current;
      if (currentMessages.length > 0 && routeThreadId) {
        try {
          await persistUiMessages(routeThreadId, currentMessages);
        } catch (e) {
          console.error("[ai-chatkit] Failed to persist messages:", e);
        }
      }
    }, 500);
  }, [routeThreadId]);

  // Trigger persist when messages change
  useEffect(() => {
    if (!routeThreadId || messages.length === 0) return;
    debouncedPersist();
  }, [messages, routeThreadId, debouncedPersist]);

  // Force persist when streaming ends
  useEffect(() => {
    if (!isStreaming && messages.length > 0 && routeThreadId) {
      // Flush immediately
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      persistUiMessages(routeThreadId, messages).catch((e) =>
        console.error("[ai-chatkit] Failed to persist messages on stream end:", e)
      );
    }

    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
    };
  }, [isStreaming]);

  // Consume pending message (first-message handoff from /chat → /chat/[threadId])
  useEffect(() => {
    if (
      !routeThreadId ||
      consumedPendingThreadRef.current === routeThreadId
    ) {
      return;
    }

    (async () => {
      const pending = await consumePendingMessage(routeThreadId);
      if (!pending) return;

      consumedPendingThreadRef.current = routeThreadId;

      // Convert pending image asset ids back to data URLs for the stream
      let pendingImages: string[] = [];
      if (pending.imageAssetIds && pending.imageAssetIds.length > 0) {
        // Images are already in assets store; convert to data URLs for backend protocol
        const { getAsset } = await import("../storage/repositories/assetRepository");
        const { blobToDataUrl } = await import("../storage/utils/dataUrl");
        for (const assetId of pending.imageAssetIds) {
          const asset = await getAsset(assetId);
          if (asset) {
            const dataUrl = await blobToDataUrl(asset.blob);
            pendingImages.push(dataUrl);
          }
        }
      }

      // Small delay to ensure the component is fully mounted
      const streamTimer = window.setTimeout(() => {
        handleStream(pending.message || "", routeThreadId, {
          appendMessages: false,
          images: pendingImages.length > 0 ? pendingImages : undefined,
        }).catch((error) => {
          console.error("handleStream failed after initiating thread:", error);
          setIsStreaming(false);
        });
      }, 0);

      return () => window.clearTimeout(streamTimer);
    })();
  }, [routeThreadId]);

  console.log("chat agentId", agentId);
  console.log("chat threadId", currentThreadId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => scrollToBottom(), [messages]);

  const theme = getAgentTheme(agentId);

  const handleSend = async () => {
    if ((!input.trim() && images.length === 0) || isStreaming) return;

    const threadIdToUse = routeThreadId || uuidv4();
    const currentImages = [...images];

    if (!routeThreadId) {
      // ===== New session: persist initial messages + pending message =====

      // First, convert images to assets in IndexedDB
      const imageAssetIds: string[] = [];
      for (const img of currentImages) {
        const asset = await saveImageAsset({
          threadId: threadIdToUse,
          dataUrlOrBlob: img,
          kind: "user_upload",
          source: "input",
        });
        imageAssetIds.push(asset.id);
      }

      // Create initial UI messages
      const initialMessages = createInitialMessages(input, currentImages);

      // Persist messages to IndexedDB (images are data URLs here; persistUiMessages will extract)
      await persistUiMessages(threadIdToUse, initialMessages);

      // Save pending message for the target route to consume
      await savePendingMessage({
        threadId: threadIdToUse,
        message: input,
        imageAssetIds: imageAssetIds.length > 0 ? imageAssetIds : undefined,
        agentId,
        createdAt: Date.now(),
      });

      // Dispatch add-session event for the sidebar
      window.dispatchEvent(
        new CustomEvent("add-session", {
          detail: { threadId: threadIdToUse, msg: input, agentId },
        })
      );

      setInput("");
      setImages([]);
      return;
    }

    // ===== Existing session: send immediately =====
    const messageToSend = input;
    setInput("");
    setImages([]);
    setIsStreaming(true);
    await handleStream(messageToSend, threadIdToUse, { images: currentImages });
  };

  // ---- Image generation workflow ------------------------------------------

  /** Gather reference images from current input + session's recent uploads. */
  const gatherReferenceImages = useCallback(async (): Promise<{ images: string[]; assetIds: string[] }> => {
    const refImages: string[] = [];
    const refAssetIds: string[] = [];

    // 1. Current attached images
    if (images.length > 0) {
      refImages.push(...images);
    }

    // 2. Most recent user_upload assets from IndexedDB (if session exists)
    if (routeThreadId) {
      try {
        const allAssets = await listAssetsByThread(routeThreadId);
        const uploads = allAssets
          .filter((a) => a.kind === "user_upload")
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 2);

        for (const asset of uploads) {
          if (asset.remoteUrl) {
            refImages.push(asset.remoteUrl);
          } else {
            try {
              const dataUrl = await blobToDataUrl(asset.blob);
              refImages.push(dataUrl);
            } catch {
              // Skip assets that can't be converted
            }
          }
          refAssetIds.push(asset.id);
        }
      } catch {
        // Ignore IndexedDB errors during gathering
      }
    }

    return { images: refImages.slice(0, 4), assetIds: refAssetIds };
  }, [images, routeThreadId]);

  /** Open confirm dialog from the input area button. */
  const handleGenerateImageClick = useCallback(async () => {
    if ((!input.trim() && images.length === 0) || isStreaming || isGeneratingImage) return;

    const { images: refImages } = await gatherReferenceImages();
    genPendingRef.current = {
      prompt: input.trim(),
      threadId: routeThreadId || uuidv4(),
      referenceImages: refImages,
    };
    setShowGenConfirm(true);
  }, [input, images, isStreaming, isGeneratingImage, routeThreadId, gatherReferenceImages]);

  /** User confirmed — execute the generation workflow. */
  const handleGenConfirm = useCallback(async () => {
    setShowGenConfirm(false);
    const pending = genPendingRef.current;
    if (!pending) return;
    genPendingRef.current = null;

    const threadIdToUse = pending.threadId;
    const needNewSession = !routeThreadId;

    setIsGeneratingImage(true);

    // Insert pending AI message
    const pendingAiMsgId = `ai_img_pending_${Date.now()}`;
    const pendingAiMsg: Message = {
      id: pendingAiMsgId,
      type: "ai",
      content: "", // Will be updated after generation
    };

    // If new session, create user message + pending AI
    if (needNewSession) {
      const userMsg: Message = {
        id: `user_${Date.now()}`,
        type: "user",
        content: pending.prompt,
        images: images.length > 0 ? [...images] : undefined,
      };
      setMessages([userMsg, pendingAiMsg]);

      // Persist user message images to IndexedDB
      const imageAssetIds: string[] = [];
      for (const img of images) {
        try {
          const asset = await saveImageAsset({
            threadId: threadIdToUse,
            dataUrlOrBlob: img,
            kind: "user_upload",
            source: "input",
          });
          imageAssetIds.push(asset.id);
        } catch { /* ignore */ }
      }

      await persistUiMessages(threadIdToUse, [
        { ...userMsg, imageAssetIds: imageAssetIds.length > 0 ? imageAssetIds : undefined },
        pendingAiMsg,
      ]);

      window.dispatchEvent(
        new CustomEvent("add-session", {
          detail: { threadId: threadIdToUse, msg: pending.prompt, agentId },
        })
      );
    } else {
      setMessages((prev) => [...prev, pendingAiMsg]);
    }

    // Call the backend workflow
    try {
      const request = buildGenerateImageRequest(
        threadIdToUse,
        pending.prompt,
        pending.referenceImages,
      );

      const response = await requestImageGeneration(request);

      // Save generated images to IndexedDB
      const generatedAssetIds: string[] = [];
      for (const img of response.images) {
        try {
          const asset = await saveGeneratedImageAsset({
            threadId: threadIdToUse,
            imageUrl: img.url,
            prompt: response.prompt,
            metadata: {
              size: img.size,
              raw_user_prompt: response.raw_user_prompt,
              model: response.model,
            },
          });
          generatedAssetIds.push(asset.id);
        } catch {
          // Failed to save to IndexedDB, but image URL is still valid
        }
      }

      // Update AI message with results
      const resultContent = response.images.length > 0
        ? `已生成图片。\n\n提示词：${response.prompt}`
        : "即梦生图完成，但未返回图片。";

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === pendingAiMsgId
            ? {
                ...msg,
                content: resultContent,
                generatedImages: response.images.map((i) => i.url),
                generatedAssetIds: generatedAssetIds.length > 0 ? generatedAssetIds : undefined,
              }
            : msg,
        ),
      );
    } catch (error) {
      const errorText =
        error instanceof Error ? error.message : "即梦生图失败";

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === pendingAiMsgId
            ? { ...msg, content: `即梦生图失败：${errorText}` }
            : msg,
        ),
      );
      antMessage.error(errorText);
    } finally {
      setIsGeneratingImage(false);
      setInput("");
      setImages([]);
    }
  }, [routeThreadId, images, agentId, setMessages, setInput, setImages, persistUiMessages]);

  const handleGenCancel = useCallback(() => {
    setShowGenConfirm(false);
    genPendingRef.current = null;
  }, []);

  return (
    <div className="h-full">
      <div className="chat-messages overflow-y-auto p-4 h-[calc(100vh-280px)]">
        {messages.length === 0 && (
          <div className="flex flex-col justify-center items-center min-h-full text-gray-600 space-y-2">
            <div className="text-2xl font-medium">Welcome to use the AI ChatKit</div>
            <div className="text-base">
              You can start typing your questions now and I'll be here to help you!
            </div>
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
        onGenerateImage={handleGenerateImageClick}
        isGeneratingImage={isGeneratingImage}
      />
      <ImageGenerationConfirm
        open={showGenConfirm}
        onConfirm={handleGenConfirm}
        onCancel={handleGenCancel}
        loading={isGeneratingImage}
        referenceCount={genPendingRef.current?.referenceImages.length ?? 0}
      />
    </div>
  );
};

export default ChatComponent;
