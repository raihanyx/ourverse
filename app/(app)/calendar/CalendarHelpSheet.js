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

function DotLegendRow({ dotClass, label, description }) {
  return (
    <div className="flex items-start gap-2.5 py-[5px]">
      <span className={`w-2 h-2 rounded-full mt-[3px] flex-shrink-0 ${dotClass}`} />
      <div>
        <span className="text-[11px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">{label} </span>
        <span className="text-[11px] text-[#A07060] dark:text-[#D4A090] leading-[1.6]">{description}</span>
      </div>
    </div>
  )
}

export default function CalendarHelpSheet({ isOpen, onClose }) {
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
      <div
        className={`absolute inset-0 bg-[rgba(28,18,16,0.55)] dark:bg-[rgba(10,6,5,0.65)] ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
        onClick={handleClose}
      />

      <div className={`relative bg-white dark:bg-[#2E201C] rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}>
        <div className="w-7 h-[3px] rounded-sm bg-[#EDE0DC] dark:bg-[#3D2820] mx-auto mb-[14px]" />

        <p className="text-[15px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] mb-[14px]">
          How the calendar works
        </p>

        {/* Dot legend */}
        <div>
          <p className="text-[12px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] mb-[6px]">Reading the dots</p>
          <div className="bg-[#FDF7F6] dark:bg-[#1A1210] border border-[#EDE0DC] dark:border-[#3D2820] rounded-xl px-3 py-1">
            <DotLegendRow
              dotClass="bg-[#C2493A] dark:bg-[#F0907F]"
              label="Red"
              description="Something you've already done together. Created when you mark an item as done, either from the bucket list page or directly from a planned calendar entry."
            />
            <div className="h-px bg-[#F5EDE9] dark:bg-[#3D2820]" />
            <DotLegendRow
              dotClass="bg-indigo-500 dark:bg-indigo-400"
              label="Indigo"
              description="Something you're planning to do together. Adding this also creates a bucket list item so you can track and mark it done later."
            />
            <div className="h-px bg-[#F5EDE9] dark:bg-[#3D2820]" />
            <DotLegendRow
              dotClass="bg-emerald-500 dark:bg-emerald-400"
              label="Green"
              description="A personal plan (flight, appointment, etc.). Does not create a bucket list item, but both of you can see it to avoid scheduling conflicts."
            />
            <div className="h-px bg-[#F5EDE9] dark:bg-[#3D2820]" />
            <div className="flex items-start gap-2.5 py-[5px]">
              <span className="text-[11px] text-amber-500 mt-[-1px] flex-shrink-0">♥</span>
              <div>
                <span className="text-[11px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">Heart </span>
                <span className="text-[11px] text-[#A07060] dark:text-[#D4A090] leading-[1.6]">marks your anniversary date. Appears every year on that day.</span>
              </div>
            </div>
          </div>
        </div>

        <Divider />

        {/* Planning together */}
        <div>
          <p className="text-[12px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] mb-1">
            Planning a date together
          </p>
          <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] leading-[1.6]">
            Tap any future date, then <span className={accent}>Add → Together</span>. This creates a calendar entry and automatically adds a matching item to your shared bucket list, so it shows up as something to do.
          </p>
          <div className="bg-[#FDF7F6] dark:bg-[#1A1210] border border-[#EDE0DC] dark:border-[#3D2820] rounded-lg px-[10px] py-2 mt-[6px]">
            <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] leading-[1.7]">
              Already have a reservation or a fixed plan? Add it from the calendar. It lands in the bucket list automatically. No need to add it twice.
            </p>
          </div>
        </div>

        <Divider />

        {/* Personal entries */}
        <Section title="Personal entries">
          Tap a date, then <span className={accent}>Add → Just me</span> for your own plans: a flight home, a work trip, a family thing. It won't create a bucket list item, but your partner can still see it so you can both coordinate around it.
        </Section>

        <Divider />

        {/* Marking done */}
        <div>
          <p className="text-[12px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] mb-1">
            Marking a date as done
          </p>
          <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] leading-[1.6]">
            Tap <span className={accent}>Mark done</span> on a planned entry, or mark it done from the bucket list. Either way, pick the actual date it happened and add a note. The entry moves to that date and becomes a memory. The indigo dot turns red.
          </p>
          <div className="bg-[#FDF7F6] dark:bg-[#1A1210] border border-[#EDE0DC] dark:border-[#3D2820] rounded-lg px-[10px] py-2 mt-[6px]">
            <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] leading-[1.7]">
              Planned it for Saturday but went on Sunday? Just pick Sunday. The calendar moves it to the right date.
            </p>
          </div>
        </div>

        <Divider />

        {/* Memories */}
        <Section title="Memories appear automatically">
          When you mark a bucket list item as done, the memory shows up on your calendar on the date it was completed. No extra steps needed.
        </Section>

        <Divider />

        {/* Undo */}
        <Section title="Changed your mind? Undo from Memories">
          If you undo a memory from the Memories page, it goes back to being an undone bucket list item. The calendar entry returns to its original planned date, ready to reschedule.
        </Section>

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
