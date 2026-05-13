export default function BucketLoading() {
  return (
    <div className="animate-pulse">

      {/* Header */}
      <div className="flex items-start justify-between pb-5">
        <div className="space-y-1.5">
          <div className="h-6 w-28 bg-[#EDE0DC] dark:bg-[#3A2418] rounded" />
          <div className="h-3 w-32 bg-[#EDE0DC] dark:bg-[#3A2418] rounded" />
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-[30px] h-[30px] bg-[#EDE0DC] dark:bg-[#3A2418] rounded-[9px]" />
          <div className="w-[30px] h-[30px] bg-[#EDE0DC] dark:bg-[#3A2418] rounded-[9px]" />
          <div className="h-[30px] w-[62px] bg-[#EDE0DC] dark:bg-[#3A2418] rounded-[9px]" />
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 overflow-hidden pb-1 mb-5">
        {[36, 52, 58, 56, 56, 52].map((w, i) => (
          <div key={i} className="flex-shrink-0 h-[30px] bg-[#EDE0DC] dark:bg-[#3A2418] rounded-full" style={{ width: w }} />
        ))}
      </div>

      {/* Memories link */}
      <div className="rounded-[14px] border border-[#EDE0DC] dark:border-[#3A2418] px-[14px] py-3 flex items-center gap-3 mb-5">
        <div className="w-[34px] h-[34px] rounded-[10px] bg-[#EDE0DC] dark:bg-[#3A2418] flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-[13.5px] w-24 bg-[#EDE0DC] dark:bg-[#3A2418] rounded" />
          <div className="h-[11px] w-40 bg-[#EDE0DC] dark:bg-[#3A2418] rounded" />
        </div>
        <div className="w-4 h-4 bg-[#EDE0DC] dark:bg-[#3A2418] rounded" />
      </div>

      {/* Random picker */}
      <div className="rounded-[18px] border border-[#EDE0DC] dark:border-[#3A2418] p-[16px_18px] mb-5">
        <div className="h-2.5 w-32 bg-[#EDE0DC] dark:bg-[#3A2418] rounded mb-3" />
        <div className="flex gap-1.5 overflow-hidden mb-3">
          {[36, 52, 58, 56, 56, 52].map((w, i) => (
            <div key={i} className="flex-shrink-0 h-[26px] bg-[#EDE0DC] dark:bg-[#3A2418] rounded-full" style={{ width: w }} />
          ))}
        </div>
        <div className="h-10 w-full bg-[#EDE0DC] dark:bg-[#3A2418] rounded-xl" />
      </div>

      {/* Section rule */}
      <div className="flex items-center gap-2.5 mb-3.5">
        <div className="h-2.5 w-20 bg-[#EDE0DC] dark:bg-[#3A2418] rounded flex-shrink-0" />
        <div className="flex-1 h-px bg-[#EDE0DC] dark:bg-[#3A2418]" />
      </div>

      {/* 2-column card grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { h: 100, w: '75%' },
          { h: 116, w: '60%' },
          { h: 108, w: '85%' },
          { h: 96,  w: '70%' },
        ].map((card, i) => (
          <div key={i} className="rounded-[16px] border border-[#EDE0DC] dark:border-[#3A2418] bg-[#EDE0DC] dark:bg-[#3A2418] p-[11px_13px_12px] flex flex-col gap-2.5" style={{ height: card.h }}>
            <div className="h-2 w-12 bg-[#D4C8C4] dark:bg-[#261812] rounded" />
            <div className="h-3.5 bg-[#D4C8C4] dark:bg-[#261812] rounded" style={{ width: card.w }} />
            <div className="h-3.5 bg-[#D4C8C4] dark:bg-[#261812] rounded w-1/2" />
            <div className="h-6 w-14 bg-[#D4C8C4] dark:bg-[#261812] rounded-[7px] mt-auto" />
          </div>
        ))}
      </div>

      {/* Memories strip section rule */}
      <div className="flex items-center gap-2.5 mt-6 mb-3">
        <div className="h-2.5 w-24 bg-[#EDE0DC] dark:bg-[#3A2418] rounded flex-shrink-0" />
        <div className="flex-1 h-px bg-[#EDE0DC] dark:bg-[#3A2418]" />
      </div>

      {/* Memories horizontal strip */}
      <div className="flex gap-2.5 overflow-hidden pb-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-[130px] flex-shrink-0 h-[72px] rounded-[14px] bg-[#EDE0DC] dark:bg-[#3A2418]" />
        ))}
      </div>

    </div>
  )
}
