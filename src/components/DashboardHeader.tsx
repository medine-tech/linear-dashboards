interface DashboardHeaderProps {
  lastUpdated?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export default function DashboardHeader({ 
  lastUpdated, 
  onRefresh, 
  isLoading = false 
}: DashboardHeaderProps) {
  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Linear Team Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Track team progress across active cycles
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <div className="text-sm text-gray-500">
              Last updated: {formatLastUpdated(lastUpdated)}
            </div>
          )}
          
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <svg 
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
              <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
