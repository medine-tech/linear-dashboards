import { getApolloClient } from './apollo-client';
import { GET_ALL_TEAMS_WITH_CYCLES } from './queries';
import type { 
  TeamMetrics, 
  DashboardData, 
  LinearTeam, 
  LinearCycle, 
  LinearIssue,
  LinearIssueState 
} from '@/types/linear';

/**
 * Utility functions for fetching and processing Linear data
 */

/**
 * Determines if an issue state represents a "started" state
 */
function isStartedState(state: LinearIssueState): boolean {
  return state.type === 'started';
}

/**
 * Determines if an issue state represents a "completed" state
 */
function isCompletedState(state: LinearIssueState): boolean {
  return state.type === 'completed';
}

/**
 * Calculates team metrics from issues in the current cycle
 */
function calculateTeamMetrics(
  team: LinearTeam, 
  cycle: LinearCycle | null, 
  issues: LinearIssue[]
): TeamMetrics {
  const scope = issues.length;
  const started = issues.filter(issue => isStartedState(issue.state)).length;
  const completed = issues.filter(issue => isCompletedState(issue.state)).length;

  const scopePercentage = scope > 0 ? 100 : 0;
  const startedPercentage = scope > 0 ? Math.round((started / scope) * 100) : 0;
  const completedPercentage = scope > 0 ? Math.round((completed / scope) * 100) : 0;

  return {
    team,
    cycle,
    scope,
    started,
    completed,
    scopePercentage,
    startedPercentage,
    completedPercentage,
  };
}

/**
 * Fetches all teams with their current cycle data and calculates metrics
 */
export async function fetchDashboardData(): Promise<DashboardData> {
  try {
    const apolloClient = getApolloClient();
    const { data, error } = await apolloClient.query({
      query: GET_ALL_TEAMS_WITH_CYCLES,
      fetchPolicy: 'cache-first',
    });

    if (error) {
      console.error('GraphQL Error:', error);
      throw new Error(`Failed to fetch teams data: ${error.message}`);
    }

    if (!data?.teams?.nodes) {
      throw new Error('No teams data received from Linear API');
    }

    const teams: TeamMetrics[] = data.teams.nodes.map((teamData: {
      id: string;
      name: string;
      key: string;
      description?: string;
      color?: string;
      icon?: string;
      activeCycle?: {
        id: string;
        number: number;
        name?: string;
        description?: string;
        startsAt: string;
        endsAt: string;
        completedAt?: string;
        progress: number;
        scopeHistory?: number[];
        completedScopeHistory?: number[];
        inProgressScopeHistory?: number[];
        issues?: {
          nodes?: Array<{
            id: string;
            identifier: string;
            title: string;
            priority: number;
            estimate?: number;
            state: {
              id: string;
              name: string;
              type: string;
              color: string;
            };
            assignee?: {
              id: string;
              name: string;
              email: string;
              avatarUrl?: string;
            };
            createdAt: string;
            updatedAt: string;
            completedAt?: string;
          }>;
        };
      };
    }) => {
      const team: LinearTeam = {
        id: teamData.id,
        name: teamData.name,
        key: teamData.key,
        description: teamData.description,
        color: teamData.color,
        icon: teamData.icon,
      };

      const cycle: LinearCycle | null = teamData.activeCycle ? {
        id: teamData.activeCycle.id,
        number: teamData.activeCycle.number,
        name: teamData.activeCycle.name,
        description: teamData.activeCycle.description,
        startsAt: teamData.activeCycle.startsAt,
        endsAt: teamData.activeCycle.endsAt,
        completedAt: teamData.activeCycle.completedAt,
        team,
        progress: teamData.activeCycle.progress,
        scopeHistory: teamData.activeCycle.scopeHistory || [],
        completedScopeHistory: teamData.activeCycle.completedScopeHistory || [],
        inProgressScopeHistory: teamData.activeCycle.inProgressScopeHistory || [],
      } : null;

      const issues: LinearIssue[] = teamData.activeCycle?.issues?.nodes?.map((issueData: {
        id: string;
        identifier: string;
        title: string;
        priority: number;
        estimate?: number;
        state: {
          id: string;
          name: string;
          type: string;
          color: string;
        };
        assignee?: {
          id: string;
          name: string;
          email: string;
          avatarUrl?: string;
        };
        createdAt: string;
        updatedAt: string;
        completedAt?: string;
      }) => ({
        id: issueData.id,
        identifier: issueData.identifier,
        title: issueData.title,
        priority: issueData.priority,
        estimate: issueData.estimate,
        state: {
          id: issueData.state.id,
          name: issueData.state.name,
          type: issueData.state.type,
          color: issueData.state.color,
        },
        team,
        assignee: issueData.assignee ? {
          id: issueData.assignee.id,
          name: issueData.assignee.name,
          email: issueData.assignee.email,
          avatarUrl: issueData.assignee.avatarUrl,
        } : undefined,
        cycle,
        createdAt: issueData.createdAt,
        updatedAt: issueData.updatedAt,
        completedAt: issueData.completedAt,
      })) || [];

      return calculateTeamMetrics(team, cycle, issues);
    });

    return {
      teams,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
}

/**
 * Refreshes the Apollo Client cache
 */
export async function refreshCache(): Promise<void> {
  const apolloClient = getApolloClient();
  await apolloClient.refetchQueries({
    include: 'active',
  });
}
