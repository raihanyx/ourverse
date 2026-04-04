export default function BucketLoading() {
  return (
    <div className="space-y-5 animate-loading">

      {/* Page header: icon badge + title + subtitle + [Tip] [Edit] [Add] */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#EDE0DC] dark:bg-[#3D2820] animate-pulse flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="h-[18px] w-24 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
            <div className="h-3 w-36 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
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

      {/* Memories link card */}
      <div className="bg-white dark:bg-[#2E201C] rounded-[14px] border border-[#EDE0DC] dark:border-[#3D2820] flex items-center justify-between px-4 py-[13px] shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-xl animate-pulse flex-shrink-0" />
          <div className="space-y-[6px]">
            <div className="h-[14px] w-[80px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
            <div className="h-[11px] w-[148px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          </div>
        </div>
        <div className="h-[14px] w-3 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
      </div>

      {/* Random picker card */}
      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px] shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">
        <div className="h-[10px] w-36 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse mb-3" />
        <div className="flex gap-[6px] overflow-hidden mb-3">
          {[44, 94, 62, 82, 62, 60].map((w, i) => (
            <div key={i} className="flex-shrink-0 h-[26px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded-full animate-pulse" style={{ width: w }} />
          ))}
        </div>
        <div className="h-10 w-full bg-[#EDE0DC] dark:bg-[#3D2820] rounded-xl animate-pulse" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-hidden">
        {[40, 94, 62, 82, 62, 60, 54].map((w, i) => (
          <div key={i} className="flex-shrink-0 h-8 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-full animate-pulse" style={{ width: w }} />
        ))}
      </div>

      {/* Item list card — 4 rows */}
      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] px-[18px] shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">
        {[
          { nameW: '58%' },
          { nameW: '72%' },
          { nameW: '45%' },
          { nameW: '63%' },
        ].map((row, i) => (
          <div
            key={i}
            className="flex items-center gap-3 py-3 border-b border-[#F5EDE9] dark:border-[#3D2820] last:border-0"
          >
            <div className="flex-1 min-w-0 space-y-[7px]">
              <div className="h-[14px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" style={{ width: row.nameW }} />
              <div className="flex items-center gap-2">
                <div className="h-[18px] w-[60px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded-md animate-pulse" />
                <div className="h-[11px] w-[72px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
              </div>
            </div>
            <div className="h-3 w-[58px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse flex-shrink-0" />
          </div>
        ))}
      </div>

    </div>
  )
}
