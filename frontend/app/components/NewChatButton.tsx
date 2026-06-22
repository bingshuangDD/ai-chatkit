import React from 'react';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { AgentTheme } from '../config/agentThemeConfig';

interface NewChatButtonProps {
  collapsed: boolean;
  onClick: () => void;
  theme: AgentTheme;
}

const NewChatButton: React.FC<NewChatButtonProps> = ({ collapsed, onClick, theme }) => {
  return (
    <Button
      type="primary"
      onClick={onClick}
      icon={<PlusOutlined />}
      style={{
        margin: "16px",
        width: collapsed ? "40px" : "calc(100% - 32px)",
        background: theme.accentGradient,
        borderColor: theme.border,
        transition: 'background 0.5s ease',
      }}
      shape={collapsed ? "circle" : "round"}
    >
      {!collapsed && "NEW CHAT"}
    </Button>
  );
};

export default NewChatButton;
