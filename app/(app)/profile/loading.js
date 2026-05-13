export default function ProfileLoading() {
  return (
    <div className="space-y-5 animate-loading">

      {/* Page title */}
      <div className="h-8 w-20 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-lg animate-pulse pt-1" />

      {/* Couple card */}
      <div className="rounded-[22px] p-5 bg-[#EDE0DC] dark:bg-[#2E201C] border border-[#EDE0DC] dark:border-[#3D2820]">
        <div className="flex items-start">
          {/* You */}
          <div className="flex-1 flex flex-col items-center gap-2.5">
            <div className="w-[52px] h-[52px] rounded-full bg-[#D4C0BA] dark:bg-[#3D2820] animate-pulse" />
            <div className="h-3.5 w-16 bg-[#D4C0BA] dark:bg-[#3D2820] rounded animate-pulse" />
            <div className="h-3 w-24 bg-[#D4C0BA] dark:bg-[#3D2820] rounded animate-pulse" />
          </div>
          {/* Heart connector */}
          <div className="flex flex-col items-center gap-1 pt-3 px-1">
            <div className="w-7 h-px bg-[#D4C0BA] dark:bg-[#3D2820]" />
            <div className="w-5 h-5 rounded-full bg-[#D4C0BA] dark:bg-[#3D2820] animate-pulse" />
            <div className="w-7 h-px bg-[#D4C0BA] dark:bg-[#3D2820]" />
          </div>
          {/* Partner */}
          <div className="flex-1 flex flex-col items-center gap-2.5">
            <div className="w-[52px] h-[52px] rounded-full bg-[#D4C0BA] dark:bg-[#3D2820] animate-pulse" />
            <div className="h-3.5 w-16 bg-[#D4C0BA] dark:bg-[#3D2820] rounded animate-pulse" />
            <div className="h-3 w-24 bg-[#D4C0BA] dark:bg-[#3D2820] rounded animate-pulse" />
          </div>
        </div>
        <div className="mt-4 pt-3.5 border-t border-[#D4C0BA] dark:border-[#3D2820] flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-2.5 w-16 bg-[#D4C0BA] dark:bg-[#3D2820] rounded animate-pulse" />
            <div className="h-4 w-24 bg-[#D4C0BA] dark:bg-[#3D2820] rounded animate-pulse" />
          </div>
          <div className="h-7 w-24 bg-[#D4C0BA] dark:bg-[#3D2820] rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Preferences section */}
      <div>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-2.5 w-20 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          <div className="flex-1 h-px bg-[#EDE0DC] dark:bg-[#3D2820]" />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3.5 py-[14px] border-b border-[#F5EDE9] dark:border-[#261812] last:border-b-0">
            <div className="w-[34px] h-[34px] rounded-[10px] bg-[#EDE0DC] dark:bg-[#3D2820] animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-24 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
              <div className="h-3 w-16 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
            </div>
            <div className="w-4 h-4 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse flex-shrink-0" />
          </div>
        ))}
      </div>

      {/* Sign out button */}
      <div className="h-[46px] w-full bg-[#EDE0DC] dark:bg-[#3D2820] rounded-[14px] animate-pulse" />

    </div>
  )
}
