/**
 * TypeScript types for Linear API responses
 */

export interface LinearUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
  description?: string;
  color?: string;
  icon?: string;
  issueEstimationType?: string;
  issueEstimationAllowZero?: boolean;
  issueEstimationExtended?: boolean;
}

export interface LinearCycle {
  id: string;
  number: number;
  name?: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  completedAt?: string;
  team: LinearTeam;
  progress: number;
  scopeHistory: number[];
  completedScopeHistory: number[];
  inProgressScopeHistory: number[];
}

export interface LinearIssueState {
  id: string;
  name: string;
  type: string; // Linear API returns various state types, not just the predefined ones
  color: string;
}

export interface LinearLabel {
  id: string;
  name: string;
  color?: string;
}

export interface LabelCount {
  id: string;
  name: string;
  color?: string;
  count: number;
}


export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  priority: number;
  estimate?: number;
  state: LinearIssueState;
  team: LinearTeam;
  assignee?: LinearUser;
  cycle?: LinearCycle | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  labels?: { nodes: LinearLabel[] };
}

export interface TeamMetrics {
  team: LinearTeam;
  cycle: LinearCycle | null;
  scope: number;
  started: number;
  completed: number;
  scopePercentage: number;
  startedPercentage: number;
  completedPercentage: number;
  usesEstimation: boolean;
  metricType: 'issues' | 'story_points';
  labelCounts?: LabelCount[];
  meta?: {
    avgCycleTimeMs?: number;
    avgTriageTimeMs?: number;
    avgOpenAgeMs?: number;
    lead?: { id: string; name: string };
  };
}

export interface DashboardData {
  teams: TeamMetrics[];
  lastUpdated: string;
}

// GraphQL Response Types
export interface TeamsResponse {
  teams: {
    nodes: LinearTeam[];
  };
}

export interface CyclesResponse {
  cycles: {
    nodes: LinearCycle[];
  };
}

export interface IssuesResponse {
  issues: {
    nodes: LinearIssue[];
  };
}
