export default function MemoriesLoading() {
  return (
    <div>

      {/* Header row: "Memories" + "Edit  ← Back" */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-24 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-lg animate-pulse" />
        <div className="flex items-center gap-4">
          <div className="h-4 w-6 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          <div className="h-4 w-[52px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
        </div>
      </div>

      {/* Subtitle: "Things you've done together" — text-[13px] mt-1 mb-3 */}
      <div className="h-[13px] w-[168px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse mt-2 mb-4" />

      {/* Memory cards */}
      {[
        { nameW: '62%', badgeW: 72, hasNote: false },
        { nameW: '48%', badgeW: 60, hasNote: true  },
        { nameW: '70%', badgeW: 80, hasNote: false },
      ].map((card, i) => (
        <div
          key={i}
          className="bg-white dark:bg-[#2E201C] rounded-[14px] border border-[#EDE0DC] dark:border-[#3D2820] p-[14px] mb-[10px]"
        >
          {/* Item name — text-[14px] font-semibold mb-1 */}
          <div
            className="h-[14px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse mb-[7px]"
            style={{ width: card.nameW }}
          />
          {/* Meta row: date + category badge */}
          <div className="flex items-center gap-2">
            <div className="h-[11px] w-[72px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
            <div
              className="h-[18px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded-md animate-pulse"
              style={{ width: card.badgeW }}
            />
          </div>
          {/* Note line — italic text-[12px], shown for some cards */}
          {card.hasNote && (
            <div className="h-3 w-4/5 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse mt-2" />
          )}
        </div>
      ))}

    </div>
  )
}
