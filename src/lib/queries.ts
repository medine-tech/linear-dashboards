import { gql } from '@apollo/client';

/**
 * GraphQL queries for Linear API
 */

// Simple test query to verify API connection
export const GET_VIEWER = gql`
  query GetViewer {
    viewer {
      id
      name
      email
    }
  }
`;

export const GET_TEAMS = gql`
  query GetTeams {
    teams {
      nodes {
        id
        name
        key
      }
    }
  }
`;

export const GET_ACTIVE_CYCLES = gql`
  query GetActiveCycles {
    cycles(filter: { isActive: { eq: true } }) {
      nodes {
        id
        number
        name
        description
        startsAt
        endsAt
        completedAt
        progress
        scopeHistory
        completedScopeHistory
        inProgressScopeHistory
        team {
          id
          name
          key
          color
        }
      }
    }
  }
`;

export const GET_CYCLE_ISSUES = gql`
  query GetCycleIssues($cycleId: String!) {
    issues(filter: { cycle: { id: { eq: $cycleId } } }) {
      nodes {
        id
        identifier
        title
        priority
        estimate
        state {
          id
          name
          type
          color
        }
        team {
          id
          name
          key
        }
        assignee {
          id
          name
          email
          avatarUrl
        }
        createdAt
        updatedAt
        completedAt
      }
    }
  }
`;

export const GET_TEAM_CURRENT_CYCLE_ISSUES = gql`
  query GetTeamCurrentCycleIssues($teamId: String!) {
    team(id: $teamId) {
      id
      name
      key
      activeCycle {
        id
        number
        name
        startsAt
        endsAt
        progress
        issues {
          nodes {
            id
            identifier
            title
            priority
            estimate
            state {
              id
              name
              type
              color
            }
            assignee {
              id
              name
              email
              avatarUrl
            }
            createdAt
            updatedAt
            completedAt
          }
        }
      }
    }
  }
`;

// Enhanced query to include team estimation settings
export const GET_ALL_TEAMS_WITH_CYCLES = gql`
  query GetAllTeamsWithCycles {
    teams {
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

// Enhanced query to include issue estimates for proper metric calculation
export const GET_CYCLE_ISSUES_BY_ID = gql`
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
          assignee {
            id
            name
          }
          createdAt
        }
      }
    }
  }
`;

// Query for teams using story point estimation - excludes unestimated issues
export const GET_CYCLE_ISSUES_WITH_ESTIMATES = gql`
  query GetCycleIssuesWithEstimates($cycleId: String!) {
    cycle(id: $cycleId) {
      id
      issues(filter: { estimate: { gt: 0 } }) {
        nodes {
          id
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
        }
      }
    }
  }
`;
