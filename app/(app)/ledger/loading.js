export default function LedgerLoading() {
  return (
    <div className="space-y-5 animate-loading">

      {/* Page header: icon badge + title + subtitle + [Tip] [Edit] [Add] */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#EDE0DC] dark:bg-[#3D2820] animate-pulse flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="h-[18px] w-14 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
            <div className="h-3 w-28 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Tip button w-8 h-8 */}
          <div className="w-8 h-8 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-xl animate-pulse" />
          {/* Edit button h-8 px-3.5 */}
          <div className="h-8 w-[52px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded-xl animate-pulse" />
          {/* Add button h-8 px-3 */}
          <div className="h-8 w-[62px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex bg-[#F0E8E4] dark:bg-[#120D0B] rounded-xl p-1 gap-1">
        <div className="flex-1 h-9 bg-white dark:bg-[#2E201C] rounded-lg animate-pulse shadow-sm" />
        <div className="flex-1 h-9 rounded-lg animate-pulse" />
      </div>

      {/* Totals card */}
      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px] shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">
        <div className="h-[10px] w-28 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse mb-[10px]" />
        <div className="h-[30px] w-[120px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded-full animate-pulse" />
        <div className="h-3 w-44 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse mt-3" />
      </div>

      {/* Expense list card — 4 rows */}
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
              <div className="h-3 w-[58px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
