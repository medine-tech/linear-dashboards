import type { TeamMetrics } from '@/types/linear';

interface TeamCardProps {
  teamMetrics: TeamMetrics;
}

export default function TeamCard({ teamMetrics }: TeamCardProps) {
  const { team, cycle, scope, started, completed, startedPercentage, completedPercentage } = teamMetrics;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Team Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div 
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: team.color || '#6366f1' }}
          />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
            <p className="text-sm text-gray-500">{team.key}</p>
          </div>
        </div>
        {cycle && (
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              Cycle {cycle.number}
            </p>
            <p className="text-xs text-gray-500">
              {formatDate(cycle.startsAt)} - {formatDate(cycle.endsAt)}
            </p>
          </div>
        )}
      </div>

      {/* Cycle Status */}
      {!cycle ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No active cycle</p>
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{scope}</div>
              <div className="text-sm text-gray-500">Scope</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getStatusColor(startedPercentage)}`}>
                {started}
              </div>
              <div className="text-sm text-gray-500">Started</div>
              <div className="text-xs text-gray-400">{startedPercentage}%</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getStatusColor(completedPercentage)}`}>
                {completed}
              </div>
              <div className="text-sm text-gray-500">Completed</div>
              <div className="text-xs text-gray-400">{completedPercentage}%</div>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Started Progress</span>
                <span className="text-gray-900 font-medium">{startedPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(startedPercentage)}`}
                  style={{ width: `${startedPercentage}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Completion Progress</span>
                <span className="text-gray-900 font-medium">{completedPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(completedPercentage)}`}
                  style={{ width: `${completedPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
