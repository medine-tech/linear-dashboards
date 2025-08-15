'use client';

import { useState, useEffect } from 'react';
import { fetchDashboardDataClient } from '@/lib/client-api';
import type { DashboardData } from '@/types/linear';
import DashboardHeader from '@/components/DashboardHeader';
import TeamCard from '@/components/TeamCard';
import LoadingCard from '@/components/LoadingCard';
import ErrorCard from '@/components/ErrorCard';
import ConfigurationGuide from '@/components/ConfigurationGuide';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function Home() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsConfiguration, setNeedsConfiguration] = useState(false);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setNeedsConfiguration(false);
      const data = await fetchDashboardDataClient();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';

      // Check if error is related to missing API key
      if (errorMessage.includes('LINEAR_API_KEY') || errorMessage.includes('authentication')) {
        setNeedsConfiguration(true);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRefresh = () => {
    loadDashboardData();
  };

  // Show configuration guide if API key is missing
  if (needsConfiguration) {
    return <ConfigurationGuide />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader
          lastUpdated={dashboardData?.lastUpdated}
          onRefresh={handleRefresh}
          isLoading={isLoading}
        />

        <main className="max-w-7xl mx-auto px-6 py-8">
          {error ? (
            <div className="max-w-md mx-auto">
              <ErrorCard error={error} onRetry={handleRefresh} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? (
                // Show loading cards
                Array.from({ length: 6 }).map((_, index) => (
                  <LoadingCard key={index} />
                ))
              ) : dashboardData?.teams.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-500 text-lg">No teams found</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Make sure your Linear API key is configured correctly and you have access to teams
                  </p>
                </div>
              ) : (
                // Show team cards
                dashboardData?.teams.map((teamMetrics) => (
                  <TeamCard key={teamMetrics.team.id} teamMetrics={teamMetrics} />
                ))
              )}
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
