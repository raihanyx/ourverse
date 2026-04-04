'use client'

const baseClass = `w-full rounded-[10px] border text-sm
                   border-[#EDE0DC] dark:border-[#3D2820] bg-[#FDF7F6] dark:bg-[#1A1210]
                   text-[#1C1210] dark:text-[#FAF3F1]
                   focus:outline-none focus:border-[#C2493A] dark:focus:border-[#F0907F] transition-colors`

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
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[16px] text-[#A07060] dark:text-[#D4A090]">
        ▾
      </div>
    </div>
  )
}
