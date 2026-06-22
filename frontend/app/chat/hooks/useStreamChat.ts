import { message } from "antd";
import type React from "react";
import { Message } from "../types/chat.types";
import { PlayerCommand } from "../../player/types";

interface UseStreamChatProps {
  agentId: string;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isStreaming: boolean;
  setIsStreaming: (value: boolean) => void;
  executePlayerCommand: (command: PlayerCommand) => Promise<void>;
}

interface HandleStreamOptions {
  appendMessages?: boolean;
  images?: string[];
}

type StreamEvent =
  | { type: "message"; content: any }
  | { type: "token"; content: string }
  | { type: "player_command"; content: PlayerCommand }
  | { type: "error"; content?: string }
  | { type: "end" };

export const useStreamChat = ({
  agentId,
  setMessages,
  isStreaming,
  setIsStreaming,
  executePlayerCommand,
}: UseStreamChatProps) => {
  const handleStream = async (
    input: string,
    threadId: string,
    options: HandleStreamOptions = {}
  ) => {
    if ((!input.trim() && !options.images?.length) || isStreaming) return;
    setIsStreaming(true);

    const newUserMessage: Message = {
      id: `user_${Date.now()}`,
      type: "user",
      content: input,
      images: options.images,
    };
    const newAiMessage: Message = {
      id: `ai_${Date.now()}`,
      type: "ai",
      content: "",
    };

    if (options.appendMessages !== false) {
      setMessages((prev: Message[]) => [...prev, newUserMessage, newAiMessage]);
    } else {
      setMessages([newUserMessage, newAiMessage]);
    }

    try {
      const requestMsg = {
        thread_id: threadId,
        role: "user",
        message: input,
        agent_id: agentId,
        images: options.images || [],
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestMsg),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body received from chat stream.");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let streamEnded = false;

      const processSseBuffer = (rawBuffer: string, flush = false) => {
        const events = rawBuffer.split(/\r?\n\r?\n/);
        const remainder = flush ? "" : events.pop() ?? "";

        events.forEach((eventBlock) => {
          const payload = eventBlock
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.replace(/^data:\s?/, ""))
            .join("\n");

          if (!payload) {
            return;
          }

          const data = JSON.parse(payload) as StreamEvent;
          switch (data.type) {
            case "message":
              handleMessageData(data.content);
              break;
            case "token":
              handleTokenData(data.content);
              break;
            case "player_command":
              handlePlayerCommand(data.content);
              break;
            case "error":
              throw new Error(data.content || "Chat stream returned an error.");
            case "end":
              streamEnded = true;
              setIsStreaming(false);
              break;
          }
        });

        return remainder;
      };

      while (!streamEnded) {
        const { done, value } = await reader.read();
        if (done) {
          buffer += decoder.decode();
          processSseBuffer(buffer, true);
          break;
        }
        buffer += decoder.decode(value, { stream: true });

        buffer = processSseBuffer(buffer);
      }
    } catch (error) {
      console.error(" Request Failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Request Failed, Please try again later.";
      message.error(errorMessage);
      setIsStreaming(false);
    }
  };

  const handleMessageData = (content: any) => {
    if (content.type === "human" && content.images?.length > 0) {
      setMessages((prev) =>
        prev.map((msg, i) =>
          i === Math.max(prev.length - 2, 0)
            ? { ...msg, images: content.images }
            : msg
        )
      );
      return;
    }
    if (content.type === "ai" && content.tool_calls.length > 0) {
      setMessages((prev) =>{
        var addCalls = []
        const calls = prev[prev.length - 1].toolCall?.calls || []
        const toolCalls = content.tool_calls;
        if(calls.length === 0){
          addCalls = toolCalls;
        }else{
          calls.map((call) => {
            for (const toolCall of toolCalls) {
              if (call.id != toolCall.id) {
                if(addCalls.find((c) => c.id === toolCall.id) == null){
                  addCalls.push(toolCall);
                }
              }
            }
          });
        }
        return prev.map((msg, i) =>
          i === prev.length - 1
            ? {
                ...msg,
                toolCall: { ...msg.toolCall, calls: [...(msg?.toolCall?.calls || []), ...addCalls] },
              }
            : msg
        )
      }
      );
    }else if (content.type === "ai" && content.content) {
      setMessages((prev) =>
        prev.map((msg, i) =>
          i === prev.length - 1 ? { ...msg, content: content.content } : msg
        )
      );
    }
    if (content.type === "tool") {
      if (isPlayerToolPayload(content.content)) {
        return;
      }
      setMessages((prev) => {
        const updatedCalls = prev[prev.length - 1].toolCall.calls.map((call) =>
          call.id === content.tool_call_id
            ? { ...call, result: content.content }
            : call
        );
        return prev.map((msg, i) =>
          i === prev.length - 1
            ? {
                ...msg,
                toolCall: { ...msg.toolCall, calls: [...updatedCalls] },
              }
            : msg
        );
      });
    }
  };

  const handlePlayerCommand = async (command: PlayerCommand) => {
    try {
      await executePlayerCommand(command);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "播放器命令执行失败";
      message.error(errorMessage);
    }
  };

  const isPlayerToolPayload = (content: string) => {
    try {
      const payload = JSON.parse(content.replaceAll("'", '"'));
      return payload?.kind === "player_command";
    } catch {
      return content.includes("player_command");
    }
  };

  const handleTokenData = (token: string) => {
    setMessages((prev) =>
      prev.map((msg, i) =>
        i === prev.length - 1 ? { ...msg, content: msg.content + token } : msg
      )
    );
  };


  return { handleStream };
};
