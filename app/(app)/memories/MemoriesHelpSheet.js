'use client'

import { useState, useEffect } from 'react'

function Divider() {
  return <div className="h-px bg-[#F5EDE9] dark:bg-[#3D2820] my-[10px]" />
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-[12px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] mb-1">{title}</p>
      <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] leading-[1.6]">{children}</p>
    </div>
  )
}

export default function MemoriesHelpSheet({ isOpen, onClose }) {
  const [isClosing, setIsClosing] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      setIsClosing(false)
    }
  }, [isOpen])

  function handleClose() {
    setIsClosing(true)
    setTimeout(() => {
      setMounted(false)
      setIsClosing(false)
      onClose()
    }, 220)
  }

  if (!mounted) return null

  const accent = 'text-[#C2493A] dark:text-[#F0907F] font-semibold'

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-[rgba(28,18,16,0.55)] dark:bg-[rgba(10,6,5,0.65)] ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div className={`relative bg-white dark:bg-[#2E201C] rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}>
        {/* Handle */}
        <div className="w-7 h-[3px] rounded-sm bg-[#EDE0DC] dark:bg-[#3D2820] mx-auto mb-[14px]" />

        {/* Title */}
        <p className="text-[15px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] mb-[14px]">
          How memories work
        </p>

        {/* Section 1 */}
        <Section title="What shows up here">
          Every bucket list item or calendar date you mark as done becomes a memory. Both of you share the same list — it's your joint history of things you've done together.
        </Section>

        <Divider />

        {/* Section 2 */}
        <div>
          <p className="text-[12px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] mb-1">Undo done</p>
          <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] leading-[1.6]">
            Tap <span className={accent}>Edit</span>, select memories, then <span className={accent}>Undo done</span>. The item goes back to your bucket list as undone, ready to be marked done again later.
          </p>
          <div className="bg-[#FDF7F6] dark:bg-[#1A1210] border border-[#EDE0DC] dark:border-[#3D2820] rounded-lg px-[10px] py-2 mt-[6px]">
            <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] leading-[1.7]">
              If the item was originally planned from the <span className={accent}>Calendar</span>, it also goes back to its original planned date on the calendar. Items added only from the bucket list return to the bucket list only.
            </p>
          </div>
        </div>

        <Divider />

        {/* Section 3 */}
        <div>
          <p className="text-[12px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] mb-1">Delete</p>
          <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] leading-[1.6]">
            Tap <span className={accent}>Edit</span>, select memories, then <span className={accent}>Delete</span>. This permanently removes the memory, the bucket list item, and the calendar entry if there was one. It cannot be undone.
          </p>
          <div className="bg-[#FDF7F6] dark:bg-[#1A1210] border border-[#EDE0DC] dark:border-[#3D2820] rounded-lg px-[10px] py-2 mt-[6px]">
            <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] leading-[1.7]">
              Use <span className={accent}>Undo done</span> if you want to move something back to the bucket list. Use <span className={accent}>Delete</span> only if you want to remove it entirely.
            </p>
          </div>
        </div>

        {/* Got it button */}
        <button
          onClick={handleClose}
          className="w-full bg-[#C2493A] dark:bg-[#E8675A] text-white text-[13px] font-semibold rounded-[10px] py-[10px] mt-[14px] transition-colors hover:bg-[#A83D30] dark:hover:bg-[#D85A4E] cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
