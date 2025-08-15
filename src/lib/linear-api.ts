import { getApolloClient } from './apollo-client';
import { GET_ALL_TEAMS_WITH_CYCLES, GET_CYCLE_ISSUES_BY_ID, GET_CYCLE_ISSUES_WITH_ESTIMATES } from './queries';
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
 * Determines if a team uses estimation (story points) or just issue counting
 */
function teamUsesEstimation(team: LinearTeam): boolean {
  // Check if the team has estimation enabled
  // issueEstimationType can be 'notUsed', 'exponential', 'fibonacci', 'linear', 'tShirt'
  return team.issueEstimationType !== undefined && team.issueEstimationType !== 'notUsed';
}

/**
 * Calculates team metrics from issues in the current cycle
 * Handles both issue counting and story point estimation
 */
function calculateTeamMetrics(
  team: LinearTeam,
  cycle: LinearCycle | null,
  issues: LinearIssue[]
): TeamMetrics {
  const usesEstimation = teamUsesEstimation(team);
  const metricType: 'issues' | 'story_points' = usesEstimation ? 'story_points' : 'issues';

  let scope: number;
  let started: number;
  let completed: number;

  if (usesEstimation) {
    // Sum story points (estimates) for teams using estimation
    // Only include issues with estimate > 0 to exclude unestimated work
    const estimatedIssues = issues.filter(issue => (issue.estimate || 0) > 0);

    scope = estimatedIssues.reduce((sum, issue) => sum + (issue.estimate || 0), 0);
    started = estimatedIssues
      .filter(issue => isStartedState(issue.state))
      .reduce((sum, issue) => sum + (issue.estimate || 0), 0);
    completed = estimatedIssues
      .filter(issue => isCompletedState(issue.state))
      .reduce((sum, issue) => sum + (issue.estimate || 0), 0);
  } else {
    // Count issues for teams not using estimation
    scope = issues.length;
    started = issues.filter(issue => isStartedState(issue.state)).length;
    completed = issues.filter(issue => isCompletedState(issue.state)).length;
  }

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
    usesEstimation,
    metricType,
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
      fetchPolicy: 'no-cache',
    });

    if (error) {
      console.error('Linear API Error:', error.message);

      // Log network errors for production debugging
      if (error.networkError) {
        const networkError = error.networkError as {
          statusCode?: number;
          result?: { errors?: Array<{ message: string }> };
        };

        if (networkError.statusCode) {
          console.error(`HTTP ${networkError.statusCode} error from Linear API`);
        }

        if (networkError.result?.errors) {
          networkError.result.errors.forEach((gqlError) => {
            console.error('Linear API Error:', gqlError.message);
          });
        }
      }

      throw new Error(`Failed to fetch teams data: ${error.message}`);
    }

    if (!data?.teams?.nodes) {
      throw new Error('No teams data received from Linear API');
    }

    // Process teams and fetch issues for each active cycle
    const teams: TeamMetrics[] = [];

    for (const teamData of data.teams.nodes) {
      const team: LinearTeam = {
        id: teamData.id,
        name: teamData.name,
        key: teamData.key,
        issueEstimationType: teamData.issueEstimationType,
        issueEstimationAllowZero: teamData.issueEstimationAllowZero,
        issueEstimationExtended: teamData.issueEstimationExtended,
      };

      let cycle: LinearCycle | null = null;
      let issues: LinearIssue[] = [];

      if (teamData.activeCycle) {
        cycle = {
          id: teamData.activeCycle.id,
          number: teamData.activeCycle.number,
          name: teamData.activeCycle.name,
          startsAt: teamData.activeCycle.startsAt,
          endsAt: teamData.activeCycle.endsAt,
          team,
          progress: 0, // We'll calculate this from issues
          scopeHistory: [],
          completedScopeHistory: [],
          inProgressScopeHistory: [],
        };

        // Fetch issues for this cycle using appropriate query based on estimation settings
        try {
          const usesEstimation = teamUsesEstimation(team);
          const issuesQuery = usesEstimation ? GET_CYCLE_ISSUES_WITH_ESTIMATES : GET_CYCLE_ISSUES_BY_ID;

          const { data: issuesData, error: issuesError } = await apolloClient.query({
            query: issuesQuery,
            variables: { cycleId: cycle.id },
            fetchPolicy: 'no-cache',
          });

          if (issuesError) {
            console.error(`Error fetching issues for cycle ${cycle.id}:`, issuesError.message);
          } else if (issuesData?.cycle?.issues?.nodes) {
            issues = issuesData.cycle.issues.nodes.map((issueData: {
              id: string;
              identifier?: string;
              title: string;
              estimate?: number;
              state: { id: string; name: string; type: string; color?: string };
              assignee?: { id: string; name: string; email?: string };
              createdAt: string;
              updatedAt?: string;
            }) => ({
              id: issueData.id,
              identifier: issueData.identifier || issueData.id,
              title: issueData.title,
              estimate: issueData.estimate,
              state: {
                id: issueData.state.id,
                name: issueData.state.name,
                type: issueData.state.type,
                color: issueData.state.color || '#000000',
              },
              team,
              assignee: issueData.assignee ? {
                id: issueData.assignee.id,
                name: issueData.assignee.name,
                email: issueData.assignee.email || '',
              } : undefined,
              cycle,
              createdAt: issueData.createdAt,
              updatedAt: issueData.updatedAt || issueData.createdAt,
            }));
          }
        } catch (issueError) {
          console.error(`Failed to fetch issues for cycle ${cycle.id}:`, issueError);
          // Continue processing other teams even if one cycle fails
        }
      }

      const teamMetrics = calculateTeamMetrics(team, cycle, issues);
      teams.push(teamMetrics);
    }

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
