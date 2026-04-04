export default function PaidExpensesLoading() {
  return (
    <div className="space-y-5 animate-loading">

      {/* Top nav row: [← Ledger] */}
      <div className="h-8 w-[88px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded-full animate-pulse" />

      {/* Page header: icon badge + title + subtitle + [Edit] */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#EDE0DC] dark:bg-[#3D2820] animate-pulse flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="h-[18px] w-32 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
            <div className="h-3 w-36 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          </div>
        </div>
        <div className="h-8 w-[52px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded-xl animate-pulse flex-shrink-0" />
      </div>

      {/* Tab bar */}
      <div className="flex bg-[#F0E8E4] dark:bg-[#120D0B] rounded-xl p-1 gap-1">
        <div className="flex-1 h-9 bg-white dark:bg-[#2E201C] rounded-lg animate-pulse shadow-sm" />
        <div className="flex-1 h-9 rounded-lg animate-pulse" />
      </div>

      {/* Expense list */}
      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] px-[18px] shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">
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
              <div className="h-[14px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" style={{ width: row.nameW }} />
              <div className="flex items-center gap-2">
                <div className="h-[11px] w-[60px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
                <div className="h-[18px] w-[56px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded-md animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-[6px] flex-shrink-0">
              <div className="h-[14px] w-[80px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
              <div className="h-3 w-[40px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
