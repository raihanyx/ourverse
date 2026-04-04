'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveAnniversaryDate } from '@/app/actions/couple'
import { formatDate } from '@/lib/currency'

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

export default function TogetherCard({ anniversaryDate, coupleId }) {
  const router = useRouter()
  const [date, setDate] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!date) return
    startTransition(async () => {
      await saveAnniversaryDate(coupleId, date)
      router.refresh()
    })
  }

  return (
    <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px] shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">
      <h2 className="text-[10px] font-semibold text-[#A07060] dark:text-[#D4A090] uppercase tracking-wider mb-3">
        Together
      </h2>

      {anniversaryDate ? (
        <>
          {(() => {
            const { years, months, days } = getTimeTogether(anniversaryDate)
            return (
              <>
                <div className="flex gap-2">
                  {[
                    { value: years, label: 'Years' },
                    { value: months, label: 'Months' },
                    { value: days, label: 'Days' },
                  ].map(({ value, label }) => (
                    <div
                      key={label}
                      className="flex-1 bg-gradient-to-b from-[#FDF7F6] to-[#FAF0ED] dark:from-[#1A1210] dark:to-[#221510] border border-[#EDE0DC] dark:border-[#3D2820] rounded-xl p-3 text-center"
                    >
                      <p className="text-[26px] font-bold text-[#C2493A] dark:text-[#F0907F] leading-none tabular-nums">
                        {value}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-[#A07060] dark:text-[#D4A090] mt-1.5 font-medium">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-[#C4A89E] dark:text-[#A07868] mt-2">
                  Since {formatDate(anniversaryDate)} · your anniversary
                </p>
              </>
            )
          })()}
        </>
      ) : (
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#FDECEA] dark:bg-[#3D1E18] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C2493A" className="dark:stroke-[#F0907F]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
          </div>
          <p className="text-[14px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] mb-1">
            When did you get together?
          </p>
          <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] mb-3.5 leading-[1.5]">
            Add your start date to see how long you&apos;ve been together
          </p>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="block w-full max-w-[200px] mx-auto mb-3 px-3 py-2 text-[13px] text-center text-[#1C1210] dark:text-[#FAF3F1] bg-[#FDF7F6] dark:bg-[#1A1210] border border-[#EDE0DC] dark:border-[#3D2820] rounded-[10px] focus:outline-none focus:border-[#C2493A] dark:focus:border-[#F0907F] transition-colors"
          />
          <button
            onClick={handleSave}
            disabled={!date || isPending}
            className="mx-auto block px-5 py-2 text-[13px] font-semibold text-white bg-[#C2493A] dark:bg-[#E8675A] hover:bg-[#A83D30] dark:hover:bg-[#D85A4E] disabled:opacity-40 transition-colors rounded-[10px] cursor-pointer"
          >
            {isPending ? 'Saving…' : 'Save date'}
          </button>
        </div>
      )}
    </div>
  )
}
