/** Shown instantly while a page loads, so every click gives immediate feedback. */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-40 rounded-2xl bg-gray-200 sm:h-64" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <div className="aspect-square bg-gray-200" />
            <div className="space-y-2 p-3"><div className="h-3 w-4/5 rounded bg-gray-200" /><div className="h-3 w-2/5 rounded bg-gray-200" /><div className="h-8 rounded-lg bg-gray-200" /></div>
          </div>))}
      </div>
    </div>
  );
}
