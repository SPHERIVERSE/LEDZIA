export default function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-32 bg-gray-200 rounded-xl w-full"></div>
      ))}
    </div>
  );
}
