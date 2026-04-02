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

export default function BucketHelpSheet({ isOpen, onClose }) {
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
          How the bucket list works
        </p>

        {/* Section 1 */}
        <Section title="Add things you want to do together">
          Add restaurants you want to try, trips you want to take, movies to watch, or anything else. Both of you can add to the same list.
        </Section>

        <Divider />

        {/* Section 2 */}
        <div>
          <p className="text-[12px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] mb-1">
            Can't decide? Let us pick
          </p>
          <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] leading-[1.6]">
            Use the random picker to let the app choose for you. Filter by category if you're only in the mood for a restaurant or a movie.
          </p>
          <div className="bg-[#FDF7F6] dark:bg-[#1A1210] border border-[#EDE0DC] dark:border-[#3D2820] rounded-lg px-[10px] py-2 mt-[6px]">
            <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] leading-[1.7]">
              Stuck on where to eat?<br />
              Select <span className={accent}>Restaurants</span> then tap <span className={accent}>Pick for us</span>.
            </p>
          </div>
        </div>

        <Divider />

        {/* Section 3 */}
        <Section title="Done · it becomes a memory">
          When you do something, mark it as done. You can add the date and a note about how it went. It moves to your Memories page as a keepsake, and also appears on the calendar on the date you did it.
        </Section>

        <Divider />

        {/* Section 4 */}
        <div>
          <p className="text-[12px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] mb-1">
            Connected to the calendar
          </p>
          <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] leading-[1.6]">
            When you plan a date from the Calendar page, it automatically creates a bucket list item here. Marking it done from either place works the same way: it moves to Memories and updates the calendar.
          </p>
          <div className="bg-[#FDF7F6] dark:bg-[#1A1210] border border-[#EDE0DC] dark:border-[#3D2820] rounded-lg px-[10px] py-2 mt-[6px]">
            <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] leading-[1.7]">
              Items added from the calendar show up here just like any other bucket list item — you can mark them done, delete them, or pick them with the random picker.
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
