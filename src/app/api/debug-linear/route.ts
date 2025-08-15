import { NextResponse } from 'next/server';
import { getApolloClient } from '@/lib/apollo-client';
import { gql } from '@apollo/client';

// Very simple test query
const SIMPLE_VIEWER = gql`
  query SimpleViewer {
    viewer {
      id
      name
    }
  }
`;

// Enhanced teams query with estimation settings
const TEAMS_WITH_ESTIMATION = gql`
  query TeamsWithEstimation {
    teams {
      nodes {
        id
        name
        key
        issueEstimationType
        issueEstimationAllowZero
        issueEstimationExtended
      }
    }
  }
`;

export async function GET() {
  const results: {
    tests: Array<{
      name: string;
      status: 'PASSED' | 'FAILED' | 'SKIPPED';
      data?: unknown;
      error?: unknown;
    }>;
    summary: { passed: number; failed: number };
  } = {
    tests: [],
    summary: {
      passed: 0,
      failed: 0
    }
  };

  try {
    console.log('Starting comprehensive Linear API debug tests...');
    const apolloClient = getApolloClient();

    // Test 1: Simple viewer query
    console.log('\n=== Test 1: Simple Viewer Query ===');
    try {
      const { data, error } = await apolloClient.query({
        query: SIMPLE_VIEWER,
        fetchPolicy: 'no-cache',
      });

      if (error) {
        throw error;
      }

      results.tests.push({
        name: 'Simple Viewer Query',
        status: 'PASSED',
        data: data
      });
      results.summary.passed++;
      console.log('✅ Simple viewer query successful');

    } catch (error: unknown) {
      results.tests.push({
        name: 'Simple Viewer Query',
        status: 'FAILED',
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          graphQLErrors: (error as { graphQLErrors?: unknown }).graphQLErrors,
          networkError: (error as { networkError?: { message?: string; statusCode?: number; result?: unknown } }).networkError
        }
      });
      results.summary.failed++;
      console.log('❌ Simple viewer query failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 2: Teams with estimation settings query
    console.log('\n=== Test 2: Teams with Estimation Settings ===');
    try {
      const { data, error } = await apolloClient.query({
        query: TEAMS_WITH_ESTIMATION,
        fetchPolicy: 'no-cache',
      });

      if (error) {
        throw error;
      }

      results.tests.push({
        name: 'Teams with Estimation Settings',
        status: 'PASSED',
        data: data
      });
      results.summary.passed++;
      console.log('✅ Teams with estimation settings query successful');

      // Log estimation settings for each team
      if (data?.teams?.nodes) {
        data.teams.nodes.forEach((team: { name: string; issueEstimationType?: string }) => {
          console.log(`Team ${team.name}: estimation type = ${team.issueEstimationType || 'notUsed'}`);
        });
      }

    } catch (error: unknown) {
      results.tests.push({
        name: 'Teams with Estimation Settings',
        status: 'FAILED',
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          graphQLErrors: (error as { graphQLErrors?: unknown }).graphQLErrors,
          networkError: (error as { networkError?: { message?: string; statusCode?: number; result?: unknown } }).networkError
        }
      });
      results.summary.failed++;
      console.log('❌ Teams with estimation settings query failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 3: Teams with activeCycle (without issues)
    console.log('\n=== Test 3: Teams with Active Cycle ===');
    const TEAMS_WITH_CYCLE = gql`
      query TeamsWithCycle {
        teams {
          nodes {
            id
            name
            activeCycle {
              id
              number
              name
            }
          }
        }
      }
    `;

    try {
      const { data, error } = await apolloClient.query({
        query: TEAMS_WITH_CYCLE,
        fetchPolicy: 'no-cache',
      });

      if (error) {
        throw error;
      }

      results.tests.push({
        name: 'Teams with Active Cycle',
        status: 'PASSED',
        data: data
      });
      results.summary.passed++;
      console.log('✅ Teams with active cycle query successful');

    } catch (error: unknown) {
      results.tests.push({
        name: 'Teams with Active Cycle',
        status: 'FAILED',
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          graphQLErrors: (error as { graphQLErrors?: unknown }).graphQLErrors,
          networkError: (error as { networkError?: { message?: string; statusCode?: number; result?: unknown } }).networkError
        }
      });
      results.summary.failed++;
      console.log('❌ Teams with active cycle query failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 4: Cycle Issues Query (if we have a cycle from previous test)
    console.log('\n=== Test 4: Cycle Issues Query ===');
    let cycleId: string | null = null;

    // Try to get a cycle ID from the previous test
    const teamsWithCycleTest = results.tests.find(test => test.name === 'Teams with Active Cycle');
    if (teamsWithCycleTest && teamsWithCycleTest.status === 'PASSED' && teamsWithCycleTest.data) {
      const teamsData = teamsWithCycleTest.data as { teams: { nodes: Array<{ activeCycle?: { id: string } }> } };
      const teamWithCycle = teamsData.teams.nodes.find(team => team.activeCycle);
      cycleId = teamWithCycle?.activeCycle?.id || null;
    }

    if (cycleId) {
      const CYCLE_ISSUES = gql`
        query GetCycleIssues($cycleId: String!) {
          cycle(id: $cycleId) {
            id
            issues {
              nodes {
                id
                title
                estimate
                state {
                  id
                  name
                  type
                }
              }
            }
          }
        }
      `;

      try {
        const { data, error } = await apolloClient.query({
          query: CYCLE_ISSUES,
          variables: { cycleId },
          fetchPolicy: 'no-cache',
        });

        if (error) {
          throw error;
        }

        results.tests.push({
          name: 'Cycle Issues Query',
          status: 'PASSED',
          data: data
        });
        results.summary.passed++;
        console.log('✅ Cycle issues query successful');

      } catch (error: unknown) {
        results.tests.push({
          name: 'Cycle Issues Query',
          status: 'FAILED',
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            graphQLErrors: (error as { graphQLErrors?: unknown }).graphQLErrors,
            networkError: (error as { networkError?: { message?: string; statusCode?: number; result?: unknown } }).networkError
          }
        });
        results.summary.failed++;
        console.log('❌ Cycle issues query failed:', error instanceof Error ? error.message : 'Unknown error');
      }
    } else {
      results.tests.push({
        name: 'Cycle Issues Query',
        status: 'SKIPPED',
        error: 'No cycle ID available from previous tests'
      });
      console.log('⏭️ Cycle issues query skipped - no cycle ID available');
    }

    console.log('\n=== Debug Test Summary ===');
    console.log(`Passed: ${results.summary.passed}`);
    console.log(`Failed: ${results.summary.failed}`);

    return NextResponse.json(results);

  } catch (error) {
    console.error('Debug test setup error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run debug tests',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
