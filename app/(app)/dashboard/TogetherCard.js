'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveAnniversaryDate } from '@/app/actions/couple'

function getTimeTogether(dateString) {
  const start = new Date(dateString + 'T00:00:00')
  const now = new Date()
  let years = now.getFullYear() - start.getFullYear()
  let months = now.getMonth() - start.getMonth()
  let days = now.getDate() - start.getDate()
  if (days < 0) {
    months--
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    days += prevMonth.getDate()
  }
  if (months < 0) {
    years--
    months += 12
  }
  return { years, months, days }
}

function formatAnniversary(dateString) {
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TogetherCard({ anniversaryDate, coupleId }) {
  const router = useRouter()
  const [date, setDate] = useState('')
  const [isPending, startTransition] = useTransition()

  const timeTogether = anniversaryDate ? getTimeTogether(anniversaryDate) : null

  function handleSave() {
    if (!date) return
    startTransition(async () => {
      await saveAnniversaryDate(coupleId, date)
      router.refresh()
    })
  }

  return (
    <div className="relative overflow-hidden rounded-[24px] p-5 bg-gradient-to-br from-[#FDF7F6] via-[#FAF0ED] to-[#FDF5F3] dark:from-[#2E201C] dark:via-[#3A1E18] dark:to-[#2A1810] border border-[#EDE0DC] dark:border-[#3A2418]">
      {/* Decorative glow blobs */}
      <div className="absolute top-[-30px] right-[-20px] w-[130px] h-[130px] rounded-full pointer-events-none" style={{ background: 'rgba(232,103,90,0.08)' }} />
      <div className="absolute bottom-[-20px] left-[10px] w-[80px] h-[80px] rounded-full pointer-events-none" style={{ background: 'rgba(232,103,90,0.06)' }} />

      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#C2493A] dark:text-[#E8675A] mb-4 opacity-80 relative z-10">
        Together
      </p>

      {timeTogether ? (
        <>
          <div className="flex gap-1.5 relative z-10">
            {[
              { v: timeTogether.years, l: 'Years' },
              { v: timeTogether.months, l: 'Months' },
              { v: timeTogether.days, l: 'Days' },
            ].map(({ v, l }) => (
              <div
                key={l}
                className="flex-1 rounded-[16px] px-2 py-3.5 text-center bg-white/50 dark:bg-white/[0.04] border border-[#C2493A]/15 dark:border-[#E8675A]/15"
              >
                <p className="text-[36px] font-bold text-[#C2493A] dark:text-[#E8675A] leading-none tabular-nums tracking-[-1px]">
                  {v}
                </p>
                <p className="text-[10px] uppercase tracking-[0.08em] text-[#A07060] dark:text-[#C89080] mt-1.5 font-medium">
                  {l}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-[#A07060] dark:text-[#7A5848] mt-3.5 relative z-10">
            Since {formatAnniversary(anniversaryDate)} · your anniversary ♥
          </p>
        </>
      ) : (
        <div className="relative z-10">
          <p className="text-[15px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] mb-1">
            When did you get together?
          </p>
          <p className="text-[12px] text-[#A07060] dark:text-[#C89080] mb-4 leading-relaxed">
            Add your start date to see how long you&apos;ve been together
          </p>
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="flex-1 px-3 py-2 text-[13px] text-[#1C1210] dark:text-[#FAF3F1] bg-white/60 dark:bg-white/[0.06] border border-[#EDE0DC] dark:border-[#3A2418] rounded-[10px] focus:outline-none focus:border-[#C2493A] dark:focus:border-[#E8675A] transition-colors"
            />
            <button
              onClick={handleSave}
              disabled={!date || isPending}
              className="px-4 py-2 text-[13px] font-semibold text-white bg-[#C2493A] dark:bg-[#E8675A] hover:bg-[#A83D30] dark:hover:bg-[#D85A4E] disabled:opacity-40 rounded-[10px] cursor-pointer transition-colors whitespace-nowrap"
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
