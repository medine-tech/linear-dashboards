/**
 * Configuration utilities for the Linear Dashboard
 */

export const config = {
  linear: {
    apiKey: process.env.LINEAR_API_KEY,
    apiUrl: 'https://api.linear.app/graphql',
  },
} as const;

/**
 * Validates that all required environment variables are present
 */
export function validateConfig() {
  if (!config.linear.apiKey) {
    throw new Error(
      'LINEAR_API_KEY environment variable is required. ' +
      'Please add it to your .env.local file. ' +
      'You can get your API key from https://linear.app/settings/api'
    );
  }
}
