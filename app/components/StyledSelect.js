'use client'

const baseClass = `w-full rounded-[10px] border text-sm
                   border-[#ECDFD2] dark:border-[#3D2820] bg-[#F8F2EB] dark:bg-[#1A1210]
                   text-[#2A1810] dark:text-[#FAF3F1]
                   focus:outline-none focus:border-[#D8513E] dark:focus:border-[#F0907F] transition-colors`

export default function StyledSelect({ children, ...props }) {
  return (
    <div className="relative">
      <select
        {...props}
        className={baseClass}
        style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', paddingLeft: '12px', paddingRight: '32px', paddingTop: '10px', paddingBottom: '10px', width: '100%' }}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[16px] text-[#7A5C4E] dark:text-[#D4A090]">
        ▾
      </div>
    </div>
  )
}
