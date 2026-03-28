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
    <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px]">
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
                      className="flex-1 bg-[#FDF7F6] dark:bg-[#1A1210] border border-[#EDE0DC] dark:border-[#3D2820] rounded-lg p-2 text-center"
                    >
                      <p className="text-[18px] font-bold text-[#C2493A] dark:text-[#F0907F] leading-none">
                        {value}
                      </p>
                      <p className="text-[9px] uppercase tracking-wide text-[#A07060] dark:text-[#D4A090] mt-1">
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
          <p className="dark:[filter:invert(1)]" style={{ fontSize: '28px', marginBottom: '8px' }}>🗓</p>
          <p className="text-[14px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]" style={{ marginBottom: '4px' }}>
            When did you get together?
          </p>
          <p className="text-[11px] text-[#A07060] dark:text-[#D4A090]" style={{ marginBottom: '14px', lineHeight: '1.5' }}>
            Add your start date to see how long you&apos;ve been together
          </p>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="block text-[13px] text-[#1C1210] dark:text-[#FAF3F1] bg-[#FDF7F6] dark:bg-[#1A1210] border border-[#EDE0DC] dark:border-[#3D2820] focus:outline-none focus:border-[#C2493A] dark:focus:border-[#F0907F] transition-colors text-center"
            style={{
              width: '100%',
              maxWidth: '200px',
              margin: '0 auto 12px auto',
              padding: '8px 12px',
              borderRadius: '10px',
              fontSize: '13px',
            }}
          />
          <button
            onClick={handleSave}
            disabled={!date || isPending}
            className="text-white bg-[#C2493A] dark:bg-[#E8675A] hover:bg-[#A83D30] dark:hover:bg-[#D85A4E] disabled:opacity-40 transition-colors"
            style={{
              display: 'block',
              margin: '0 auto',
              width: 'auto',
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: '600',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {isPending ? 'Saving…' : 'Save date'}
          </button>
        </div>
      )}
    </div>
  )
}
