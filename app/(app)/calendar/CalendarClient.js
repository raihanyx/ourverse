'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { todayISO } from '@/lib/currency'
import AddCalendarEntryForm from './AddCalendarEntryForm'
import CalendarMarkDoneSheet from './CalendarMarkDoneSheet'
import CalendarHelpSheet from './CalendarHelpSheet'

// ─── V2 tokens ─────────────────────────────────────────────────
const V2 = {
  bg:        'var(--v2-bg)',
  surface:   'var(--v2-card)',
  border:    'var(--v2-border)',
  t1:        'var(--v2-t1)',
  t2:        'var(--v2-t2)',
  t3:        'var(--v2-t3)',
  accent:    'var(--v2-accent)',
  accentDim: 'var(--v2-accentDim)',
}

// ─── Type meta ─────────────────────────────────────────────────
const TYPE_META = {
  couple:      { color: 'var(--v2-blue)', label: 'Together'    },
  personal:    { color: 'var(--v2-green)', label: 'Personal'    },
  memory:      { color: V2.accent, label: 'Memory'      },
  anniversary: { color: 'var(--v2-orange)', label: 'Anniversary' },
}

const CAT_FG = {
  restaurant: 'var(--cat-restaurant-fg)',
  travel:     'var(--cat-travel-fg)',
  activity:   'var(--cat-activity-fg)',
  movie:      'var(--cat-movie-fg)',
  other:      'var(--cat-other-fg)',
}
const CAT_LABEL = {
  restaurant: 'Restaurant',
  travel:     'Travel',
  activity:   'Activity',
  movie:      'Movie',
  other:      'Other',
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEKDAY_FULL    = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ─── Helpers ───────────────────────────────────────────────────
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

// ─── Icons ─────────────────────────────────────────────────────
function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}
function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
function ChevLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
function ChevRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

// ─── IconBtn ───────────────────────────────────────────────────
function IconBtn({ onClick, ariaLabel, children }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="rounded-[9px] flex items-center justify-center cursor-pointer transition-colors"
      style={{
        width: 30, height: 30,
        border: `1px solid ${V2.border}`,
        background: V2.bg,
        color: V2.t2,
      }}
    >
      {children}
    </button>
  )
}

// ─── Main ─────────────────────────────────────────────────────
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
  const [entries,    setEntries]    = useState(initialEntries)
  const [memories,   setMemories]   = useState(initialMemories)
  const [annDate,    setAnnDate]    = useState(anniversaryDate)
  const [viewYear,   setViewYear]   = useState(initialYear)
  const [viewMonth,  setViewMonth]  = useState(initialMonth)
  const viewYearRef  = useRef(initialYear)
  const viewMonthRef = useRef(initialMonth)
  useEffect(() => { viewYearRef.current  = viewYear  }, [viewYear])
  useEffect(() => { viewMonthRef.current = viewMonth }, [viewMonth])

  const [selectedDay,     setSelectedDay]     = useState(() => {
    const t = new Date()
    return (t.getFullYear() === initialYear && t.getMonth() === initialMonth) ? t.getDate() : 1
  })
  const [showHelp,        setShowHelp]        = useState(false)
  const [showAddForm,     setShowAddForm]     = useState(false)
  const [markDoneTarget,  setMarkDoneTarget]  = useState(null)
  const [slideDir,        setSlideDir]        = useState(null)

  // ── Refetch on month change ─────────────────────────────────
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

  function prevMonth() {
    setSlideDir('right')
    setSelectedDay(1)
    const newY = viewMonth === 0 ? viewYear - 1 : viewYear
    const newM = viewMonth === 0 ? 11 : viewMonth - 1
    setViewYear(newY); setViewMonth(newM)
    refetchMonth(newY, newM)
  }
  function nextMonth() {
    setSlideDir('left')
    setSelectedDay(1)
    const newY = viewMonth === 11 ? viewYear + 1 : viewYear
    const newM = viewMonth === 11 ? 0 : viewMonth + 1
    setViewYear(newY); setViewMonth(newM)
    refetchMonth(newY, newM)
  }

  // ── Realtime ────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const cal = supabase
      .channel(`calendar-entries-${coupleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_entries' }, payload => {
        const row = payload.new ?? payload.old
        if (row?.couple_id !== coupleId) return
        const inView = d => {
          if (!d) return false
          const [y, m] = d.split('-').map(Number)
          return y === viewYearRef.current && m - 1 === viewMonthRef.current
        }
        if (payload.eventType === 'INSERT' && inView(payload.new?.date)) {
          setEntries(p => p.some(e => e.id === payload.new.id) ? p : [...p, payload.new])
        } else if (payload.eventType === 'UPDATE') {
          if (inView(payload.new?.date)) {
            setEntries(p => {
              const has = p.some(e => e.id === payload.new.id)
              return has ? p.map(e => e.id === payload.new.id ? payload.new : e) : [...p, payload.new]
            })
          } else {
            setEntries(p => p.filter(e => e.id !== payload.new.id))
          }
        } else if (payload.eventType === 'DELETE') {
          setEntries(p => p.filter(e => e.id !== payload.old.id))
        }
      })
      .subscribe()

    const mem = supabase
      .channel(`calendar-memories-${coupleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memories' }, payload => {
        const row = payload.new ?? payload.old
        if (row?.couple_id !== coupleId) return
        const d = payload.new?.date ?? payload.old?.date
        if (!d) return
        const [y, m] = d.split('-').map(Number)
        if (y !== viewYearRef.current || m - 1 !== viewMonthRef.current) return
        if (payload.eventType === 'INSERT') setMemories(p => p.some(x => x.id === payload.new.id) ? p : [...p, payload.new])
        else if (payload.eventType === 'UPDATE') setMemories(p => p.map(x => x.id === payload.new.id ? payload.new : x))
        else if (payload.eventType === 'DELETE') setMemories(p => p.filter(x => x.id !== payload.old.id))
      })
      .subscribe()

    const cpl = supabase
      .channel(`calendar-couples-${coupleId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${coupleId}` }, payload => {
        if (payload.new?.anniversary_date !== undefined) setAnnDate(payload.new.anniversary_date)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(cal)
      supabase.removeChannel(mem)
      supabase.removeChannel(cpl)
    }
  }, [coupleId])

  // ── Derived ────────────────────────────────────────────────
  const completedBucketIds = useMemo(
    () => new Set(memories.map(m => m.bucket_item_id).filter(Boolean)),
    [memories]
  )

  // Build list of "items" per day, each with type/color/label.
  // Couple entries already marked done (memory exists) are dropped — the memory represents them.
  const dayItems = useMemo(() => {
    const map = {}
    const push = (date, item) => {
      const [, , d] = date.split('-').map(Number)
      map[d] ??= []
      map[d].push(item)
    }
    memories.forEach(m => push(m.date, {
      kind: 'memory',
      type: 'memory',
      id:   m.id,
      title: m.name,
      category: m.category,
      note: m.note,
    }))
    entries.forEach(e => {
      if (!e.is_personal && e.bucket_item_id && completedBucketIds.has(e.bucket_item_id)) return
      push(e.date, {
        kind: 'entry',
        type: e.is_personal ? 'personal' : 'couple',
        id:   e.id,
        title: e.title,
        category: e.category,
        notes: e.notes,
        bucket_item_id: e.bucket_item_id,
        user_id: e.user_id,
        is_personal: e.is_personal,
        raw: e,
      })
    })
    // Anniversary — derive per day for the viewed month
    if (annDate) {
      const [, annM, annD] = annDate.split('-').map(Number)
      if (annM - 1 === viewMonth) {
        push(toDateStr(viewYear, viewMonth, annD), {
          kind: 'anniversary',
          type: 'anniversary',
          id: 'anniversary',
          title: 'Anniversary',
          category: 'other',
        })
      }
    }
    return map
  }, [memories, entries, completedBucketIds, annDate, viewYear, viewMonth])

  // ── Grid setup ─────────────────────────────────────────────
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const leadingBlanks  = (firstDayOfWeek + 6) % 7
  const daysInMonth    = new Date(viewYear, viewMonth + 1, 0).getDate()
  const todayStr       = todayISO()
  const [tY, tM, tD] = todayStr.split('-').map(Number)
  const todayDay = (tY === viewYear && tM - 1 === viewMonth) ? tD : null

  const selectedDateStr = toDateStr(viewYear, viewMonth, selectedDay)
  const selectedItems   = dayItems[selectedDay] ?? []
  // Filter out anniversary from "entries" count (it has no row in entries list)
  const visibleSelected = selectedItems.filter(i => i.kind !== 'anniversary')
  const hasAnniversary  = selectedItems.some(i => i.kind === 'anniversary')

  const selectedWeekdayIdx = new Date(viewYear, viewMonth, selectedDay).getDay()
  const selectedLabel = `${WEEKDAY_FULL[selectedWeekdayIdx]}, ${MONTH_NAMES[viewMonth]} ${selectedDay}`

  // ── Handlers ───────────────────────────────────────────────
  function inViewDate(d) {
    if (!d) return false
    const [y, m] = d.split('-').map(Number)
    return y === viewYearRef.current && m - 1 === viewMonthRef.current
  }

  function handleAddSuccess(data) {
    if (data?.kind === 'entry' && inViewDate(data.entry?.date)) {
      const row = data.entry
      setEntries(prev => prev.some(e => e.id === row.id) ? prev : [...prev, row])
      // Jump to the entry's day
      const [, , d] = row.date.split('-').map(Number)
      setSelectedDay(d)
    } else if (data?.kind === 'memory' && inViewDate(data.memory?.date)) {
      const row = data.memory
      setMemories(prev => prev.some(m => m.id === row.id) ? prev : [...prev, row])
      const [, , d] = row.date.split('-').map(Number)
      setSelectedDay(d)
    } else if (data?.kind === 'anniversary') {
      setAnnDate(data.anniversary_date)
    }
    setShowAddForm(false)
  }

  function handleMarkDoneSuccess(data) {
    if (data?.memory && inViewDate(data.memory.date)) {
      setMemories(prev => prev.some(m => m.id === data.memory.id) ? prev : [...prev, data.memory])
    }
    if (data?.calendarEntryId && data?.date) {
      setEntries(prev => {
        if (!inViewDate(data.date)) return prev.filter(e => e.id !== data.calendarEntryId)
        return prev.map(e => e.id === data.calendarEntryId ? { ...e, date: data.date } : e)
      })
    }
    setMarkDoneTarget(null)
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div style={{ color: V2.t1 }}>

      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.4px', color: V2.t1 }}>
            Calendar
          </h1>
          <div className="flex items-center" style={{ gap: 6 }}>
            <IconBtn onClick={() => setShowHelp(true)} ariaLabel="Calendar tips">
              <InfoIcon />
            </IconBtn>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center cursor-pointer"
              style={{
                height: 30,
                padding: '0 11px 0 9px',
                gap: 5,
                borderRadius: 9,
                background: V2.accent,
                color: 'white',
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              <PlusIcon />
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Month nav */}
      <div style={{ marginTop: 16 }} className="flex items-center justify-center">
        <div className="flex items-center" style={{ gap: 14 }}>
          <button
            onClick={prevMonth}
            aria-label="Previous month"
            className="flex items-center justify-center cursor-pointer"
            style={{ width: 32, height: 32, color: V2.t1, background: 'transparent', border: 'none' }}
          >
            <ChevLeft />
          </button>
          <span
            style={{
              fontSize: 16, fontWeight: 600, letterSpacing: '-0.2px',
              minWidth: 130, textAlign: 'center', color: V2.t1,
            }}
          >
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            aria-label="Next month"
            className="flex items-center justify-center cursor-pointer"
            style={{ width: 32, height: 32, color: V2.t1, background: 'transparent', border: 'none' }}
          >
            <ChevRight />
          </button>
        </div>
      </div>

      {/* Grid card */}
      <div
        style={{
          marginTop: 12,
          background: V2.surface,
          border: `1px solid ${V2.border}`,
          borderRadius: 20,
          padding: '14px 12px 12px',
        }}
      >
        {/* Weekday headers */}
        <div className="grid grid-cols-7" style={{ paddingBottom: 4 }}>
          {WEEKDAY_HEADERS.map(d => (
            <div
              key={d}
              style={{
                fontSize: 10, fontWeight: 600, color: V2.t3,
                textAlign: 'center', letterSpacing: '0.04em',
              }}
            >
              {d.toUpperCase()}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div
          key={`${viewYear}-${viewMonth}`}
          className={slideDir === 'left' ? 'animate-tab-left' : slideDir === 'right' ? 'animate-tab-right' : ''}
          onAnimationEnd={() => setSlideDir(null)}
        >
          <div className="grid grid-cols-7" style={{ rowGap: 6 }}>
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`b-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const items = dayItems[day] ?? []
              const isSelected = day === selectedDay
              const isToday    = day === todayDay
              const isAnn      = items.some(x => x.kind === 'anniversary')

              // Unique non-anniversary types for dots
              const typesSet = new Set(items.filter(x => x.kind !== 'anniversary').map(x => x.type))
              const dotTypes = ['memory', 'couple', 'personal'].filter(t => typesSet.has(t))

              const pillBg     = isSelected ? V2.accent : 'transparent'
              const pillColor  = isSelected ? 'white' : (isToday ? V2.accent : V2.t1)
              const pillWeight = (isSelected || isToday) ? 600 : 400
              const pillBorder = isToday && !isSelected ? `1.5px solid ${V2.accent}` : '1.5px solid transparent'

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className="flex flex-col items-center cursor-pointer select-none"
                  style={{ padding: '2px 0' }}
                >
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        width: 34, height: 34, borderRadius: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: pillBg,
                        color: pillColor,
                        fontSize: 13,
                        fontWeight: pillWeight,
                        border: pillBorder,
                        transition: 'background 150ms',
                      }}
                    >
                      {day}
                    </div>
                    {isAnn && (
                      <span
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          top: -2, right: -2,
                          fontSize: 9,
                          color: TYPE_META.anniversary.color,
                          textShadow: `0 0 2px ${V2.surface}, 0 0 2px ${V2.surface}`,
                          pointerEvents: 'none',
                        }}
                      >
                        ♥
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      minHeight: 5,
                      display: 'flex',
                      gap: 3,
                      justifyContent: 'center',
                    }}
                  >
                    {dotTypes.map(t => (
                      <span
                        key={t}
                        style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: TYPE_META[t].color,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Selected day detail */}
      <div style={{ marginTop: 22 }}>
        <div className="flex items-baseline justify-between" style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.2px', color: V2.t1 }}>
            {selectedLabel}
          </p>
          {visibleSelected.length > 0 && (
            <p style={{
              fontSize: 11, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: V2.t3,
            }}>
              {visibleSelected.length} {visibleSelected.length === 1 ? 'entry' : 'entries'}
            </p>
          )}
        </div>

        {/* Anniversary banner */}
        {hasAnniversary && annDate && (
          <div
            className="flex items-center gap-2.5 mb-2"
            style={{
              padding: '10px 14px',
              borderRadius: 14,
              background: `color-mix(in srgb, ${TYPE_META.anniversary.color}, transparent 90%)`,
              border: `1px solid color-mix(in srgb, ${TYPE_META.anniversary.color}, transparent 73%)`,
            }}
          >
            <span style={{ color: TYPE_META.anniversary.color, fontSize: 16 }}>♥</span>
            <p style={{ fontSize: 12.5, color: TYPE_META.anniversary.color, fontWeight: 600 }}>
              Anniversary
              {(() => {
                const yrs = viewYear - Number(annDate.split('-')[0])
                return yrs > 0 ? ` — Year ${yrs}` : ''
              })()}
            </p>
          </div>
        )}

        {visibleSelected.length === 0 ? (
          <EmptyDay
            isPast={selectedDateStr < todayStr}
            onAdd={() => setShowAddForm(true)}
          />
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {visibleSelected.map(item => (
              <EntryRow
                key={`${item.kind}-${item.id}`}
                item={item}
                partnerName={partnerName}
                currentUserId={currentUserId}
                onMarkDone={() => setMarkDoneTarget(item.raw)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sheets */}
      <CalendarHelpSheet isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {showAddForm && (
        <AddCalendarEntryForm
          date={selectedDateStr}
          coupleId={coupleId}
          partnerName={partnerName}
          onSuccess={handleAddSuccess}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {markDoneTarget && (
        <CalendarMarkDoneSheet
          entry={markDoneTarget}
          onSuccess={handleMarkDoneSuccess}
          onCancel={() => setMarkDoneTarget(null)}
        />
      )}
    </div>
  )
}

// ─── EmptyDay ──────────────────────────────────────────────────
function EmptyDay({ isPast, onAdd }) {
  return (
    <div
      style={{
        background: V2.surface,
        border: `1px dashed ${V2.border}`,
        borderRadius: 14,
        padding: '22px 16px',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: 13, color: V2.t3 }}>Nothing planned</p>
      <button
        onClick={onAdd}
        className="cursor-pointer inline-flex items-center justify-center"
        style={{
          marginTop: 10,
          height: 32,
          padding: '0 12px',
          borderRadius: 9,
          background: V2.accent,
          color: 'white',
          fontSize: 12.5,
          fontWeight: 600,
          border: 'none',
        }}
      >
        {isPast ? '+ Log memory' : '+ Add event'}
      </button>
    </div>
  )
}

// ─── EntryRow ──────────────────────────────────────────────────
function EntryRow({ item, partnerName, currentUserId, onMarkDone }) {
  const typeMeta = TYPE_META[item.type]
  const catFg    = CAT_FG[item.category] ?? CAT_FG.other
  const catLabel = CAT_LABEL[item.category] ?? item.category
  const canMarkDone = item.type === 'couple' || item.type === 'personal'

  return (
    <div
      className="flex items-stretch"
      style={{
        gap: 12,
        background: V2.surface,
        border: `1px solid ${V2.border}`,
        borderRadius: 14,
        padding: '12px 14px',
      }}
    >
      <div
        style={{
          width: 3,
          borderRadius: 3,
          background: typeMeta.color,
          alignSelf: 'stretch',
          flexShrink: 0,
        }}
      />
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 14, fontWeight: 600, color: V2.t1, lineHeight: 1.3 }}>
          {item.title}
        </p>
        <div className="flex items-center" style={{ gap: 6, marginTop: 6, fontSize: 11 }}>
          <span style={{ color: typeMeta.color, fontWeight: 600 }}>{typeMeta.label}</span>
          <span style={{ color: V2.t3, opacity: 0.5 }}>·</span>
          <span style={{ color: catFg, fontWeight: 600 }}>{catLabel}</span>
        </div>
        {item.note && (
          <p style={{ fontSize: 11, color: V2.t2, fontStyle: 'italic', marginTop: 6, lineHeight: 1.5 }}>
            “{item.note}”
          </p>
        )}
        {item.notes && (
          <p style={{ fontSize: 11, color: V2.t2, fontStyle: 'italic', marginTop: 6, lineHeight: 1.5 }}>
            {item.notes}
          </p>
        )}
      </div>
      {canMarkDone && (
        <button
          onClick={onMarkDone}
          className="cursor-pointer"
          style={{
            alignSelf: 'center',
            flexShrink: 0,
            height: 28,
            padding: '0 10px',
            background: 'transparent',
            border: `1px solid ${V2.border}`,
            borderRadius: 8,
            color: V2.t2,
            fontSize: 11.5,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Mark done
        </button>
      )}
    </div>
  )
}
