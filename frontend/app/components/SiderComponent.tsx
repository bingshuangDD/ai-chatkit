import React from 'react';
import { Layout, Menu } from 'antd';
import NewChatButton from './NewChatButton';
import { useLayoutContext } from '../layout-context'


interface SiderComponentProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  sessions: Array<{ threadId: string; name: string; lastUpdated: number }>;
  handleDeleteSession: (threadId: string) => void;
  handlerNewChat: () => void;
  items: Array<{ key: string; label: React.ReactNode }>;
  onSelectSession: (key: string) => void;
  theme: {
    primary: string;
    secondary: string;
    surface: string;
    text: string;
    accent: string;
    border: string;
  };
}

const { Sider } = Layout;

const SiderComponent: React.FC<SiderComponentProps> = ({ 
  collapsed, 
  onCollapse, 
  sessions, 
  handleDeleteSession, 
  handlerNewChat, 
  items,
  onSelectSession,
  theme
}) => {
  const { currentThreadId, setCurrentThreadId } = useLayoutContext()

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={200}
      style={{ background: theme.primaryGradient, transition: 'background 0.5s ease' }}
    >
      {!collapsed && (
        <div className="logo flex items-center justify-center h-16 text-white text-lg">
          AI-CHATKIT
        </div>
      )}
      <NewChatButton collapsed={collapsed} onClick={handlerNewChat} theme={theme} />
      {!collapsed && (
        <Menu
          theme="dark"
          className="max-h-[calc(100vh-180px)] overflow-y-auto transition-colors duration-500 themed-agent-menu"
          defaultSelectedKeys={[currentThreadId]}
          selectedKeys={[currentThreadId]}
          mode="inline"
          items={items}
          onSelect={({ key }) => {
            onSelectSession(key);
          }}
          style={{
            background: theme.primaryGradient,
            borderColor: theme.border,
            color: theme.text,
            '--selected-bg': theme.accent,
            '--selected-color': '#ffffff',
            '--selected-hover-bg': theme.accent + '33'
          } as React.CSSProperties}
        />
      )}
    </Sider>
  );
};

export default SiderComponent;