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
  completedAt?: string;
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
