export default function LedgerLoading() {
  return (
    <div className="space-y-5">
      {/* Heading row */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-16 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-lg animate-pulse" />
        <div className="h-4 w-12 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
      </div>

      {/* Tab bar */}
      <div className="flex bg-[#F0E8E4] dark:bg-[#120D0B] rounded-xl p-1 gap-1">
        <div className="flex-1 h-9 bg-[#EDE0DC] dark:bg-[#2E201C] rounded-lg animate-pulse" />
        <div className="flex-1 h-9 rounded-lg animate-pulse" />
      </div>

      {/* Totals card */}
      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px] space-y-3">
        <div className="h-3 w-28 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
        <div className="h-8 w-36 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-full animate-pulse" />
      </div>

      {/* Expense list */}
      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] px-[18px]">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="flex items-start gap-3 py-3 border-b border-[#F5EDE9] dark:border-[#3D2820] last:border-0"
          >
            <div className="flex-1 space-y-2 min-w-0">
              <div className="h-4 w-3/5 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
              <div className="h-3 w-2/5 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className="h-4 w-20 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
              <div className="h-3 w-14 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
