export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      {/* Heading */}
      <div className="space-y-1.5">
        <div className="h-7 w-40 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-lg animate-pulse" />
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-full animate-pulse" />
          <div className="h-4 w-32 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
        </div>
      </div>

      {/* Balance card */}
      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px] space-y-3 shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">
        <div className="flex items-center justify-between">
          <div className="h-3 w-16 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          <div className="h-3 w-20 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
        </div>
        <div className="pl-3 border-l-2 border-[#EDE0DC] dark:border-[#3D2820] space-y-1.5 py-0.5">
          <div className="h-2.5 w-28 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          <div className="h-6 w-36 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
        </div>
        <div className="pl-3 border-l-2 border-[#EDE0DC] dark:border-[#3D2820] space-y-1.5 py-0.5">
          <div className="h-2.5 w-24 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          <div className="h-6 w-32 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
        </div>
        <div className="border-t border-[#F5EDE9] dark:border-[#3D2820] pt-3 flex items-center justify-between">
          <div className="h-3 w-24 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          <div className="h-7 w-16 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Together card */}
      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px] space-y-3 shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">
        <div className="h-3 w-16 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex-1 h-[72px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-3 w-44 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
      </div>

      {/* Couple space card */}
      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px] space-y-4 shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">
        <div className="h-3 w-28 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 w-20 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="flex-1 h-11 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-xl animate-pulse" />
            <div className="w-11 h-11 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-xl animate-pulse flex-shrink-0" />
          </div>
        </div>
        <div className="h-3 w-44 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
      </div>
    </div>
  )
}
