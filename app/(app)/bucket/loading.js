export default function BucketLoading() {
  return (
    <div className="space-y-5">
      {/* Heading row */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-28 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-lg animate-pulse" />
        <div className="h-9 w-20 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-xl animate-pulse" />
      </div>

      {/* Random picker card */}
      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px] space-y-3">
        <div className="h-3 w-36 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-7 w-20 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-full animate-pulse" />
          ))}
        </div>
        <div className="h-10 w-full bg-[#EDE0DC] dark:bg-[#3D2820] rounded-xl animate-pulse" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-8 w-20 flex-shrink-0 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-full animate-pulse" />
        ))}
      </div>

      {/* Item rows */}
      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] px-[18px]">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="flex items-center gap-3 py-3 border-b border-[#F5EDE9] dark:border-[#3D2820] last:border-0"
          >
            <div className="w-5 h-5 rounded-full bg-[#EDE0DC] dark:bg-[#3D2820] flex-shrink-0 animate-pulse" />
            <div className="flex-1 space-y-2 min-w-0">
              <div className="h-4 w-3/5 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
              <div className="h-3 w-2/5 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
