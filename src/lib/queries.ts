import { gql } from '@apollo/client';

/**
 * GraphQL queries for Linear API
 */

export const GET_TEAMS = gql`
  query GetTeams {
    teams {
      nodes {
        id
        name
        key
        description
        color
        icon
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

export const GET_ALL_TEAMS_WITH_CYCLES = gql`
  query GetAllTeamsWithCycles {
    teams {
      nodes {
        id
        name
        key
        description
        color
        icon
        activeCycle {
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
  }
`;
