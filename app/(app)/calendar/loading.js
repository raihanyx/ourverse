export default function CalendarLoading() {
  return (
    <div className="space-y-5 animate-loading">

      {/* Page header: icon badge + title + subtitle + tip button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#EDE0DC] dark:bg-[#3D2820] animate-pulse flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="h-[18px] w-20 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
            <div className="h-3 w-36 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          </div>
        </div>
        {/* Tip button w-8 h-8 */}
        <div className="w-8 h-8 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-xl animate-pulse flex-shrink-0" />
      </div>

      {/* Calendar card */}
      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-4 shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">
        {/* Month navigation row */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-8 h-8 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-xl animate-pulse" />
          <div className="h-5 w-28 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          <div className="w-8 h-8 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-xl animate-pulse" />
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex justify-center">
              <div className="h-3 w-5 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Calendar grid — 5 rows × 7 */}
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-xl bg-[#EDE0DC] dark:bg-[#3D2820] animate-pulse"
              style={{ opacity: i < 3 || i > 30 ? 0.3 : 1 }}
            />
          ))}
        </div>
      </div>

      {/* Selected date detail */}
      <div className="space-y-3">
        <div className="h-4 w-36 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
        {[1, 2].map(i => (
          <div
            key={i}
            className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-4 shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-xl animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
                <div className="h-3 w-1/3 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
