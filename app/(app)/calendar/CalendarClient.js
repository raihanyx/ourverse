'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { deleteCalendarEntry } from '@/app/actions/calendar'
import { formatDate } from '@/lib/currency'
import AddCalendarEntryForm from './AddCalendarEntryForm'
import AddMemoryForm from './AddMemoryForm'
import CalendarMarkDoneSheet from './CalendarMarkDoneSheet'
import CalendarHelpSheet from './CalendarHelpSheet'
import ConfirmSheet from '@/app/components/ConfirmSheet'
import { BUCKET_CATEGORY_COLORS as CATEGORY_COLORS, BUCKET_CATEGORY_LABELS as CATEGORY_LABELS } from '@/lib/constants'

// ─── Constants ───────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// ─── Small helpers ────────────────────────────────────────

function today() {
  return new Date().toLocaleDateString('en-CA') // 'YYYY-MM-DD'
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function monthBounds(year, month) {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const next  = month === 11
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 2).padStart(2, '0')}-01`
  return { start, next }
}

function CategoryBadge({ category }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other}`}>
      {CATEGORY_LABELS[category] ?? category}
    </span>
  )
}

// ─── Icons ────────────────────────────────────────────────

function HeartIcon({ filled = false }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function CalendarDotIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────

export default function CalendarClient({
  initialEntries,
  initialMemories,
  anniversaryDate,
  currentUserId,
  coupleId,
  partnerName,
  initialYear,
  initialMonth,
}) {
  const [entries, setEntries]             = useState(initialEntries)
  const [memories, setMemories]           = useState(initialMemories)
  const [viewYear, setViewYear]           = useState(initialYear)
  const [viewMonth, setViewMonth]         = useState(initialMonth)
  const [selectedDate, setSelectedDate]   = useState(null)
  const [showHelp, setShowHelp]           = useState(false)
  const [showAddForm, setShowAddForm]     = useState(false)
  const [markDoneTarget, setMarkDoneTarget] = useState(null) // entry object
  const [deleteTarget, setDeleteTarget]   = useState(null) // { id, title }
  const [isDeleting, setIsDeleting]       = useState(false)
  const [showAddMemoryForm, setShowAddMemoryForm] = useState(false)
  const [slideDir, setSlideDir]           = useState(null) // 'left' | 'right'

  // ── Refetch when month changes ──────────────────────────
  const refetchMonth = useCallback(async (year, month) => {
    const supabase = createClient()
    const { start, next } = monthBounds(year, month)
    const [{ data: e }, { data: m }] = await Promise.all([
      supabase.from('calendar_entries').select('*').eq('couple_id', coupleId)
        .gte('date', start).lt('date', next).order('date', { ascending: true }),
      supabase.from('memories').select('*').eq('couple_id', coupleId)
        .gte('date', start).lt('date', next).order('date', { ascending: true }),
    ])
    if (e) setEntries(e)
    if (m) setMemories(m)
  }, [coupleId])

  // ── Month navigation ────────────────────────────────────
  function prevMonth() {
    setSlideDir('right')
    setSelectedDate(null)
    const newY = viewMonth === 0 ? viewYear - 1 : viewYear
    const newM = viewMonth === 0 ? 11 : viewMonth - 1
    setViewYear(newY)
    setViewMonth(newM)
    refetchMonth(newY, newM)
  }

  function nextMonth() {
    setSlideDir('left')
    setSelectedDate(null)
    const newY = viewMonth === 11 ? viewYear + 1 : viewYear
    const newM = viewMonth === 11 ? 0 : viewMonth + 1
    setViewYear(newY)
    setViewMonth(newM)
    refetchMonth(newY, newM)
  }

  // ── Realtime subscriptions ──────────────────────────────
  useEffect(() => {
    const supabase = createClient()

    const calChannel = supabase
      .channel(`calendar-entries-${coupleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_entries' }, payload => {
        const row = payload.new ?? payload.old
        if (row?.couple_id !== coupleId) return

        if (payload.eventType === 'INSERT') {
          // Only add if it falls in the current viewed month
          const rowDate = payload.new?.date
          if (!rowDate) return
          const [rY, rM] = rowDate.split('-').map(Number)
          if (rY !== viewYear || rM - 1 !== viewMonth) return
          setEntries(prev => prev.some(e => e.id === payload.new.id) ? prev : [...prev, payload.new])
        } else if (payload.eventType === 'UPDATE') {
          setEntries(prev => prev.map(e => e.id === payload.new.id ? payload.new : e))
        } else if (payload.eventType === 'DELETE') {
          setEntries(prev => prev.filter(e => e.id !== payload.old.id))
        }
      })
      .subscribe()

    const memChannel = supabase
      .channel(`calendar-memories-${coupleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memories' }, payload => {
        const row = payload.new ?? payload.old
        if (row?.couple_id !== coupleId) return

        const memDate = payload.new?.date ?? payload.old?.date
        if (!memDate) return
        const [mY, mM] = memDate.split('-').map(Number)
        if (mY !== viewYear || mM - 1 !== viewMonth) return

        if (payload.eventType === 'INSERT') {
          setMemories(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
        } else if (payload.eventType === 'UPDATE') {
          setMemories(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
        } else if (payload.eventType === 'DELETE') {
          setMemories(prev => prev.filter(m => m.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(calChannel)
      supabase.removeChannel(memChannel)
    }
  }, [coupleId, viewYear, viewMonth])

  // ── Completed bucket item IDs (have a memory) ──────────
  const completedBucketIds = useMemo(
    () => new Set(memories.map(m => m.bucket_item_id).filter(Boolean)),
    [memories]
  )

  // ── Date map for O(1) dot lookup ────────────────────────
  // Completed couple entries are excluded — the memory already represents them
  const dateMap = useMemo(() => {
    const map = {}
    memories.forEach(m => {
      map[m.date] ??= { memories: [], entries: [] }
      map[m.date].memories.push(m)
    })
    entries.forEach(e => {
      if (!e.is_personal && e.bucket_item_id && completedBucketIds.has(e.bucket_item_id)) return
      map[e.date] ??= { memories: [], entries: [] }
      map[e.date].entries.push(e)
    })
    return map
  }, [memories, entries, completedBucketIds])

  // ── Anniversary day in this month ───────────────────────
  const anniversaryDay = useMemo(() => {
    if (!anniversaryDate) return null
    const [, annMonth, annDay] = anniversaryDate.split('-').map(Number)
    return annMonth - 1 === viewMonth ? Number(annDay) : null
  }, [anniversaryDate, viewMonth])

  // ── Calendar grid ───────────────────────────────────────
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay() // 0=Sun
  const leadingBlanks  = (firstDayOfWeek + 6) % 7                  // Mon=0
  const daysInMonth    = new Date(viewYear, viewMonth + 1, 0).getDate()
  const todayStr       = today()

  // ── Delete handler ──────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    await deleteCalendarEntry(deleteTarget.id)
    setEntries(prev => prev.filter(e => e.id !== deleteTarget.id))
    // Close the detail panel if this was the only item on the selected date
    const dayData = selectedDate ? dateMap[selectedDate] : null
    const wasOnlyItem =
      (dayData?.entries?.length ?? 0) === 1 &&
      (dayData?.memories?.length ?? 0) === 0
    if (wasOnlyItem) setSelectedDate(null)
    setIsDeleting(false)
    setDeleteTarget(null)
  }

  // ── Selected date detail ────────────────────────────────
  const selectedMemories = selectedDate ? (dateMap[selectedDate]?.memories ?? []) : []
  const selectedEntries  = selectedDate ? (dateMap[selectedDate]?.entries  ?? []) : []

  // ── Formatted selected date label ──────────────────────
  const selectedLabel = useMemo(() => {
    if (!selectedDate) return null
    const d = new Date(selectedDate + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }, [selectedDate])

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#FDECEA] dark:bg-[#3D1E18] flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C2493A" className="dark:stroke-[#F0907F]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <h1 className="text-[18px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] leading-snug">Calendar</h1>
            <p className="text-[12px] text-[#A07060] dark:text-[#D4A090] mt-0.5">
              {entries.length > 0
                ? `${entries.length} thing${entries.length === 1 ? '' : 's'} this month`
                : 'Plan your dates together'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowHelp(true)}
          className="w-8 h-8 rounded-xl border border-[#EDE0DC] dark:border-[#3D2820] bg-[#FDF7F6] dark:bg-[#1A1210] flex items-center justify-center text-[#A07060] dark:text-[#D4A090] hover:border-[#C2493A] hover:text-[#C2493A] dark:hover:border-[#F0907F] dark:hover:text-[#F0907F] transition-colors duration-200 cursor-pointer flex-shrink-0"
          aria-label="Calendar tips"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </button>
      </div>

      {/* Calendar card */}
      <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-4 shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#A07060] dark:text-[#D4A090]
              hover:bg-[#FDF7F6] dark:hover:bg-[#1A1210] transition-colors cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeftIcon />
          </button>
          <span className="text-[15px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#A07060] dark:text-[#D4A090]
              hover:bg-[#FDF7F6] dark:hover:bg-[#1A1210] transition-colors cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRightIcon />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_HEADERS.map((d, i) => (
            <div key={i} className="flex justify-center">
              <span className="text-[11px] font-medium text-[#C4A89E] dark:text-[#A07868] w-8 text-center">
                {d}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div
          key={`${viewYear}-${viewMonth}`}
          className={slideDir === 'left' ? 'animate-tab-left' : slideDir === 'right' ? 'animate-tab-right' : ''}
          onAnimationEnd={() => setSlideDir(null)}
        >
          <div className="grid grid-cols-7 gap-y-1">
            {/* Leading blank cells */}
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day     = i + 1
              const dateStr = toDateStr(viewYear, viewMonth, day)
              const dayData = dateMap[dateStr]
              const isToday    = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const isPast     = dateStr < todayStr
              const isAnn      = anniversaryDay === day

              const hasMem     = (dayData?.memories?.length ?? 0) > 0
              const hasCouple  = dayData?.entries?.some(e => !e.is_personal) ?? false
              const hasPersonal = dayData?.entries?.some(e => e.is_personal) ?? false

              return (
                <div key={dateStr} className="flex justify-center">
                  <button
                    onClick={() => setSelectedDate(prev => prev === dateStr ? null : dateStr)}
                    className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer select-none
                      ${isSelected
                        ? 'bg-[#C2493A] dark:bg-[#E8675A]'
                        : isToday
                          ? 'ring-2 ring-[#C2493A]/30 dark:ring-[#E8675A]/30 hover:bg-[#FEF6F5] dark:hover:bg-[#2A1510]'
                          : 'hover:bg-[#FEF6F5] dark:hover:bg-[#2A1510]'
                      }`}
                    aria-label={dateStr}
                    aria-pressed={isSelected}
                  >
                    {/* Anniversary heart */}
                    {isAnn && !isSelected && (
                      <span className="absolute top-0.5 right-0.5 text-[8px] text-amber-500" aria-hidden="true">♥</span>
                    )}

                    {/* Day number — always centered */}
                    <span className={`text-[13px] font-medium leading-none
                      ${isSelected
                        ? 'text-white'
                        : isPast
                          ? 'text-[#A07060] dark:text-[#D4A090]'
                          : isToday
                            ? 'text-[#C2493A] dark:text-[#E8675A] font-bold'
                            : 'text-[#1C1210] dark:text-[#FAF3F1]'
                      }`}
                    >
                      {day}
                    </span>

                    {/* Indicator dots — absolute bottom */}
                    {(hasMem || hasCouple || hasPersonal) && (
                      <div className="absolute bottom-1 flex gap-[3px]">
                        {hasMem && (
                          <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/80' : 'bg-red-500 dark:bg-red-400'}`} />
                        )}
                        {hasCouple && (
                          <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/80' : 'bg-[#1E40AF] dark:bg-[#7AB0D8]'}`} />
                        )}
                        {hasPersonal && (
                          <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/60' : 'bg-[#3B6D11] dark:bg-[#97C459]'}`} />
                        )}
                      </div>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Dot legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#F5EDE9] dark:border-[#3D2820]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400" />
            <span className="text-[10px] text-[#A07060] dark:text-[#D4A090]">Memory</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1E40AF] dark:bg-[#7AB0D8]" />
            <span className="text-[10px] text-[#A07060] dark:text-[#D4A090]">Together</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3B6D11] dark:bg-[#97C459]" />
            <span className="text-[10px] text-[#A07060] dark:text-[#D4A090]">Personal</span>
          </div>
          {anniversaryDate && (
            <div className="flex items-center gap-1.5">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="#C2493A" className="dark:fill-[#F0907F]" aria-hidden="true">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <span className="text-[10px] text-[#A07060] dark:text-[#D4A090]">Anniversary</span>
            </div>
          )}
        </div>
      </div>

      {/* Selected date detail panel */}
      {selectedDate && (
        <div className="space-y-3 animate-tab-left">

          {/* Date header + Add button */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">{selectedLabel}</p>
              {selectedDate === todayStr && (
                <span className="text-[11px] text-[#C2493A] dark:text-[#E8675A] font-medium">Today</span>
              )}
            </div>
            {selectedDate >= todayStr ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#C2493A] dark:bg-[#E8675A] hover:bg-[#A83D30] text-white rounded-xl text-[13px] font-medium transition-colors cursor-pointer"
              >
                <PlusIcon />
                Add
              </button>
            ) : (
              <button
                onClick={() => setShowAddMemoryForm(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[13px] font-medium transition-colors cursor-pointer"
              >
                <PlusIcon />
                Log memory
              </button>
            )}
          </div>

          {/* Anniversary banner */}
          {anniversaryDay === Number(selectedDate.split('-')[2]) &&
           Number(selectedDate.split('-')[1]) - 1 === viewMonth && (
            <div className="flex items-center gap-3 px-4 py-3 bg-[#FDECEA] dark:bg-[#3D1E18] border border-[#F5C4BE] dark:border-[#5A2A20] rounded-2xl">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#C2493A" className="dark:fill-[#F0907F] flex-shrink-0" aria-hidden="true">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-[#C2493A] dark:text-[#F0907F]">Your anniversary</p>
                {(() => {
                  const years = viewYear - Number(anniversaryDate.split('-')[0])
                  return years > 0 ? (
                    <p className="text-xs text-[#C2493A] dark:text-[#F0907F] opacity-70 mt-0.5">Year {years}</p>
                  ) : null
                })()}
              </div>
            </div>
          )}

          {/* No entries empty state */}
          {selectedMemories.length === 0 && selectedEntries.length === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-[#A07060] dark:text-[#D4A090]">Nothing here yet.</p>
              {selectedDate >= todayStr && (
                <p className="text-xs text-[#C4A89E] dark:text-[#A07868] mt-1">Tap Add to plan something.</p>
              )}
            </div>
          )}

          {/* Memory cards */}
          {selectedMemories.map(memory => (
            <div
              key={memory.id}
              className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[14px] shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none flex gap-3"
            >
              <div className="w-[3px] rounded-full bg-red-500 dark:bg-red-400 flex-shrink-0 self-stretch" />
              <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center flex-shrink-0 mt-0.5 text-red-500 dark:text-red-400">
                <HeartIcon filled />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1C1210] dark:text-[#FAF3F1] truncate mb-2">{memory.name}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <CategoryBadge category={memory.category} />
                  <span className="text-[11px] text-[#A07060] dark:text-[#D4A090]">{formatDate(memory.date)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400">Memory</span>
                </div>
                {memory.note && (
                  <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] italic leading-[1.6] mt-1.5 pl-2.5 border-l-2 border-[#EDE0DC] dark:border-[#3D2820]">
                    {memory.note}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Calendar entry cards */}
          {selectedEntries.map(entry => {
            const isCompleted = !entry.is_personal && entry.bucket_item_id && completedBucketIds.has(entry.bucket_item_id)
            // Personal entries: only creator can delete. Couple entries: either partner can.
            const canDelete   = entry.is_personal ? entry.user_id === currentUserId : true

            if (entry.is_personal) {
              // Personal entry
              return (
                <div
                  key={entry.id}
                  className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[14px] shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none flex gap-3"
                >
                  <div className="w-[3px] rounded-full bg-[#3B6D11] dark:bg-[#97C459] flex-shrink-0 self-stretch" />
                  <div className="w-8 h-8 rounded-xl bg-[#EAF3DE] dark:bg-[#173404] flex items-center justify-center flex-shrink-0 mt-0.5 text-[#3B6D11] dark:text-[#97C459]">
                    <PersonIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-[#1C1210] dark:text-[#FAF3F1] truncate">{entry.title}</p>
                      {canDelete && (
                        <button
                          onClick={() => setDeleteTarget({ id: entry.id, title: entry.title, hasBucketItem: false })}
                          className="flex-shrink-0 text-[#C4A89E] dark:text-[#A07868] hover:text-[#C2493A] dark:hover:text-[#F0907F] transition-colors cursor-pointer p-0.5 -mt-0.5 -mr-0.5"
                          aria-label="Delete entry"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-[#A07060] dark:text-[#D4A090]">
                        {entry.user_id === currentUserId ? 'You' : (partnerName ?? 'Partner')}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-[#EAF3DE] text-[#3B6D11] dark:bg-[#173404] dark:text-[#97C459]">Personal</span>
                    </div>
                    {entry.notes && (
                      <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] italic leading-[1.6] mt-1.5 pl-2.5 border-l-2 border-[#EDE0DC] dark:border-[#3D2820]">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                </div>
              )
            }

            // Couple planned entry
            return (
              <div
                key={entry.id}
                className={`bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[14px] shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none flex gap-3 ${isCompleted ? 'opacity-60' : ''}`}
              >
                <div className={`w-[3px] rounded-full flex-shrink-0 self-stretch ${isCompleted ? 'bg-red-500 dark:bg-red-400' : 'bg-[#1E40AF] dark:bg-[#7AB0D8]'}`} />
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5
                  ${isCompleted
                    ? 'bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400'
                    : 'bg-[#DBEAFE] dark:bg-[#1E2A3A] text-[#1E40AF] dark:text-[#7AB0D8]'
                  }`}
                >
                  {isCompleted ? <CheckIcon /> : <CalendarDotIcon />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className={`text-sm font-semibold truncate ${isCompleted ? 'line-through text-[#A07060] dark:text-[#D4A090]' : 'text-[#1C1210] dark:text-[#FAF3F1]'}`}>
                      {entry.title}
                    </p>
                    {!isCompleted && canDelete && (
                      <button
                        onClick={() => setDeleteTarget({ id: entry.id, title: entry.title, hasBucketItem: !!entry.bucket_item_id })}
                        className="flex-shrink-0 text-[#C4A89E] dark:text-[#A07868] hover:text-[#C2493A] dark:hover:text-[#F0907F] transition-colors cursor-pointer p-0.5 -mt-0.5 -mr-0.5"
                        aria-label="Delete entry"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <CategoryBadge category={entry.category} />
                      {partnerName && (
                        <span className="text-[11px] text-[#A07060] dark:text-[#D4A090]">
                          With {partnerName}
                        </span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium
                        ${isCompleted
                          ? 'bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400'
                          : 'bg-[#DBEAFE] text-[#1E40AF] dark:bg-[#1E2A3A] dark:text-[#7AB0D8]'
                        }`}
                      >
                        {isCompleted ? 'Completed' : 'Planned'}
                      </span>
                    </div>
                    {!isCompleted && !entry.notes && (
                      <button
                        onClick={() => setMarkDoneTarget(entry)}
                        className="flex-shrink-0 h-7 px-3 rounded-full border border-[#C2493A] dark:border-[#E8675A] text-[11px] font-medium text-[#C2493A] dark:text-[#E8675A] hover:bg-[#FDECEA] dark:hover:bg-[#3D1E18] transition-colors cursor-pointer"
                      >
                        Mark done
                      </button>
                    )}
                  </div>
                  {!isCompleted && entry.notes && (
                    <div className="flex items-end justify-between gap-3 mt-2">
                      <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] italic leading-[1.6] pl-2.5 border-l-2 border-[#EDE0DC] dark:border-[#3D2820] flex-1 min-w-0">
                        {entry.notes}
                      </p>
                      <button
                        onClick={() => setMarkDoneTarget(entry)}
                        className="flex-shrink-0 h-7 px-3 rounded-full border border-[#C2493A] dark:border-[#E8675A] text-[11px] font-medium text-[#C2493A] dark:text-[#E8675A] hover:bg-[#FDECEA] dark:hover:bg-[#3D1E18] transition-colors cursor-pointer"
                      >
                        Mark done
                      </button>
                    </div>
                  )}
                  {isCompleted && entry.notes && (
                    <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] italic leading-[1.6] mt-2 pl-2.5 border-l-2 border-[#EDE0DC] dark:border-[#3D2820]">
                      {entry.notes}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Help sheet */}
      <CalendarHelpSheet isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Add memory form sheet — past dates only */}
      {showAddMemoryForm && selectedDate && (
        <AddMemoryForm
          date={selectedDate}
          onSuccess={() => {
            setShowAddMemoryForm(false)
            refetchMonth(viewYear, viewMonth)
          }}
          onCancel={() => setShowAddMemoryForm(false)}
        />
      )}

      {/* Add entry form sheet */}
      {showAddForm && selectedDate && (
        <AddCalendarEntryForm
          date={selectedDate}
          coupleId={coupleId}
          partnerName={partnerName}
          onSuccess={() => {
            setShowAddForm(false)
            refetchMonth(viewYear, viewMonth)
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Delete confirmation sheet */}
      {markDoneTarget && (
        <CalendarMarkDoneSheet
          entry={markDoneTarget}
          onSuccess={() => {
            setMarkDoneTarget(null)
            refetchMonth(viewYear, viewMonth)
          }}
          onCancel={() => setMarkDoneTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmSheet
          message={`Delete "${deleteTarget.title}"?${deleteTarget.hasBucketItem ? ' The linked bucket list item will also be removed.' : ''}`}
          confirmLabel={isDeleting ? 'Deleting…' : 'Delete'}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

    </div>
  )
}
