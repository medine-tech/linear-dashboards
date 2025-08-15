import { NextResponse } from 'next/server';
import { getApolloClient } from '@/lib/apollo-client';
import { gql } from '@apollo/client';

// Specific debug endpoint for Pensa - Live team
export async function GET() {
  try {
    console.log('=== Debugging Pensa - Live Team Metrics ===');
    const apolloClient = getApolloClient();

    // Step 1: Find Pensa - Live team and its estimation settings
    const FIND_PENSA_LIVE = gql`
      query FindPensaLive {
        teams(filter: { name: { contains: "Pensa - Live" } }) {
          nodes {
            id
            name
            key
            issueEstimationType
            issueEstimationAllowZero
            issueEstimationExtended
            activeCycle {
              id
              number
              name
              startsAt
              endsAt
            }
          }
        }
      }
    `;

    const { data: teamsData } = await apolloClient.query({
      query: FIND_PENSA_LIVE,
      fetchPolicy: 'no-cache',
    });

    console.log('Teams matching "Pensa - Live":', JSON.stringify(teamsData, null, 2));

    const pensaLiveTeam = teamsData?.teams?.nodes?.find((team: { name: string }) =>
      team.name.includes('Pensa - Live')
    );

    if (!pensaLiveTeam) {
      return NextResponse.json({
        error: 'Pensa - Live team not found',
        availableTeams: teamsData?.teams?.nodes?.map((t: { name: string }) => t.name) || []
      });
    }

    console.log('Found Pensa - Live team:', pensaLiveTeam);
    console.log('Estimation type:', pensaLiveTeam.issueEstimationType);
    console.log('Active cycle:', pensaLiveTeam.activeCycle);

    if (!pensaLiveTeam.activeCycle) {
      return NextResponse.json({
        error: 'Pensa - Live team has no active cycle',
        team: pensaLiveTeam
      });
    }

    // Step 2: Get all issues for the active cycle with detailed information
    const GET_CYCLE_ISSUES_DETAILED = gql`
      query GetCycleIssuesDetailed($cycleId: String!) {
        cycle(id: $cycleId) {
          id
          number
          name
          issues {
            nodes {
              id
              identifier
              title
              estimate
              state {
                id
                name
                type
              }
              assignee {
                id
                name
              }
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    // Query for estimated issues only
    const GET_CYCLE_ESTIMATED_ISSUES = gql`
      query GetCycleEstimatedIssues($cycleId: String!) {
        cycle(id: $cycleId) {
          id
          number
          name
          issues(filter: { estimate: { gt: 0 } }) {
            nodes {
              id
              identifier
              title
              estimate
              state {
                id
                name
                type
              }
              assignee {
                id
                name
              }
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    // Fetch all issues
    const { data: allIssuesData } = await apolloClient.query({
      query: GET_CYCLE_ISSUES_DETAILED,
      variables: { cycleId: pensaLiveTeam.activeCycle.id },
      fetchPolicy: 'no-cache',
    });

    // Fetch estimated issues only
    const { data: estimatedIssuesData } = await apolloClient.query({
      query: GET_CYCLE_ESTIMATED_ISSUES,
      variables: { cycleId: pensaLiveTeam.activeCycle.id },
      fetchPolicy: 'no-cache',
    });

    console.log('All issues data:', JSON.stringify(allIssuesData, null, 2));
    console.log('Estimated issues data:', JSON.stringify(estimatedIssuesData, null, 2));

    const allIssues = allIssuesData?.cycle?.issues?.nodes || [];
    const estimatedIssues = estimatedIssuesData?.cycle?.issues?.nodes || [];

    console.log(`Found ${allIssues.length} total issues, ${estimatedIssues.length} estimated issues in cycle`);

    // Step 3: Analyze both sets of issues and calculate metrics
    const analyzeIssues = (issueList: Array<{
      identifier: string;
      title: string;
      estimate?: number;
      state: { type: string; name: string };
      assignee?: { name: string };
    }>, label: string) => {
      let totalScope = 0;
      let totalStarted = 0;
      let totalCompleted = 0;
      let issueCount = 0;
      let startedCount = 0;
      let completedCount = 0;

      const analysis = issueList.map((issue) => {
        const estimate = issue.estimate || 0;
        const stateType = issue.state.type;
        const isStarted = stateType === 'started';
        const isCompleted = stateType === 'completed';

        totalScope += estimate;
        issueCount++;

        if (isStarted) {
          totalStarted += estimate;
          startedCount++;
        }

        if (isCompleted) {
          totalCompleted += estimate;
          completedCount++;
        }

        return {
          identifier: issue.identifier,
          title: issue.title,
          estimate: estimate,
          stateType: stateType,
          stateName: issue.state.name,
          isStarted,
          isCompleted,
          assignee: issue.assignee?.name || 'Unassigned'
        };
      });

      return {
        label,
        analysis,
        metrics: {
          totalScope,
          totalStarted,
          totalCompleted,
          issueCount,
          startedCount,
          completedCount
        }
      };
    };

    const allIssuesAnalysis = analyzeIssues(allIssues, 'All Issues');
    const estimatedIssuesAnalysis = analyzeIssues(estimatedIssues, 'Estimated Issues Only');

    console.log('All issues analysis:', allIssuesAnalysis);
    console.log('Estimated issues analysis:', estimatedIssuesAnalysis);

    // Step 4: Check our calculation logic
    const usesEstimation = pensaLiveTeam.issueEstimationType !== 'notUsed';
    console.log('Team uses estimation:', usesEstimation);

    const calculatedMetrics = {
      usesEstimation,
      estimationType: pensaLiveTeam.issueEstimationType,
      allIssues: {
        storyPoints: {
          scope: allIssuesAnalysis.metrics.totalScope,
          started: allIssuesAnalysis.metrics.totalStarted,
          completed: allIssuesAnalysis.metrics.totalCompleted,
          startedPercentage: allIssuesAnalysis.metrics.totalScope > 0 ? Math.round((allIssuesAnalysis.metrics.totalStarted / allIssuesAnalysis.metrics.totalScope) * 100) : 0,
          completedPercentage: allIssuesAnalysis.metrics.totalScope > 0 ? Math.round((allIssuesAnalysis.metrics.totalCompleted / allIssuesAnalysis.metrics.totalScope) * 100) : 0
        },
        issueCounts: {
          scope: allIssuesAnalysis.metrics.issueCount,
          started: allIssuesAnalysis.metrics.startedCount,
          completed: allIssuesAnalysis.metrics.completedCount,
          startedPercentage: allIssuesAnalysis.metrics.issueCount > 0 ? Math.round((allIssuesAnalysis.metrics.startedCount / allIssuesAnalysis.metrics.issueCount) * 100) : 0,
          completedPercentage: allIssuesAnalysis.metrics.issueCount > 0 ? Math.round((allIssuesAnalysis.metrics.completedCount / allIssuesAnalysis.metrics.issueCount) * 100) : 0
        }
      },
      estimatedIssuesOnly: {
        storyPoints: {
          scope: estimatedIssuesAnalysis.metrics.totalScope,
          started: estimatedIssuesAnalysis.metrics.totalStarted,
          completed: estimatedIssuesAnalysis.metrics.totalCompleted,
          startedPercentage: estimatedIssuesAnalysis.metrics.totalScope > 0 ? Math.round((estimatedIssuesAnalysis.metrics.totalStarted / estimatedIssuesAnalysis.metrics.totalScope) * 100) : 0,
          completedPercentage: estimatedIssuesAnalysis.metrics.totalScope > 0 ? Math.round((estimatedIssuesAnalysis.metrics.totalCompleted / estimatedIssuesAnalysis.metrics.totalScope) * 100) : 0
        },
        issueCounts: {
          scope: estimatedIssuesAnalysis.metrics.issueCount,
          started: estimatedIssuesAnalysis.metrics.startedCount,
          completed: estimatedIssuesAnalysis.metrics.completedCount,
          startedPercentage: estimatedIssuesAnalysis.metrics.issueCount > 0 ? Math.round((estimatedIssuesAnalysis.metrics.startedCount / estimatedIssuesAnalysis.metrics.issueCount) * 100) : 0,
          completedPercentage: estimatedIssuesAnalysis.metrics.issueCount > 0 ? Math.round((estimatedIssuesAnalysis.metrics.completedCount / estimatedIssuesAnalysis.metrics.issueCount) * 100) : 0
        }
      }
    };

    return NextResponse.json({
      team: pensaLiveTeam,
      cycle: allIssuesData?.cycle,
      allIssuesAnalysis,
      estimatedIssuesAnalysis,
      calculatedMetrics,
      comparison: {
        totalIssues: allIssues.length,
        estimatedIssues: estimatedIssues.length,
        unestimatedIssues: allIssues.length - estimatedIssues.length,
        unestimatedIssuesList: allIssues.filter((issue: { estimate?: number }) => (issue.estimate || 0) === 0).map((issue: { identifier: string; title: string; state: { name: string } }) => ({
          identifier: issue.identifier,
          title: issue.title,
          state: issue.state.name
        }))
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to debug Pensa - Live team',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
