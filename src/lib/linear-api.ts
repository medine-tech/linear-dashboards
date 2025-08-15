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

  console.log(`Calculating metrics for team ${team.name}:`);
  console.log(`- Uses estimation: ${usesEstimation}`);
  console.log(`- Estimation type: ${team.issueEstimationType}`);
  console.log(`- Total issues: ${issues.length}`);

  let scope: number;
  let started: number;
  let completed: number;

  if (usesEstimation) {
    // Sum story points (estimates) for teams using estimation
    // Only include issues with estimate > 0 to exclude unestimated work
    console.log('Using story point calculation (excluding unestimated issues)');

    const estimatedIssues = issues.filter(issue => (issue.estimate || 0) > 0);
    console.log(`  Total issues: ${issues.length}, estimated issues: ${estimatedIssues.length}`);

    scope = estimatedIssues.reduce((sum, issue) => {
      const estimate = issue.estimate || 0;
      console.log(`  Issue ${issue.identifier}: estimate=${estimate}, state=${issue.state.type}`);
      return sum + estimate;
    }, 0);

    const startedIssues = estimatedIssues.filter(issue => isStartedState(issue.state));
    started = startedIssues.reduce((sum, issue) => sum + (issue.estimate || 0), 0);
    console.log(`  Started issues: ${startedIssues.length}, total points: ${started}`);

    const completedIssues = estimatedIssues.filter(issue => isCompletedState(issue.state));
    completed = completedIssues.reduce((sum, issue) => sum + (issue.estimate || 0), 0);
    console.log(`  Completed issues: ${completedIssues.length}, total points: ${completed}`);
  } else {
    // Count issues for teams not using estimation
    console.log('Using issue count calculation');
    scope = issues.length;
    started = issues.filter(issue => isStartedState(issue.state)).length;
    completed = issues.filter(issue => isCompletedState(issue.state)).length;
  }

  console.log(`Final metrics: scope=${scope}, started=${started}, completed=${completed}`);

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
        issueEstimationType: teamData.issueEstimationType,
        issueEstimationAllowZero: teamData.issueEstimationAllowZero,
        issueEstimationExtended: teamData.issueEstimationExtended,
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

        // Fetch issues for this cycle using appropriate query based on estimation settings
        try {
          console.log(`Fetching issues for cycle ${cycle.id}...`);
          const usesEstimation = teamUsesEstimation(team);
          const issuesQuery = usesEstimation ? GET_CYCLE_ISSUES_WITH_ESTIMATES : GET_CYCLE_ISSUES_BY_ID;

          console.log(`Using ${usesEstimation ? 'estimation-filtered' : 'all-issues'} query for team ${team.name}`);

          const { data: issuesData, error: issuesError } = await apolloClient.query({
            query: issuesQuery,
            variables: { cycleId: cycle.id },
            fetchPolicy: 'no-cache',
          });

          if (issuesError) {
            console.error(`Error fetching issues for cycle ${cycle.id}:`, issuesError);

            // Extract detailed error information for issues query
            if (issuesError.networkError) {
              const networkError = issuesError.networkError as {
                name?: string;
                message?: string;
                statusCode?: number;
                result?: { errors?: Array<{ message: string; locations?: unknown; path?: unknown; extensions?: unknown }> };
              };

              console.error('Issues Query Network Error Details:', {
                name: networkError.name,
                message: networkError.message,
                statusCode: networkError.statusCode,
                result: networkError.result
              });

              // Log the actual GraphQL errors from Linear API for issues query
              const networkResult = networkError.result;
              if (networkResult?.errors) {
                console.error('Linear API Issues Query GraphQL Errors:');
                networkResult.errors.forEach((gqlError, index: number) => {
                  console.error(`Issues Error ${index + 1}:`, {
                    message: gqlError.message,
                    locations: gqlError.locations,
                    path: gqlError.path,
                    extensions: gqlError.extensions
                  });
                });
              }
            }

            // Log individual GraphQL errors for issues query
            if (issuesError.graphQLErrors && issuesError.graphQLErrors.length > 0) {
              console.error('Issues Query GraphQL Errors from response:');
              issuesError.graphQLErrors.forEach((gqlError, index) => {
                console.error(`Issues GraphQL Error ${index + 1}:`, {
                  message: gqlError.message,
                  locations: gqlError.locations,
                  path: gqlError.path,
                  extensions: gqlError.extensions
                });
              });
            }
          } else if (issuesData?.cycle?.issues?.nodes) {
            console.log(`Found ${issuesData.cycle.issues.nodes.length} issues for cycle ${cycle.id}`);
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
