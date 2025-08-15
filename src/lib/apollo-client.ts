import { ApolloClient, InMemoryCache, createHttpLink, NormalizedCacheObject } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

/**
 * Apollo Client configuration for Linear API
 */

let apolloClientInstance: ApolloClient<NormalizedCacheObject> | null = null;

/**
 * Creates and returns an Apollo Client instance
 * This is done dynamically to avoid environment variable issues on client side
 */
export function getApolloClient(): ApolloClient<NormalizedCacheObject> {
  // Return existing instance if available
  if (apolloClientInstance) {
    return apolloClientInstance;
  }

  // Get API key from environment
  const apiKey = process.env.LINEAR_API_KEY;

  if (!apiKey) {
    throw new Error(
      'LINEAR_API_KEY environment variable is required. ' +
      'Please add it to your .env.local file. ' +
      'You can get your API key from https://linear.app/settings/api'
    );
  }

  // Create HTTP link to Linear GraphQL API
  const httpLink = createHttpLink({
    uri: 'https://api.linear.app/graphql',
  });

  // Create auth link to add authorization header
  const authLink = setContext((_, { headers }) => {
    return {
      headers: {
        ...headers,
        authorization: apiKey,
        'content-type': 'application/json',
      },
    };
  });

  // Create Apollo Client instance
  apolloClientInstance = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        errorPolicy: 'all',
      },
      query: {
        errorPolicy: 'all',
      },
    },
  });

  return apolloClientInstance;
}

// Export for backward compatibility
export const apolloClient = getApolloClient;
