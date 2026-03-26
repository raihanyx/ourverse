export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      {/* Heading */}
      <div className="space-y-1.5">
        <div className="h-7 w-40 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-lg animate-pulse" />
        <div className="h-4 w-32 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
      </div>

      {/* Balance card */}
      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px] space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-3 w-16 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          <div className="h-3 w-20 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
        </div>
        <div className="h-4 w-3/4 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
      </div>

      {/* Couple space card */}
      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px] space-y-4">
        <div className="h-3 w-28 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-3 w-20 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          <div className="h-8 w-32 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
        </div>
        <div className="h-3 w-36 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
        <div className="h-4 w-48 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
      </div>
    </div>
  )
}
