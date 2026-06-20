/**
 * Agent Configuration
 * 根据agentId将代理映射到对应的角色信息和头像
 */

export interface AgentConfig {
  icon: string | null;
  name: string;
  color: string;
}

export const agentConfig: Record<string, AgentConfig> = {
  // Ameath角色
  "character-ameath": {
    icon: '/Ameath.jpg',
    name: 'Ameath',
    color: 'bg-purple-500'
  },

  // Mornye角色
  "character-mornye": {
    icon: '/Mornye.jpg',
    name: 'Mornye',
    color: 'bg-pink-500'
  },

  // OA Assistant
  "oa-assistant": {
    icon: null,
    name: 'OA Assistant',
    color: 'bg-gray-500'
  },

  // Multi-agent supervisor
  "multi-agent-supervisor": {
    icon: null,
    name: 'Supervisor',
    color: 'bg-blue-600'
  },

  // 其他默认代理
  default: {
    icon: null,
    name: 'Assistant',
    color: 'bg-gray-500'
  }
};

/**
 * 根据agentId获取配置，如果不存在则返回默认配置
 */
export function getAgentConfig(agentId?: string): AgentConfig {
  if (!agentId || !agentConfig[agentId]) {
    return agentConfig.default;
  }
  return agentConfig[agentId];
}

/**
 * 检查agent是否有自定义头像
 */
export function hasCustomIcon(agentId?: string): boolean {
  const config = getAgentConfig(agentId);
  return config.icon !== null;
}

/**
 * 获取agent的头像路径
 */
export function getAgentIcon(agentId?: string): string | null {
  const config = getAgentConfig(agentId);
  return config.icon;
}

/**
 * 获取agent的颜色
 */
export function getAgentColor(agentId?: string): string {
  const config = getAgentConfig(agentId);
  return config.color;
}
