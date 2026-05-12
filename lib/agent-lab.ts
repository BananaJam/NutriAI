export const AGENT_SDK_IDS = [
  "vercel-ai",
  "openai-agents",
  "langgraph",
] as const;

export type AgentSdkId = (typeof AGENT_SDK_IDS)[number];

export const AGENT_LAB_SCENARIOS = [
  {
    id: "high-protein-breakfast",
    title: "High-Protein Breakfast",
    prompt: "Find a high-protein breakfast from my saved foods.",
    summary: "Read-heavy lookup of saved foods and recommendations.",
    expectedTools: ["searchFoods", "getUserProfile", "getActiveGoals"],
    mutatesData: false,
  },
  {
    id: "log-recent-lunch",
    title: "Log Recent Lunch",
    prompt: "Add one of my recent lunches to today.",
    summary: "Reads recent foods and performs a log mutation.",
    expectedTools: ["getDailyLog", "searchFoods", "logFood"],
    mutatesData: true,
  },
  {
    id: "weekly-nutrition-review",
    title: "Weekly Nutrition Review",
    prompt: "Summarize my nutrition this week against my goals.",
    summary: "Range stats plus target-aware analysis.",
    expectedTools: ["getUserStats", "getActiveGoals", "getUserProfile"],
    mutatesData: false,
  },
  {
    id: "calculate-macros",
    title: "Calculate Macros",
    prompt: "Calculate recommended macros from my current profile data.",
    summary: "Profile-driven recommendation and calculation flow.",
    expectedTools: ["getUserProfile", "calculateMacros"],
    mutatesData: false,
  },
] as const;

export type AgentLabScenarioId = (typeof AGENT_LAB_SCENARIOS)[number]["id"];

export type AgentLabToolEventState = "call" | "result" | "error";
export type AgentLabRunStatus = "pending" | "running" | "completed" | "failed";

export interface AgentLabToolEvent {
  id: string;
  runId: string;
  position: number;
  toolName: string;
  state: AgentLabToolEventState;
  args: unknown;
  result: unknown;
  createdAt: string;
}

export interface AgentLabRun {
  id: string;
  sdk: AgentSdkId;
  scenarioId: AgentLabScenarioId;
  conversationId: string | null;
  prompt: string;
  response: string | null;
  status: AgentLabRunStatus;
  latencyMs: number | null;
  error: string | null;
  rawTrace: unknown;
  createdAt: string;
  updatedAt: string;
  toolEvents: AgentLabToolEvent[];
}

export interface AgentLabRunListResponse {
  runs: AgentLabRun[];
}

export interface AgentLabRunResponse {
  run: AgentLabRun;
}

export function getAgentLabScenario(scenarioId: AgentLabScenarioId) {
  return AGENT_LAB_SCENARIOS.find((scenario) => scenario.id === scenarioId);
}
