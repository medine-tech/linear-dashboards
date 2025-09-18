import type { TeamMetrics } from '@/types/linear';


function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return '-';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface TeamCardProps {
  teamMetrics: TeamMetrics;
}

export default function TeamCard({ teamMetrics }: TeamCardProps) {
  const {
    team,
    cycle,
    scope,
    started,
    completed,
    startedPercentage,
    completedPercentage,
    usesEstimation
  } = teamMetrics;

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

  const getMetricLabel = () => {
    return usesEstimation ? 'Story Points' : 'Issues';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Team Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: team.color || '#6366f1' }}
            title={team.color ? `Team color: ${team.color}` : undefined}
          />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
            <div className="flex items-center space-x-2">
              <p className="text-sm text-gray-500">{team.key}</p>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {getMetricLabel()}
              </span>
            </div>
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
              <div className="text-xs text-gray-400">
                {usesEstimation ? 'points' : 'issues'}
              </div>
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

          {/* Top Labels */}
          {teamMetrics.labelCounts && teamMetrics.labelCounts.length > 0 && (
            <div className="mt-6">
              <div className="text-sm text-gray-600 mb-2">Top Labels</div>
              <div className="flex flex-wrap gap-2">
                {teamMetrics.labelCounts!.slice(0, 6).map(lbl => (
                  <span
                    key={lbl.id}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border"
                    style={{ borderColor: lbl.color || '#e5e7eb' }}
                    title={`${lbl.name}: ${lbl.count}`}
                  >
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: lbl.color || '#9ca3af' }} />


                    <span className="text-gray-700">{lbl.name}</span>
                    <span className="text-gray-500">({lbl.count})</span>
                  </span>
                ))}
                {teamMetrics.labelCounts.length > 6 && (
                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                    +{teamMetrics.labelCounts.length - 6} more
                  </span>
                )}
              </div>
            </div>
          )}

            {/* Meta row */}
            {(teamMetrics.meta?.avgCycleTimeMs || teamMetrics.meta?.avgOpenAgeMs || teamMetrics.meta?.avgTriageTimeMs || teamMetrics.meta?.lead) && (
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-700">
                {teamMetrics.meta?.avgCycleTimeMs !== undefined && (
                  <div title="Average time from start to completion for completed issues in this cycle">
                    <span className="mr-1">⏱</span>
                    <span className="text-gray-600">Avg cycle:</span> {formatDuration(teamMetrics.meta.avgCycleTimeMs)}
                  </div>
                )}
                {teamMetrics.meta?.avgTriageTimeMs !== undefined && (
                  <div title="Approximate time issues spent before starting (startedAt - createdAt)">
                    <span className="mr-1">🧹</span>
                    <span className="text-gray-600">Avg triage:</span> {formatDuration(teamMetrics.meta.avgTriageTimeMs)}
                  </div>
                )}
                {teamMetrics.meta?.avgOpenAgeMs !== undefined && (
                  <div title="Average age of open (non-completed) issues in this cycle">
                    <span className="mr-1">📅</span>
                    <span className="text-gray-600">Open age:</span> {formatDuration(teamMetrics.meta.avgOpenAgeMs)}
                  </div>
                )}
                {teamMetrics.meta?.lead && (
                  <div title="Team lead">
                    <span className="mr-1">👤</span>
                    <span className="text-gray-600">Lead:</span> {teamMetrics.meta.lead.name}
                  </div>
                )}
              </div>
            )}


            </div>
          </div>
        </>
      )}
    </div>
  );
}
