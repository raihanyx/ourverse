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

function DotLegendRow({ dotClass, label, description, mt = '4.5px' }) {
  return (
    <div className="flex items-start gap-2.5 py-[5px]">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} style={{ marginTop: mt }} />
      <div>
        <p className="text-[11px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] leading-[1.4]">{label}</p>
        <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] leading-[1.5] mt-[1px]">{description}</p>
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
              dotClass="bg-red-500 dark:bg-red-400"
              mt="4.3px"
              label="Red"
              description="Something you've done together. Created when you mark a calendar entry or bucket item as done."
            />
            <div className="h-px bg-[#F5EDE9] dark:bg-[#3D2820]" />
            <DotLegendRow
              dotClass="bg-indigo-500 dark:bg-indigo-400"
              mt="4.2px"
              label="Purple"
              description="Something you're planning together. Also creates a matching bucket list item to track and mark done."
            />
            <div className="h-px bg-[#F5EDE9] dark:bg-[#3D2820]" />
            <DotLegendRow
              dotClass="bg-emerald-500 dark:bg-emerald-400"
              mt="4.1px"
              label="Green"
              description="A personal plan (flight, appointment, etc.). Doesn't create a bucket list item, but your partner can still see it."
            />
            <div className="h-px bg-[#F5EDE9] dark:bg-[#3D2820]" />
            <div className="flex items-start gap-2.5 py-[5px]">
              <span className="text-[11px] text-amber-500 flex-shrink-0 leading-[1.4]">♥</span>
              <div>
                <p className="text-[11px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] leading-[1.4]">Heart</p>
                <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] leading-[1.5] mt-[1px]">Marks your anniversary date. Appears every year on that day.</p>
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
            Tap a date, then <span className={accent}>Add → Together</span>. It creates the calendar entry and a matching bucket list item at the same time.
          </p>
          <div className="bg-[#FDF7F6] dark:bg-[#1A1210] border border-[#EDE0DC] dark:border-[#3D2820] rounded-lg px-[10px] py-2 mt-[6px]">
            <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] leading-[1.7]">
              Already have a reservation? Add it here. It shows up in the bucket list automatically.
            </p>
          </div>
        </div>

        <Divider />

        {/* Personal entries */}
        <Section title="Personal entries">
          Tap a date, then <span className={accent}>Add → Just me</span> for personal plans like flights or appointments. Your partner can still see it to help coordinate.
        </Section>

        <Divider />

        {/* Marking done */}
        <div>
          <p className="text-[12px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] mb-1">
            Marking a date as done
          </p>
          <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] leading-[1.6]">
            Tap <span className={accent}>Mark done</span> on any planned entry (or from the bucket list). Pick the actual date, add a note. It becomes a memory and the dot turns red.
          </p>
          <div className="bg-[#FDF7F6] dark:bg-[#1A1210] border border-[#EDE0DC] dark:border-[#3D2820] rounded-lg px-[10px] py-2 mt-[6px]">
            <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] leading-[1.7]">
              Planned it for Saturday but went on Sunday? Pick Sunday. The calendar moves it to the right date.
            </p>
          </div>
        </div>

        <Divider />

        {/* Memories */}
        <Section title="Memories appear automatically">
          Marking a bucket list item as done adds it to your calendar on the date it was completed. Nothing extra needed.
        </Section>

        <Divider />

        {/* Undo */}
        <Section title="Changed your mind? Undo from Memories">
          Undo a memory from the Memories page to restore it to the bucket list. Calendar entries return to their original planned date; bucket-only items go back to the bucket list.
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
