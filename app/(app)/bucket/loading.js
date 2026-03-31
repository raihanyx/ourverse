export default function BucketLoading() {
  return (
    <div className="space-y-5">

      {/* Header + memories card + picker card — space-y-3 group */}
      <div className="space-y-3">

        {/* Header row: "Bucket list" + tip button + divider + "Edit" */}
        <div className="flex items-center justify-between">
          <div className="h-7 w-28 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-lg animate-pulse" />
          <div className="flex items-center" style={{ gap: 10 }}>
            {/* 💡 Tip stub — emoji + "Tip" text */}
            <div className="h-[14px] w-[30px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
            {/* Divider */}
            <div className="w-px h-[14px] bg-[#EDE0DC] dark:bg-[#3D2820]" />
            {/* Edit stub */}
            <div className="h-4 w-6 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          </div>
        </div>

        {/* Memories link card */}
        <div
          className="bg-white dark:bg-[#2E201C] rounded-[14px] border border-[#EDE0DC] dark:border-[#3D2820] flex items-center justify-between"
          style={{ padding: '13px 16px' }}
        >
          <div className="space-y-[6px]">
            <div className="h-[14px] w-[112px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
            <div className="h-[11px] w-[168px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          </div>
          <div className="h-[14px] w-3 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
        </div>

        {/* Random picker card */}
        <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px]">
          {/* "Pick something random" label */}
          <div className="h-[10px] w-36 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse mb-3" />
          {/* Category pills — single scrollable row, 6 pills */}
          <div className="flex gap-[6px] overflow-hidden mb-3">
            {[44, 94, 62, 82, 62, 60].map((w, i) => (
              <div
                key={i}
                className="flex-shrink-0 h-[26px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded-full animate-pulse"
                style={{ width: w }}
              />
            ))}
          </div>
          {/* Pick button */}
          <div className="h-10 w-full bg-[#EDE0DC] dark:bg-[#3D2820] rounded-xl animate-pulse" />
        </div>

      </div>

      {/* Filter tabs — 7 tabs: All · Restaurants · Travel · Activities · Movies · Other · Done */}
      <div className="flex gap-2 overflow-hidden">
        {[40, 94, 62, 82, 62, 60, 54].map((w, i) => (
          <div
            key={i}
            className="flex-shrink-0 h-8 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-full animate-pulse"
            style={{ width: w }}
          />
        ))}
      </div>

      {/* Item list card — 4 rows */}
      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] px-[18px]">
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
              {/* Item name — text-sm ≈ 14px */}
              <div
                className="h-[14px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse"
                style={{ width: row.nameW }}
              />
              {/* Badges row: category chip + "Added by" */}
              <div className="flex items-center gap-2">
                <div className="h-[18px] w-[60px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded-md animate-pulse" />
                <div className="h-[11px] w-[72px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
              </div>
            </div>
            {/* "Mark done" button — text-xs */}
            <div className="h-3 w-[58px] bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse flex-shrink-0" />
          </div>
        ))}
      </div>

    </div>
  )
}
