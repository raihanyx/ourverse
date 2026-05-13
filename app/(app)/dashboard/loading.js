export default function DashboardLoading() {
  return (
    <div className="animate-pulse">

      {/* Greeting bar */}
      <div className="flex items-start justify-between pt-1 pb-5">
        <div className="space-y-1.5">
          <div className="h-3 w-24 bg-[#EDE0DC] dark:bg-[#3A2418] rounded" />
          <div className="h-6 w-44 bg-[#EDE0DC] dark:bg-[#3A2418] rounded" />
        </div>
        <div className="w-10 h-10 rounded-full bg-[#EDE0DC] dark:bg-[#3A2418] flex-shrink-0" />
      </div>

      {/* Together hero */}
      <div className="rounded-[24px] p-5 bg-[#F5EDE9] dark:bg-[#2E201C] border border-[#EDE0DC] dark:border-[#3A2418]">
        <div className="h-3 w-14 bg-[#EDE0DC] dark:bg-[#3A2418] rounded mb-4" />
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex-1 h-[88px] bg-[#EDE0DC] dark:bg-[#3A2418] rounded-[16px]" />
          ))}
        </div>
        <div className="h-3 w-52 bg-[#EDE0DC] dark:bg-[#3A2418] rounded mt-3.5" />
      </div>

      {/* Balance section */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-20 bg-[#EDE0DC] dark:bg-[#3A2418] rounded" />
          <div className="flex-1 h-px bg-[#EDE0DC] dark:bg-[#3A2418]" />
        </div>
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <div className="h-3 w-28 bg-[#EDE0DC] dark:bg-[#3A2418] rounded" />
            <div className="h-9 w-40 bg-[#EDE0DC] dark:bg-[#3A2418] rounded" />
          </div>
          <div className="h-9 w-24 bg-[#EDE0DC] dark:bg-[#3A2418] rounded-[10px]" />
        </div>
        <div className="h-3 w-28 bg-[#EDE0DC] dark:bg-[#3A2418] rounded" />
        <div className="border-t border-[#EDE0DC] dark:border-[#3A2418] pt-3 flex items-center justify-between">
          <div className="h-3 w-24 bg-[#EDE0DC] dark:bg-[#3A2418] rounded" />
          <div className="h-7 w-16 bg-[#EDE0DC] dark:bg-[#3A2418] rounded-xl" />
        </div>
      </div>

      {/* Recent section */}
      <div className="mt-6 space-y-1">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="h-2.5 w-14 bg-[#EDE0DC] dark:bg-[#3A2418] rounded" />
          <div className="flex-1 h-px bg-[#EDE0DC] dark:bg-[#3A2418]" />
        </div>
        {[0, 1, 2].map(i => (
          <div key={i} className="flex items-center gap-3 py-2.5">
            <div className="w-10 h-10 rounded-[12px] bg-[#EDE0DC] dark:bg-[#3A2418] flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-32 bg-[#EDE0DC] dark:bg-[#3A2418] rounded" />
              <div className="h-3 w-24 bg-[#EDE0DC] dark:bg-[#3A2418] rounded" />
            </div>
            <div className="space-y-1.5 text-right">
              <div className="h-3.5 w-20 bg-[#EDE0DC] dark:bg-[#3A2418] rounded ml-auto" />
              <div className="h-3 w-14 bg-[#EDE0DC] dark:bg-[#3A2418] rounded ml-auto" />
            </div>
          </div>
        ))}
      </div>

      {/* Invite code */}
      <div className="mt-6">
        <div className="rounded-[18px] h-[74px] bg-[#EDE0DC] dark:bg-[#3A2418]" />
      </div>

    </div>
  )
}
