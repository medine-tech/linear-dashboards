import type { DashboardData } from '@/types/linear';

/**
 * Client-side API utilities for fetching dashboard data
 */

/**
 * Fetches dashboard data from the API route
 */
export async function fetchDashboardDataClient(): Promise<DashboardData> {
  const response = await fetch('/api/dashboard', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Refreshes dashboard data by calling the API route
 */
export async function refreshDashboardDataClient(): Promise<DashboardData> {
  const response = await fetch('/api/dashboard', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
}
