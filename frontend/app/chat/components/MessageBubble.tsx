import React from 'react';
import { Avatar, Collapse, Spin } from 'antd';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types/chat.types';
import { useLayoutContext } from '../../layout-context';
import { getAgentIcon, hasCustomIcon, getAgentColor } from '../../config/agentConfig';


interface MessageBubbleProps {
  message: Message;
  isStreaming: boolean;
  theme: {
    primary: string;
    secondary: string;
    surface: string;
    text: string;
    accent: string;
    border: string;
  };
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isStreaming, theme }) => {
  const { type, content, toolCall } = message;
  const { agentId } = useLayoutContext();

  // AI消息时，检查是否有自定义头像
  const isAiMessage = type === 'ai';
  const shouldUseCustomIcon = isAiMessage && hasCustomIcon(agentId);
  const customIconUrl = shouldUseCustomIcon ? getAgentIcon(agentId) : null;
  const agentColor = getAgentColor(agentId);

  return (
    <div className={`mb-4 ${type === 'user' ? 'text-right flex justify-end' : 'text-left'}`}>
      <div className={`flex ${type === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-3 max-w-2xl`}>
        {shouldUseCustomIcon && customIconUrl ? (
          // AI消息且有自定义头像时，显示图片头像
          <Avatar
            size={40}
            src={customIconUrl}
            className="flex-shrink-0"
          />
        ) : (
          // 默认头像（用户消息或AI消息无自定义头像）
          <Avatar
            size={40}
            className={`${type === 'user' ? 'bg-blue-500' : agentColor} text-white flex-shrink-0 transition-colors duration-500`}
          >
            {type === 'user' ? <UserOutlined /> : <RobotOutlined />}
          </Avatar>
        )}
        <div style={{ background: type === 'user' ? theme.secondaryGradient : theme.surfaceGradient, transition: 'background 0.5s ease' }} className="p-3 rounded-lg flex-1">
          {type === 'ai' && isStreaming && content === '' ? (
            toolCall ? <div><Spin size="small" /> invoking tool...</div> : <Spin size="small" />
          ) : (
            <> 
              {toolCall?.calls && (
                <Collapse defaultActiveKey={['0']} className="mt-2" style={{ borderColor: theme.border }}>
                  {toolCall.calls.map((call: any, index: number) => (
                    <Collapse.Panel header={`Tool ${index + 1}: ${call.name}`} key={index}>
                      <p className="mb-2">input：{JSON.stringify(call.args)}</p>
                      {call.result && <p>result：{call.result}</p>}
                    </Collapse.Panel>
                  ))}
                </Collapse>
              )}
              <ReactMarkdown>{content}</ReactMarkdown>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;