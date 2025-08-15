import { NextResponse } from 'next/server';
import { getApolloClient } from '@/lib/apollo-client';
import { GET_VIEWER } from '@/lib/queries';

export async function GET() {
  try {
    console.log('Testing Linear API connection...');
    
    const apolloClient = getApolloClient();
    console.log('Apollo client created successfully');
    
    const { data, error } = await apolloClient.query({
      query: GET_VIEWER,
      fetchPolicy: 'no-cache',
    });
    
    if (error) {
      console.error('GraphQL Error:', error);

      // Extract detailed error information
      if (error.networkError) {
        const networkError = error.networkError as {
          name?: string;
          message?: string;
          statusCode?: number;
          result?: { errors?: Array<{ message: string; locations?: unknown; path?: unknown; extensions?: unknown }> };
        };

        console.error('Network Error Details:', {
          name: networkError.name,
          message: networkError.message,
          statusCode: networkError.statusCode,
          result: networkError.result
        });

        const networkResult = networkError.result;
        if (networkResult?.errors) {
          console.error('Linear API GraphQL Errors:');
          networkResult.errors.forEach((gqlError, index: number) => {
            console.error(`Error ${index + 1}:`, gqlError);
          });
        }
      }

      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        console.error('GraphQL Errors from response:');
        error.graphQLErrors.forEach((gqlError, index) => {
          console.error(`GraphQL Error ${index + 1}:`, gqlError);
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          graphQLErrors: error.graphQLErrors,
          networkError: error.networkError ? {
            message: (error.networkError as { message?: string }).message,
            statusCode: (error.networkError as { statusCode?: number }).statusCode,
            result: (error.networkError as { result?: unknown }).result
          } : null
        },
        { status: 400 }
      );
    }
    
    console.log('Linear API test successful:', data);
    
    return NextResponse.json({
      success: true,
      message: 'Linear API connection successful',
      viewer: data.viewer
    });
    
  } catch (error) {
    console.error('Test Linear API Error:', error);
    
    // Log more detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to test Linear API';
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: error
      },
      { status: 500 }
    );
  }
}
