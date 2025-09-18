import { NextResponse } from 'next/server';
import { fetchDashboardData } from '@/lib/linear-api';

export async function GET() {
  try {
    console.log('API Route: Starting dashboard data fetch...');
    const data = await fetchDashboardData();
    console.log('API Route: Successfully fetched dashboard data');
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' }
    });
  } catch (error) {
    console.error('API Route Error:', error);

    // Log more detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dashboard data';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST() {
  // Handle refresh requests
  try {
    const data = await fetchDashboardData();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' }
    });
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dashboard data';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
