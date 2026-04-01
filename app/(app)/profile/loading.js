export default function ProfileLoading() {
  return (
    <div className="space-y-5 animate-loading">
      <div className="h-7 w-24 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-lg animate-pulse" />

      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px] shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">
        <div className="h-3 w-16 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse mb-4" />

        {/* Name row */}
        <div className="mb-4 space-y-1.5">
          <div className="h-3 w-10 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
            <div className="h-3 w-6 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          </div>
        </div>

        <div className="border-t border-[#F5EDE9] dark:border-[#3D2820]" />

        {/* Email row */}
        <div className="mt-4 space-y-1.5">
          <div className="h-3 w-10 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          <div className="h-4 w-44 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}
