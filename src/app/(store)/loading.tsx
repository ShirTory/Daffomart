/** Shown instantly while a page loads — DaffoMart logo + light pulse animation. */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4" aria-busy="true" aria-label="Loading DaffoMart">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="DaffoMart" className="h-16 w-16 animate-pulse object-contain sm:h-20 sm:w-20" />
        <div className="absolute -inset-2 animate-ping rounded-full bg-primary/20" style={{ animationDuration: "1.5s" }} />
      </div>
      <p className="text-lg font-bold tracking-tight text-primary">DaffoMart</p>
      <p className="text-sm text-gray-400">Loading fresh groceries…</p>
    </div>
  );
}
