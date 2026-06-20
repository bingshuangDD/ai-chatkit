/**
 * Agent theme configuration
 * 根据 agentId 提供角色主题色
 */

export interface AgentTheme {
  primary: string;
  primaryGradient: string;
  secondary: string;
  secondaryGradient: string;
  surface: string;
  surfaceGradient: string;
  text: string;
  accent: string;
  accentGradient: string;
  border: string;
}

export const agentThemes: Record<string, AgentTheme> = {
  "character-ameath": {
    primary: "#F4C4D6",
    primaryGradient: "linear-gradient(180deg, #F4C4D6 0%, #FBE8F1 100%)",
    secondary: "#FBE8F1",
    secondaryGradient: "linear-gradient(180deg, #FDECF2 0%, #FFF5FB 100%)",
    surface: "#FFF5FB",
    surfaceGradient: "linear-gradient(180deg, #FFF5FB 0%, #FDF1F8 100%)",
    text: "#5A2A4F",
    accent: "#E16AB2",
    accentGradient: "linear-gradient(180deg, #E16AB2 0%, #F8C1DD 100%)",
    border: "#F0B4D2"
  },
  "oa-assistant": {
    primary: "#1D4ED8",
    primaryGradient: "linear-gradient(180deg, #2563EB 0%, #93C5FD 100%)",
    secondary: "#EFF6FF",
    secondaryGradient: "linear-gradient(180deg, #EFF6FF 0%, #FFFFFF 100%)",
    surface: "#FFFFFF",
    surfaceGradient: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFF 100%)",
    text: "#0F172A",
    accent: "#2563EB",
    accentGradient: "linear-gradient(180deg, #2563EB 0%, #60A5FA 100%)",
    border: "#BFDBFE"
  },
  "multi-agent-supervisor": {
    primary: "#111827",
    primaryGradient: "linear-gradient(180deg, #111827 0%, #4B5563 100%)",
    secondary: "#E5E7EB",
    secondaryGradient: "linear-gradient(180deg, #E5E7EB 0%, #F8FAFC 100%)",
    surface: "#F8FAFC",
    surfaceGradient: "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
    text: "#0F172A",
    accent: "#2563EB",
    accentGradient: "linear-gradient(180deg, #2563EB 0%, #60A5FA 100%)",
    border: "#D1D5DB"
  },
  default: {
    primary: "#1D4ED8",
    primaryGradient: "linear-gradient(180deg, #2563EB 0%, #93C5FD 100%)",
    secondary: "#EFF6FF",
    secondaryGradient: "linear-gradient(180deg, #EFF6FF 0%, #FFFFFF 100%)",
    surface: "#FFFFFF",
    surfaceGradient: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFF 100%)",
    text: "#0F172A",
    accent: "#2563EB",
    accentGradient: "linear-gradient(180deg, #2563EB 0%, #60A5FA 100%)",
    border: "#BFDBFE"
  }
};

export function getAgentTheme(agentId?: string): AgentTheme {
  if (!agentId || !agentThemes[agentId]) {
    return agentThemes.default;
  }

  return agentThemes[agentId];
}
