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

// Corrected query based on Linear API documentation
// Note: activeCycle doesn't have direct access to issues, we need to query them separately
export const GET_ALL_TEAMS_WITH_CYCLES = gql`
  query GetAllTeamsWithCycles {
    teams {
      nodes {
        id
        name
        key
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

// Corrected query to get issues for a specific cycle
// Based on Linear API docs, we need to query the cycle directly and get its issues
export const GET_CYCLE_ISSUES_BY_ID = gql`
  query GetCycleIssues($cycleId: String!) {
    cycle(id: $cycleId) {
      id
      issues {
        nodes {
          id
          title
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
