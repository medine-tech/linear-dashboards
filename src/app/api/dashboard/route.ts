import { NextResponse } from 'next/server';
import { fetchDashboardData } from '@/lib/linear-api';

export async function GET() {
  try {
    const data = await fetchDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
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
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dashboard data';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
