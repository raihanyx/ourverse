export default function LedgerLoading() {
  return (
    <div className="space-y-5">

      {/* Header + tabs — space-y-3 group */}
      <div className="space-y-3">

        {/* Header row: "Ledger" + tip button + divider + "Edit" */}
        <div className="flex items-center justify-between">
          <div className="h-7 w-14 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-lg animate-pulse" />
          <div className="flex items-center" style={{ gap: 10 }}>
            {/* 💡 Tip stub */}
            <div className="h-[14px] w-[30px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
            {/* Divider */}
            <div className="w-px h-[14px] bg-[#EDE0DC] dark:bg-[#3D2820]" />
            {/* Edit stub */}
            <div className="h-4 w-6 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex bg-[#F0E8E4] dark:bg-[#120D0B] rounded-xl p-1 gap-1">
          <div className="flex-1 h-9 bg-white dark:bg-[#2E201C] rounded-lg animate-pulse shadow-sm" />
          <div className="flex-1 h-9 rounded-lg animate-pulse" />
        </div>

      </div>

      {/* Totals card */}
      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px]">
        {/* "X owes you" label — text-[10px] uppercase */}
        <div className="h-[10px] w-28 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse mb-[10px]" />
        {/* Amount badge — text-[13px] py-1 px-3 rounded-full */}
        <div className="h-[30px] w-[120px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded-full animate-pulse" />
        {/* Unified total line — text-xs mt-2 */}
        <div className="h-3 w-44 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse mt-3" />
      </div>

      {/* Expense list card — 4 rows */}
      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] px-[18px]">
        {[
          { nameW: '60%' },
          { nameW: '48%' },
          { nameW: '68%' },
          { nameW: '52%' },
        ].map((row, i) => (
          <div
            key={i}
            className="flex items-start gap-3 py-3 border-b border-[#F5EDE9] dark:border-[#3D2820] last:border-0"
          >
            <div className="flex-1 min-w-0 space-y-[7px]">
              {/* Expense name — text-sm ≈ 14px */}
              <div
                className="h-[14px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse"
                style={{ width: row.nameW }}
              />
              {/* Meta row: date + category badge */}
              <div className="flex items-center gap-2">
                <div className="h-[11px] w-[60px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
                <div className="h-[18px] w-[56px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded-md animate-pulse" />
              </div>
            </div>
            {/* Right: amount + "Mark paid" */}
            <div className="flex flex-col items-end gap-[6px] flex-shrink-0">
              <div className="h-[14px] w-[80px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
              <div className="h-3 w-[58px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
