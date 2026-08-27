export default function ShoppingLoading() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="h-6 w-32 bg-[#ECDFD2] dark:bg-[#3A2418] rounded" />
          <div className="h-3 w-20 bg-[#ECDFD2] dark:bg-[#3A2418] rounded mt-2.5" />
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-[30px] h-[30px] rounded-[9px] bg-[#ECDFD2] dark:bg-[#3A2418]" />
          <div className="w-[30px] h-[30px] rounded-[9px] bg-[#ECDFD2] dark:bg-[#3A2418]" />
        </div>
      </div>

      {/* Add row */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex-1 h-[46px] rounded-xl bg-[#ECDFD2] dark:bg-[#3A2418]" />
        <div className="w-[46px] h-[46px] rounded-xl bg-[#ECDFD2] dark:bg-[#3A2418]" />
      </div>

      {/* Items */}
      <div className="flex flex-col gap-2">
        {['70%', '45%', '58%', '38%', '64%'].map((w, i) => (
          <div
            key={i}
            className="h-[49px] rounded-[14px] border border-[#ECDFD2] dark:border-[#3A2418] bg-[#ECDFD2] dark:bg-[#3A2418] px-3.5 flex items-center gap-3"
          >
            <div className="w-[21px] h-[21px] rounded-full bg-[#D4C8C4] dark:bg-[#261812] flex-shrink-0" />
            <div className="h-3.5 bg-[#D4C8C4] dark:bg-[#261812] rounded" style={{ width: w }} />
          </div>
        ))}
      </div>

      {/* Bought section rule */}
      <div className="flex items-center gap-2.5 mt-7">
        <div className="h-2.5 w-20 bg-[#ECDFD2] dark:bg-[#3A2418] rounded flex-shrink-0" />
        <div className="flex-1 h-px bg-[#ECDFD2] dark:bg-[#3A2418]" />
      </div>
    </div>
  )
}
