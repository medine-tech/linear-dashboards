import { getApolloClient } from './apollo-client';
import { GET_TEAMS_WITH_ACTIVE_CYCLE_ISSUES, GET_MORE_CYCLE_ISSUES, GET_TEAMS_LEADS } from './queries';
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

    // Step 1: combined query to eliminate N+1
    const { data, error } = await apolloClient.query({
      query: GET_TEAMS_WITH_ACTIVE_CYCLE_ISSUES,
      variables: { issuesPage: 200 },
      fetchPolicy: 'no-cache',
    });

    if (error) {
      console.error('Linear API Error:', error.message);
      if (error.networkError) {
        const networkError = error.networkError as { statusCode?: number; result?: { errors?: Array<{ message: string }> } };
        if (networkError.statusCode) console.error(`HTTP ${networkError.statusCode} error from Linear API`);
        networkError.result?.errors?.forEach(gqlError => console.error('Linear API Error:', gqlError.message));
      }
      throw new Error(`Failed to fetch teams data: ${error.message}`);
    }

    if (!data?.teams?.nodes) {
      throw new Error('No teams data received from Linear API');
    }

    // Best-effort: fetch leads for all teams in one call; ignore if unsupported
    const leadsByTeam = new Map<string, { id: string; name: string }>();
    try {
      const { data: leadsData } = await apolloClient.query({ query: GET_TEAMS_LEADS, fetchPolicy: 'no-cache' });
      const nodes = leadsData?.teams?.nodes || [];
      for (const t of nodes) {
        if (t.lead) leadsByTeam.set(t.id, { id: t.lead.id, name: t.lead.name });
      }
    } catch {
      console.warn('Team lead field may be unsupported; continuing without leads');
    }


    type IssueNode = {
      id: string;
      identifier?: string;
      title: string;
      estimate?: number;
      state: { id: string; name: string; type: string; color?: string };
      assignee?: { id: string; name: string; email?: string };
      createdAt: string;
      updatedAt?: string;
      startedAt?: string;
      completedAt?: string;
      labels?: { nodes: { id: string; name: string; color?: string }[] };
    };

    type IssuesPage = {
      nodes: IssueNode[];
      pageInfo?: { hasNextPage: boolean; endCursor?: string };
    };

    type TeamNode = {
      id: string;
      name: string;
      key: string;
      color?: string;
      issueEstimationType?: string;
      activeCycle?: {
        id: string;
        number: number;
        name?: string;
        startsAt: string;
        endsAt: string;
        issues: IssuesPage;
      };
    };


    // Helper: paginate a cycle's issues
    async function fetchAllCycleIssues(cycleId: string, firstPage: IssuesPage): Promise<IssueNode[]> {
      const all: IssueNode[] = [...(firstPage?.nodes || [])];
      let hasNext = firstPage?.pageInfo?.hasNextPage ?? false;
      let cursor = firstPage?.pageInfo?.endCursor;
      while (hasNext) {
        const { data: more, error: moreError } = await apolloClient.query({
          query: GET_MORE_CYCLE_ISSUES,
          variables: { cycleId, after: cursor, n: 200 },
          fetchPolicy: 'no-cache',
        });
        if (moreError) {
          console.error(`Pagination error for cycle ${cycleId}:`, moreError.message);
          break;
        }
        const page = more?.cycle?.issues;
        if (!page?.nodes?.length) break;
        all.push(...page.nodes);
        hasNext = page.pageInfo?.hasNextPage ?? false;
        cursor = page.pageInfo?.endCursor;
      }
      return all;
    }

    // Step 2: process teams and paginate cycles in parallel
    const teams: TeamMetrics[] = await Promise.all(
      data.teams.nodes.map(async (teamData: TeamNode) => {
        const team: LinearTeam = {
          id: teamData.id,
          name: teamData.name,
          key: teamData.key,
          color: teamData.color,
          issueEstimationType: teamData.issueEstimationType,
        } as LinearTeam;

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
            progress: 0,
            scopeHistory: [],
            completedScopeHistory: [],
            inProgressScopeHistory: [],
          };

          try {
            const allIssueNodes = await fetchAllCycleIssues(cycle.id, teamData.activeCycle.issues);
            issues = allIssueNodes.map((issueData: IssueNode) => ({
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
              assignee: issueData.assignee ? { id: issueData.assignee.id, name: issueData.assignee.name, email: issueData.assignee.email || '' } : undefined,
              cycle,
              createdAt: issueData.createdAt,
              updatedAt: issueData.updatedAt || issueData.createdAt,
              startedAt: issueData.startedAt,
              completedAt: issueData.completedAt,
              labels: issueData.labels,
            }));
          } catch (err) {
            console.error(`Failed to fetch or map issues for cycle ${cycle.id}:`, err);
          }
        }

        const baseMetrics = calculateTeamMetrics(team, cycle, issues);

        // Compute label counts (labels with count > 0)
        const labelMap = new Map<string, { id: string; name: string; color?: string; count: number }>();
        for (const issue of issues) {
          const labelNodes = issue.labels?.nodes || [];
          for (const lbl of labelNodes) {
            const prev = labelMap.get(lbl.id);
            labelMap.set(lbl.id, { id: lbl.id, name: lbl.name, color: lbl.color, count: (prev?.count || 0) + 1 });
          }
        }
        const labelCounts = Array.from(labelMap.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

        // Meta: Avg cycle time (completed issues)
        const completed = issues.filter(i => i.completedAt);
        let avgCycleTimeMs: number | undefined;
        if (completed.length > 0) {
          const total = completed.reduce((sum, i) => {
            const end = new Date(i.completedAt as string).getTime();
            const start = new Date((i.startedAt || i.createdAt) as string).getTime();
            return sum + Math.max(0, end - start);
          }, 0);
          avgCycleTimeMs = Math.round(total / completed.length);
        }

        // Meta: Avg open issue age (non-completed issues)
        const open = issues.filter(i => !i.completedAt);
        let avgOpenAgeMs: number | undefined;
        if (open.length > 0) {
          const now = Date.now();
          const total = open.reduce((sum, i) => sum + Math.max(0, now - new Date(i.createdAt).getTime()), 0);
          avgOpenAgeMs = Math.round(total / open.length);
        }

        // Meta: Approx triage time (startedAt - createdAt for issues that have started)
        const startedIssues = issues.filter(i => i.startedAt);
        let avgTriageTimeMs: number | undefined;
        if (startedIssues.length > 0) {
          const total = startedIssues.reduce((sum, i) => sum + Math.max(0, new Date(i.startedAt as string).getTime() - new Date(i.createdAt).getTime()), 0);
          avgTriageTimeMs = Math.round(total / startedIssues.length);
        }

        const lead = leadsByTeam.get(team.id);

        return { ...baseMetrics, labelCounts, meta: { avgCycleTimeMs, avgOpenAgeMs, avgTriageTimeMs, lead } } as TeamMetrics;
      })
    );

    return { teams, lastUpdated: new Date().toISOString() };
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
