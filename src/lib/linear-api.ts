import { getApolloClient } from './apollo-client';
import { GET_ALL_TEAMS_WITH_CYCLES, GET_CYCLE_ISSUES_BY_ID } from './queries';
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
    console.log('Creating Apollo client...');
    const apolloClient = getApolloClient();

    console.log('Executing GraphQL query...');
    const { data, error } = await apolloClient.query({
      query: GET_ALL_TEAMS_WITH_CYCLES,
      fetchPolicy: 'no-cache', // Use no-cache for debugging
    });

    if (error) {
      console.error('GraphQL Error details:', {
        message: error.message,
        graphQLErrors: error.graphQLErrors,
        networkError: error.networkError,
        extraInfo: error.extraInfo
      });

      // Extract detailed error information from networkError
      if (error.networkError) {
        console.error('Network Error Details:', {
          name: error.networkError.name,
          message: error.networkError.message,
          statusCode: (error.networkError as { statusCode?: number }).statusCode,
          result: (error.networkError as { result?: unknown }).result
        });

        // Log the actual GraphQL errors from Linear API
        const networkResult = (error.networkError as { result?: { errors?: Array<{ message: string; locations?: unknown; path?: unknown; extensions?: unknown }> } }).result;
        if (networkResult?.errors) {
          console.error('Linear API GraphQL Errors:');
          networkResult.errors.forEach((gqlError, index: number) => {
            console.error(`Error ${index + 1}:`, {
              message: gqlError.message,
              locations: gqlError.locations,
              path: gqlError.path,
              extensions: gqlError.extensions
            });
          });
        }
      }

      // Log individual GraphQL errors
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        console.error('GraphQL Errors from response:');
        error.graphQLErrors.forEach((gqlError, index) => {
          console.error(`GraphQL Error ${index + 1}:`, {
            message: gqlError.message,
            locations: gqlError.locations,
            path: gqlError.path,
            extensions: gqlError.extensions
          });
        });
      }

      throw new Error(`Failed to fetch teams data: ${error.message}`);
    }

    console.log('Raw GraphQL response:', JSON.stringify(data, null, 2));

    if (!data?.teams?.nodes) {
      console.error('Invalid data structure received:', data);
      throw new Error('No teams data received from Linear API');
    }

    console.log(`Found ${data.teams.nodes.length} teams`);

    // Process teams and fetch issues for each active cycle
    const teams: TeamMetrics[] = [];

    for (const teamData of data.teams.nodes) {
      console.log(`Processing team: ${teamData.name} (${teamData.id})`);

      const team: LinearTeam = {
        id: teamData.id,
        name: teamData.name,
        key: teamData.key,
      };

      let cycle: LinearCycle | null = null;
      let issues: LinearIssue[] = [];

      if (teamData.activeCycle) {
        console.log(`Team ${teamData.name} has active cycle: ${teamData.activeCycle.name || teamData.activeCycle.number}`);

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

        // Fetch issues for this cycle
        try {
          console.log(`Fetching issues for cycle ${cycle.id}...`);
          const { data: issuesData, error: issuesError } = await apolloClient.query({
            query: GET_CYCLE_ISSUES_BY_ID,
            variables: { cycleId: cycle.id },
            fetchPolicy: 'no-cache',
          });

          if (issuesError) {
            console.error(`Error fetching issues for cycle ${cycle.id}:`, issuesError);
          } else if (issuesData?.issues?.nodes) {
            console.log(`Found ${issuesData.issues.nodes.length} issues for cycle ${cycle.id}`);
            issues = issuesData.issues.nodes.map((issueData: {
              id: string;
              identifier?: string;
              title: string;
              state: { id: string; name: string; type: string; color?: string };
              assignee?: { id: string; name: string; email?: string };
              createdAt: string;
              updatedAt?: string;
            }) => ({
              id: issueData.id,
              identifier: issueData.identifier || issueData.id,
              title: issueData.title,
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
      } else {
        console.log(`Team ${teamData.name} has no active cycle`);
      }

      const teamMetrics = calculateTeamMetrics(team, cycle, issues);
      teams.push(teamMetrics);
    }

    console.log(`Processed ${teams.length} teams successfully`);

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
