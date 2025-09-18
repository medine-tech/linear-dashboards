export default function LoadingCard() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse">
      {/* Team Header Skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-4 h-4 rounded-full bg-gray-300" />
          <div>
            <div className="h-5 bg-gray-300 rounded w-24 mb-1" />
            <div className="h-4 bg-gray-300 rounded w-16" />
          </div>
        </div>
        <div className="text-right">
          <div className="h-4 bg-gray-300 rounded w-16 mb-1" />
          <div className="h-3 bg-gray-300 rounded w-20" />
        </div>
      </div>

      {/* Metrics Grid Skeleton */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="h-8 bg-gray-300 rounded w-8 mx-auto mb-1" />
          <div className="h-4 bg-gray-300 rounded w-12 mx-auto" />
        </div>
        <div className="text-center">
          <div className="h-8 bg-gray-300 rounded w-8 mx-auto mb-1" />
          <div className="h-4 bg-gray-300 rounded w-12 mx-auto mb-1" />
          <div className="h-3 bg-gray-300 rounded w-8 mx-auto" />
        </div>
        <div className="text-center">
          <div className="h-8 bg-gray-300 rounded w-8 mx-auto mb-1" />
          <div className="h-4 bg-gray-300 rounded w-16 mx-auto mb-1" />
          <div className="h-3 bg-gray-300 rounded w-8 mx-auto" />
        </div>
      </div>

      {/* Progress Bars Skeleton */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between mb-1">
            <div className="h-4 bg-gray-300 rounded w-24" />
            <div className="h-4 bg-gray-300 rounded w-8" />
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="h-2 bg-gray-300 rounded-full w-1/3" />
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <div className="h-4 bg-gray-300 rounded w-28" />
            <div className="h-4 bg-gray-300 rounded w-8" />
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="h-2 bg-gray-300 rounded-full w-1/4" />
          </div>
        </div>

      {/* Labels Skeleton */}
      <div className="mt-6">
        <div className="h-4 bg-gray-300 rounded w-20 mb-2" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-6 bg-gray-200 rounded-full w-20" />
          ))}
        </div>
      </div>

      </div>

      {/* Meta skeleton */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded w-28" />
        ))}
      </div>

    </div>
  );
}
