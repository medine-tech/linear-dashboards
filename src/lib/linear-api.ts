import { getApolloClient } from './apollo-client';
import type { ApolloQueryResult } from '@apollo/client';

import { GET_TEAMS_WITH_ACTIVE_CYCLE_ISSUES, GET_TEAMS_WITH_ACTIVE_CYCLE_ISSUES_LIGHT, GET_MORE_CYCLE_ISSUES, GET_TEAMS_LEADS, GET_ISSUE_HISTORY } from './queries';
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

    // Configurable page sizes with sane defaults
    const INITIAL_ISSUES_PAGE = Math.max(10, Math.min(100, Number(process.env.NEXT_PUBLIC_ISSUES_PAGE_INITIAL || process.env.ISSUES_PAGE_INITIAL || 50)));
    const PAGE_N = Math.max(25, Math.min(200, Number(process.env.NEXT_PUBLIC_ISSUES_PAGE_PAGINATION || process.env.ISSUES_PAGE_PAGINATION || 100)));

    // Helpers
    type ApolloNetworkError = { statusCode?: number; result?: { errors?: Array<{ message?: string }> } };
    type ApolloLikeError = { message?: string; networkError?: ApolloNetworkError };

    const hasComplexityMessageFromErrors = (errors?: Array<{ message?: string }>): boolean => {
      const msgs = (errors || []).map(e => (e?.message || '').toLowerCase());
      return msgs.some(m => m.includes('complex'));
    };

    const isComplexityError = (errOrErrors: unknown): boolean => {
      if (Array.isArray(errOrErrors)) return hasComplexityMessageFromErrors(errOrErrors as Array<{ message?: string }>);
      const apolloErr = errOrErrors as ApolloLikeError;
      if (apolloErr?.networkError?.result?.errors) {
        if (hasComplexityMessageFromErrors(apolloErr.networkError.result.errors)) return true;
      }
      if (errOrErrors instanceof Error) {
        const msg = (errOrErrors.message || '').toLowerCase();
        if (msg.includes('complex')) return true;
      }
      return false;
    };

    let data: { teams?: { nodes?: TeamNode[] } } | undefined;
    let needFirstPageLabelRefetch = false;
    let firstPageSizeUsed = INITIAL_ISSUES_PAGE;

    async function runCombined(withLabels: boolean, issuesPage: number) {
      const query = withLabels ? GET_TEAMS_WITH_ACTIVE_CYCLE_ISSUES : GET_TEAMS_WITH_ACTIVE_CYCLE_ISSUES_LIGHT;
      console.info(`Fetching combined query (withLabels=${withLabels}) with issuesPage=${issuesPage}`);
      const result: ApolloQueryResult<{ teams: { nodes: TeamNode[] } }> = await apolloClient.query({
        query,
        variables: { issuesPage },
        fetchPolicy: 'no-cache',
      });
      if (result.errors?.length) {
        console.error('Linear GraphQL errors in combined query result:');
        result.errors.forEach(e => console.error('-', e.message));
        if (isComplexityError(result.errors)) {
          const e = new Error('Query too complex (result.errors)');
          e.name = 'ComplexityError';
          throw e;
        }
      }
      return result.data;
    }

    // Step 1: combined query with fallbacks to avoid "Query too complex"
    try {
      data = await runCombined(true, INITIAL_ISSUES_PAGE);
    } catch (err) {
      if (isComplexityError(err)) {
        console.warn(`Complexity error at issuesPage=${INITIAL_ISSUES_PAGE}; retrying with smaller page size`);
        try {
          firstPageSizeUsed = Math.min(50, INITIAL_ISSUES_PAGE);
          data = await runCombined(true, firstPageSizeUsed);
        } catch (err2) {
          if (isComplexityError(err2)) {
            console.warn(`Complexity persists at issuesPage=${firstPageSizeUsed}; switching to light query without labels`);
            firstPageSizeUsed = 25;
            data = await runCombined(false, firstPageSizeUsed);
            needFirstPageLabelRefetch = true; // we'll re-fetch first page with labels per team
          } else {
            throw err2;
          }
        }
      } else {
        throw err;
      }
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

    const ENABLE_ACCURATE_TRIAGE = (process.env.NEXT_PUBLIC_ENABLE_ACCURATE_TRIAGE === 'true' || process.env.ENABLE_ACCURATE_TRIAGE === 'true');

    type HistoryNode = {
      createdAt: string;
      fromState?: { type?: string } | null;
      toState?: { type?: string } | null;
    };

    async function computeAccurateTriageAvg(issuesForTeam: LinearIssue[]): Promise<number | undefined> {
      const TRIAGE_FROM_TYPES = new Set(['triage', 'backlog']);
      const MAX_HISTORY_ISSUES = 40;
      const CONCURRENCY = Math.max(1, Math.min(10, Number(process.env.NEXT_PUBLIC_HISTORY_CONCURRENCY || process.env.HISTORY_CONCURRENCY || 6)));
      const sample = issuesForTeam.slice(0, MAX_HISTORY_ISSUES);
      if (sample.length === 0) return undefined;

      const apolloClient = getApolloClient();
      const durations: number[] = [];

      // Process in small concurrent batches to avoid overwhelming the API
      const chunks: LinearIssue[][] = [];
      for (let i = 0; i < sample.length; i += CONCURRENCY) {
        chunks.push(sample.slice(i, i + CONCURRENCY));
      }
      for (const group of chunks) {
        const results = await Promise.allSettled(
          group.map(async (iss) => {
            const { data } = await apolloClient.query({ query: GET_ISSUE_HISTORY, variables: { issueId: iss.id, first: 20 }, fetchPolicy: 'no-cache' });
            const nodes: HistoryNode[] = data?.issue?.history?.nodes || [];
            const createdAtMs = new Date(iss.createdAt).getTime();
            const leaving = nodes.find(n => TRIAGE_FROM_TYPES.has((n.fromState?.type || '').toLowerCase()) && (n.toState?.type || '').toLowerCase() !== 'triage');
            if (leaving) {
              const leftMs = new Date(leaving.createdAt).getTime();
              const d = Math.max(0, leftMs - createdAtMs);
              if (d > 0) durations.push(d);
              return;
            }
            if (iss.startedAt) {
              const d = Math.max(0, new Date(iss.startedAt).getTime() - createdAtMs);
              if (d > 0) durations.push(d);
            }
          })
        );
        // Ignore rejections per-request; continue to next batch
        results.forEach(() => { /* noop: errors are intentionally ignored */ });
      }

      if (durations.length === 0) return undefined;
      return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    }


    // Helper: paginate a cycle's issues
    async function fetchAllCycleIssues(cycleId: string, firstPage: IssuesPage): Promise<IssueNode[]> {
      const all: IssueNode[] = [...(firstPage?.nodes || [])];
      let hasNext = firstPage?.pageInfo?.hasNextPage ?? false;
      let cursor = firstPage?.pageInfo?.endCursor;
      const MAX_PAGES = Math.max(1, Math.min(1000, Number(process.env.NEXT_PUBLIC_MAX_PAGES || process.env.MAX_PAGES || 100)));
      let pageCounter = 0;
      let prevCursor: string | undefined = undefined;

      while (hasNext) {
        if (pageCounter >= MAX_PAGES) {
          console.warn(`Aborting pagination for cycle ${cycleId}: reached MAX_PAGES=${MAX_PAGES}`);
          break;
        }

        try {



          const res = await apolloClient.query({
            query: GET_MORE_CYCLE_ISSUES,
            variables: { cycleId, after: cursor, n: PAGE_N },
            fetchPolicy: 'no-cache',
          });
          if (res.errors && res.errors.length) {
            console.error(`GraphQL errors during pagination for cycle ${cycleId}:`);
            res.errors.forEach((e) => console.error('-', e.message));
            if (isComplexityError(res.errors)) {
              console.warn(`Stopping pagination for cycle ${cycleId} due to complexity in result.errors`);
              break;
            }
          }
          const page = res?.data?.cycle?.issues;
          if (!page?.nodes?.length) break;
          all.push(...page.nodes);
          hasNext = page.pageInfo?.hasNextPage ?? false;
          const newCursor = page.pageInfo?.endCursor;
          prevCursor = cursor;
          cursor = newCursor;
          pageCounter += 1;
          if (prevCursor && prevCursor === cursor) {
            console.warn(`Stopping pagination for cycle ${cycleId} due to stale cursor: ${cursor}`);
            break;
          }
        } catch (err: unknown) {
          type ApolloNetworkError = { statusCode?: number; result?: { errors?: Array<{ message?: string }> } };
          type ApolloLikeError = { message?: string; networkError?: ApolloNetworkError };
          const apolloErr = err as ApolloLikeError;
          console.error(`Network error during pagination for cycle ${cycleId}`);
          const status = apolloErr?.networkError?.statusCode;
          if (status) console.error(`HTTP ${status} from Linear API`);
          const gqlErrors = apolloErr?.networkError?.result?.errors;
          if (Array.isArray(gqlErrors)) {
            gqlErrors.forEach((e) => console.error('GraphQL error:', e?.message));
            if (isComplexityError(gqlErrors)) {
              console.warn(`Stopping pagination for cycle ${cycleId} due to complexity in networkError.result.errors`);
              break;
            }
          }
          break;
        }
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


    // Helper: fetch first page of a cycle with labels (used when light initial query omitted labels)
    async function fetchFirstCyclePageWithLabels(cycleId: string, n: number): Promise<IssuesPage> {
      const res = await apolloClient.query({
        query: GET_MORE_CYCLE_ISSUES,
        variables: { cycleId, after: null, n },
        fetchPolicy: 'no-cache',
      });
      if (res.errors?.length) {
        console.error(`GraphQL errors when refetching first page with labels for cycle ${cycleId}:`);
        res.errors.forEach(e => console.error('-', e.message));
      }
      return res?.data?.cycle?.issues as IssuesPage;
    }

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
            const firstPage = needFirstPageLabelRefetch
              ? await fetchFirstCyclePageWithLabels(cycle.id, firstPageSizeUsed)
              : teamData.activeCycle.issues;
            const allIssueNodes = await fetchAllCycleIssues(cycle.id, firstPage);
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

        // Optional override with accurate triage when enabled
        if (ENABLE_ACCURATE_TRIAGE) {
          const accurate = await computeAccurateTriageAvg(issues);
          if (accurate !== undefined) avgTriageTimeMs = accurate;
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
