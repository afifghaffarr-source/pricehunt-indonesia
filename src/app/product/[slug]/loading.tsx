export default function ProductLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section Skeleton */}
      <div className="mb-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>

      {/* Decision Card Skeleton */}
      <div className="mb-8 p-6 bg-gray-100 rounded-lg animate-pulse">
        <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 rounded w-full"></div>
          <div className="h-4 bg-gray-300 rounded w-5/6"></div>
        </div>
      </div>

      {/* Price Comparison Skeleton */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 border rounded-lg animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
}
