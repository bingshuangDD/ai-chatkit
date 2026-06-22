"use client";

import React from "react";

import { Layout, Menu, Button, Select } from "antd";
import { useState, useEffect, useRef } from "react";
import { BarsOutlined, PlusOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import "./globals.css";
import { v4 as uuidv4 } from "uuid";
import { LayoutContext } from "./layout-context";
import SessionListItem from './components/SessionListItem';
import AgentSelector from './components/AgentSelector';
import SiderComponent from './components/SiderComponent';
import { PlayerProvider } from "./player/PlayerContext";
import GlobalPlayer from "./player/GlobalPlayer";
import { getAgentTheme } from './config/agentThemeConfig';
import {
  listSessions,
  createSession,
  deleteSession,
} from "./chat/storage/repositories/sessionRepository";
import { migrateLocalStorageToIndexedDB } from "./chat/storage/migrations/localStorageMigration";
import type { ChatSessionRecord } from "./chat/storage/schema";

const { Header, Content } = Layout;

// Since ReactNode may not be imported correctly, use the more generic type 'any' instead
export default function RootLayout({ children }: { children: any }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [sessions, setSessions] = useState<ChatSessionRecord[]>([]);
  const [migrationDone, setMigrationDone] = useState(false);

  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);

  const [agentId, setAgentId] = useState("oa-assistant");
  const theme = getAgentTheme(agentId);

  // Run migration + load sessions on mount
  useEffect(() => {
    (async () => {
      await migrateLocalStorageToIndexedDB();
      const loaded = await listSessions();
      setSessions(loaded);
      setMigrationDone(true);
    })();
  }, []);

  // listen new-chat event
  useEffect(() => {
    const addSession = (event: CustomEvent) => {
      const { threadId, msg, agentId: eventAgentId } = event.detail;
      handleAddSession(threadId, msg, eventAgentId);
    };
    window.addEventListener("add-session", addSession as EventListener);
    return () => {
      window.removeEventListener("add-session", addSession as EventListener);
    };
  }, [agentId]);

  const handleAddSession = async (
    newThreadId: string,
    startMsg: string,
    eventAgentId?: string
  ) => {
    if (!newThreadId) {
      newThreadId = uuidv4();
    }
    if (!startMsg) {
      startMsg = `greet ${new Date().toLocaleString()}`;
    }

    const usedAgentId = eventAgentId ?? agentId;

    await createSession({
      threadId: newThreadId,
      name: startMsg.substring(0, 10),
      agentId: usedAgentId,
      lastMessagePreview: startMsg.substring(0, 50),
    });

    setSessions((prev) => {
      const now = Date.now();
      const newSession: ChatSessionRecord = {
        threadId: newThreadId,
        name: startMsg.substring(0, 10),
        agentId: usedAgentId,
        createdAt: now,
        updatedAt: now,
        lastMessagePreview: startMsg.substring(0, 50),
      };
      return [...prev, newSession];
    });

    setCurrentThreadId(newThreadId);
    router.push(`/chat/${newThreadId}`);
  };

  // delete session
  const handleDeleteSession = async (delThreadId: string) => {
    await deleteSession(delThreadId);
    const newSessions = sessions.filter(
      (session) => session.threadId !== delThreadId
    );
    setSessions(newSessions);
    if (newSessions.length > 0) {
      const nextThreadId = [...newSessions].reverse()[0]?.threadId || "";
      setCurrentThreadId(nextThreadId);
      router.push(`/chat/${nextThreadId}`);
    } else {
      setCurrentThreadId(null);
      router.push("/chat");
    }
  };

  const handlerNewChat = () => {
    setCurrentThreadId(null);
    router.push("/chat");
  };

  const selectAgent = (value: string) => {
    console.log("selectAgent", value);
    setAgentId(value);
    handlerNewChat();
  };

  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    const reversedSessions = [...sessions].reverse();
    setItems(() => {
      return reversedSessions.map((session) => ({
        key: session.threadId,
        label: <SessionListItem session={{
          threadId: session.threadId,
          name: session.name,
          lastUpdated: session.updatedAt,
        }} onDelete={handleDeleteSession} />,
      }));
    });
  }, [sessions]);

  return (
    <LayoutContext.Provider value={{ agentId, setAgentId, currentThreadId, setCurrentThreadId }}>
      <PlayerProvider>
        <html>
          <body className="min-h-screen pb-20 transition-colors duration-500" style={{ background: theme.secondaryGradient, color: theme.text }}>
            <Layout style={{ minHeight: "auto" }}>
              <SiderComponent
                collapsed={collapsed}
                onCollapse={setCollapsed}
                sessions={sessions.map(s => ({
                  threadId: s.threadId,
                  name: s.name,
                  lastUpdated: s.updatedAt,
                }))}
                handleDeleteSession={handleDeleteSession}
                handlerNewChat={handlerNewChat}
                items={items}
                onSelectSession={(key) => {
                  setCurrentThreadId(key);
                  router.push(`/chat/${key}`);
                }}
                theme={theme}
              />
              <Layout>
                <Header style={{ background: theme.surfaceGradient, color: theme.text, transition: 'background 0.5s ease' }} className="p-0 flex flex-nowrap">
                  <BarsOutlined
                    onClick={() => setCollapsed(!collapsed)}
                    className="ml-4 text-xl"
                  />
                  <div className="flex items-center ml-8 flex-none shrink-0">
                    <span className="text-base">AI-Agent:</span>
                    <AgentSelector value={agentId} onChange={selectAgent} />
                  </div>
                </Header>
                <Content className="m-4 p-6 min-h-[calc(100vh-120px)] transition-colors duration-500" style={{ background: theme.surfaceGradient }}>
                  {migrationDone ? children : <div className="flex items-center justify-center h-full">Loading...</div>}
                </Content>
              </Layout>
            </Layout>
            <GlobalPlayer />
          </body>
        </html>
      </PlayerProvider>
    </LayoutContext.Provider>
  );
}
