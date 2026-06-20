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

const { Header, Content } = Layout;

  // Since ReactNode may not be imported correctly, use the more generic type 'any' instead
export default function RootLayout({ children }: { children: any }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [sessions, setSessions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("chatSessions") || "[]");
    } catch (e) {
      return [];
    }
  });


  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);

  const [agentId, setAgentId] = useState("oa-assistant");
  const theme = getAgentTheme(agentId);


  //listen new-chat event
  useEffect(() => {
    const addSession = (event: CustomEvent) => {
      const { threadId, msg } = event.detail;
      handleAddSession(threadId, msg);
    };
    window.addEventListener("add-session", addSession);
    return () => {
      window.removeEventListener("add-session", addSession);
    };
  }, []);

  const handleAddSession = (newThreadId: string, startMsg: string) => {
    if (!newThreadId) {
      newThreadId = uuidv4();
    }
    if (!startMsg) {
      startMsg = `greet ${new Date().toLocaleString()}`;
    }
    const newSession = {
      threadId: newThreadId,
      name: startMsg.substring(0, 10),
      lastUpdated: Date.now(),
    };
    // left sider auto select new session
    setSessions((prev) => {
      const updated = [...prev, newSession];
      localStorage.setItem("chatSessions", JSON.stringify(updated));
      return updated;
    });
    setCurrentThreadId(newThreadId);
    router.push(`/chat/${newThreadId}`);
  };

  // delete session
  const handleDeleteSession = (delThreadId: string) => {
    const newSessions = sessions.filter(
      (session) => session.threadId !== delThreadId
    );
    setSessions(newSessions);
    localStorage.setItem("chatSessions", JSON.stringify(newSessions));
    localStorage.removeItem("chatMessages-" + delThreadId);
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

  const [items, setItems] = useState([]);
  useEffect(() => {
    const reversedSessions = [...sessions].reverse();
    setItems(() => {
      return reversedSessions.map((session) => ({
        key: session.threadId,
        label: <SessionListItem session={session} onDelete={handleDeleteSession} />,
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
                sessions={sessions}
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
                    {children}
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
