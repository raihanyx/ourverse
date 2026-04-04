export default function MemoriesLoading() {
  return (
    <div className="space-y-5 animate-loading">

      {/* Top nav row: [← Bucket list] + [Tip] */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-[108px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded-full animate-pulse" />
        <div className="h-8 w-[60px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded-full animate-pulse" />
      </div>

      {/* Page header: icon badge + title + subtitle + [Edit] [Add] */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#EDE0DC] dark:bg-[#3D2820] animate-pulse flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="h-[18px] w-24 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
            <div className="h-3 w-40 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="h-8 w-[52px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded-xl animate-pulse" />
          <div className="h-8 w-[62px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Memory cards */}
      <div>
        {[
          { nameW: '62%', badgeW: 72, hasNote: false },
          { nameW: '48%', badgeW: 60, hasNote: true  },
          { nameW: '70%', badgeW: 80, hasNote: false },
        ].map((card, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#2E201C] rounded-[14px] border border-[#EDE0DC] dark:border-[#3D2820] p-[14px] mb-[10px] shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none"
          >
            <div className="h-[14px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse mb-[7px]" style={{ width: card.nameW }} />
            <div className="flex items-center gap-2">
              <div className="h-[11px] w-[72px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
              <div className="h-[18px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded-md animate-pulse" style={{ width: card.badgeW }} />
            </div>
            {card.hasNote && (
              <div className="h-3 w-4/5 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse mt-2" />
            )}
          </div>
        ))}
      </div>

    </div>
  )
}
