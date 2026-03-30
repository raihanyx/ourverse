export default function MemoriesLoading() {
  return (
    <div className="space-y-5">
      {/* Heading */}
      <div className="space-y-2">
        <div className="h-7 w-28 bg-[#EDE0DC] dark:bg-[#3D2820] rounded-lg animate-pulse" />
        <div className="h-4 w-44 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
      </div>

      {/* Memory cards */}
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="bg-white dark:bg-[#2E201C] rounded-[14px] border border-[#EDE0DC] dark:border-[#3D2820] p-[14px] space-y-2"
        >
          <div className="h-4 w-3/5 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-3 w-20 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
            <div className="h-3 w-16 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
          </div>
          <div className="h-3 w-4/5 bg-[#EDE0DC] dark:bg-[#3D2820] rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}
