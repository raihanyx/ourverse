export default function ProfileLoading() {
  return (
    <div className="space-y-5 animate-loading">

      {/* Page header: icon badge + title + subtitle */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#EDE0DC] dark:bg-[#3D2820] animate-pulse flex-shrink-0" />
        <div className="space-y-1.5">
          <div className="h-[18px] w-16 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          <div className="h-3 w-40 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
        </div>
      </div>

      {/* Account card */}
      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px] shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">
        <div className="h-[10px] w-16 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse mb-4" />

        {/* Name row */}
        <div className="mb-4 space-y-1.5">
          <div className="h-3 w-10 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
            <div className="h-7 w-[52px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded-lg animate-pulse" />
          </div>
        </div>

        <div className="border-t border-[#F5EDE9] dark:border-[#3D2820]" />

        {/* Email row */}
        <div className="mt-4 space-y-1.5">
          <div className="h-3 w-10 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          <div className="h-4 w-44 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
        </div>
      </div>

      {/* Appearance card */}
      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px] shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">
        <div className="h-[10px] w-24 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse mb-4" />
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-4 w-20 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
            <div className="h-3 w-48 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          </div>
          {/* Toggle pill w-11 h-6 */}
          <div className="w-11 h-6 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-full animate-pulse flex-shrink-0" />
        </div>
      </div>

      {/* Sign out button */}
      <div className="h-[46px] w-full bg-[#EDE0DC] dark:bg-[#3D2820] rounded-xl animate-pulse" />

    </div>
  )
}
