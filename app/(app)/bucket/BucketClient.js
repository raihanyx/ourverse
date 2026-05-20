'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { bulkDeleteBucketItems } from '@/app/actions/bucket'
import AddBucketForm from './AddBucketForm'
import MarkDoneSheet from './MarkDoneSheet'
import BucketHelpSheet from './BucketHelpSheet'
import ConfirmSheet from '@/app/components/ConfirmSheet'
import { useTheme } from '@/app/ThemeProvider'

// ── Category palette ─────────────────────────────────────────────────────────

const CAT_PALETTE = {
  restaurant: { lightBg: '#FCE3DC', lightFg: '#B83820', darkBg: 'var(--v2-accentDim)', darkFg: 'var(--v2-accent)', label: 'Restaurant' },
  travel:     { lightBg: '#DDE9F5', lightFg: '#2E6FA8', darkBg: 'var(--v2-blueBg)', darkFg: 'var(--v2-blue)', label: 'Travel'     },
  activity:   { lightBg: '#DCEDC4', lightFg: '#527C24', darkBg: '#162404', darkFg: 'var(--v2-green)', label: 'Activity'   },
  movie:      { lightBg: '#ECE0F8', lightFg: '#6F3DAB', darkBg: '#271A36', darkFg: '#C084FC', label: 'Movie'      },
  other:      { lightBg: '#EEEEEE', lightFg: '#555555', darkBg: '#222222', darkFg: '#9CA3AF', label: 'Other'      },
}
function catPair(key, isDark) {
  const c = CAT_PALETTE[key] ?? CAT_PALETTE.other
  return { bg: isDark ? c.darkBg : c.lightBg, fg: isDark ? c.darkFg : c.lightFg, label: c.label }
}

const FILTER_TABS = [
  { key: 'all',        label: 'All' },
  { key: 'restaurant', label: 'Food' },
  { key: 'travel',     label: 'Travel' },
  { key: 'activity',   label: 'Activity' },
  { key: 'movie',      label: 'Movie' },
  { key: 'other',      label: 'Other' },
]

function formatCalDate(dateString) {
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── WishCard ─────────────────────────────────────────────────────────────────

function AddedByLabel({ name, isMe, isDark }) {
  const color = isMe
    ? (isDark ? 'var(--v2-accent)' : '#D8513E')
    : 'var(--v2-pink)'
  return (
    <span
      className="inline-flex items-center gap-1 text-[10.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis min-w-0"
      style={{ color }}
    >
      <span className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: color }} />
      {name}
    </span>
  )
}

function WishCard({ item, calendarDate, onMarkDone, isSelecting, isSelected, onToggleSelect, isDark, currentUserId, currentUserName, partnerName }) {
  const addedByMe = item.added_by_user_id === currentUserId
  const addedByName = addedByMe ? (currentUserName || 'You') : (partnerName || 'Partner')
  const c = catPair(item.category, isDark)
  const accent = isDark ? 'var(--v2-accent)' : '#D8513E'
  const accentDim = isDark ? 'var(--v2-accentDim)' : '#FCE3DC'
  const innerBg = isDark
    ? (isSelected ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.22)')
    : (isSelected ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.4)')

  return (
    <div
      onClick={isSelecting ? () => onToggleSelect(item.id) : undefined}
      className={`rounded-2xl p-1 flex flex-col overflow-hidden transition-colors duration-150 ${isSelecting ? 'cursor-pointer' : ''}`}
      style={{
        background: isSelected ? accentDim : c.bg,
        border: `1px solid ${isSelected ? `${accent}88` : `${c.fg}22`}`,
      }}
    >
      {/* Header strip */}
      <div className="flex items-center gap-1.5 px-2.5 py-2">
        {isSelecting ? (
          <div
            className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              border: `1.5px solid ${isSelected ? accent : `${c.fg}88`}`,
              background: isSelected ? accent : 'transparent',
            }}
          >
            {isSelected && (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        ) : (
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: c.fg }}
          />
        )}
        <span
          className="text-[9.5px] font-bold uppercase tracking-[0.08em] flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
          style={{ color: c.fg }}
        >
          {c.label}
        </span>
        {calendarDate && (
          <span
            className="text-[10px] font-semibold inline-flex items-center gap-1 px-[7px] py-[2px] rounded-md whitespace-nowrap flex-shrink-0"
            style={{ background: `${c.fg}1F`, color: c.fg }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {formatCalDate(calendarDate)}
          </span>
        )}
      </div>

      {/* Inset content panel */}
      <div
        className="rounded-xl px-3 pt-[11px] pb-3 flex flex-col gap-2.5"
        style={{ background: innerBg, minHeight: 78 }}
      >
        <p className="text-[14px] font-semibold leading-[1.3] flex-1 text-[#2A1810] dark:text-[#FAF3F1]">
          {item.name}
        </p>
        {!isSelecting && (
          <div className="flex items-center justify-between gap-2">
            <AddedByLabel name={addedByName} isMe={addedByMe} isDark={isDark} />
            {calendarDate ? (
              <span
                className="inline-flex items-center gap-1 text-[10px] italic font-semibold flex-shrink-0"
                style={{ color: c.fg, opacity: 0.7 }}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                On calendar
              </span>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); onMarkDone(item) }}
                className="h-6 px-2.5 rounded-[7px] bg-transparent text-[10.5px] font-semibold cursor-pointer flex-shrink-0"
                style={{ border: `1px solid ${c.fg}55`, color: c.fg }}
              >
                Done
              </button>
            )}
          </div>
        )}
        {isSelecting && (
          <AddedByLabel name={addedByName} isMe={addedByMe} isDark={isDark} />
        )}
      </div>
    </div>
  )
}

// ── Small memory card (horizontal strip) ─────────────────────────────────────

function MiniMemoryCard({ memory, isDark, currentUserId, currentUserName, partnerName }) {
  const c = catPair(memory.category, isDark)
  const hasAuthor = !!memory.added_by_user_id
  const isMe = hasAuthor && memory.added_by_user_id === currentUserId
  const authorName = hasAuthor ? (isMe ? (currentUserName || 'You') : (partnerName || 'Partner')) : null
  return (
    <div
      className="w-[130px] flex-shrink-0 rounded-[14px] px-3 pt-2.5 pb-3 flex flex-col gap-2"
      style={{ background: c.bg, border: `1px solid ${c.fg}22` }}
    >
      <span className="text-[9px] font-bold uppercase tracking-[0.08em]" style={{ color: c.fg }}>
        {c.label}
      </span>
      <p className="text-[12.5px] font-semibold leading-[1.3] text-[#2A1810] dark:text-[#FAF3F1]">
        {memory.name}
      </p>
      {authorName && (
        <AddedByLabel name={authorName} isMe={isMe} isDark={isDark} />
      )}
    </div>
  )
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function BucketClient({
  initialItems,
  initialCalendarDates,
  initialRecentMemories,
  currentUserId,
  currentUserName,
  partnerId,
  partnerName,
  coupleId,
  memoriesCount,
}) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [items, setItems] = useState(initialItems)
  const [calendarDates, setCalendarDates] = useState(initialCalendarDates ?? {})
  const [recentMemories, setRecentMemories] = useState(initialRecentMemories ?? [])
  const [localMemoriesCount, setLocalMemoriesCount] = useState(memoriesCount)
  const [activeFilter, setActiveFilter] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [isClosingAdd, setIsClosingAdd] = useState(false)
  const [showDoneSheet, setShowDoneSheet] = useState(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [, startDeleteTransition] = useTransition()
  const [showHelp, setShowHelp] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [bulkError, setBulkError] = useState(null)
  const [picked, setPicked] = useState(null)
  const [rolling, setRolling] = useState(false)
  const rollTimerRef = useRef(null)

  // Refetch helpers
  function refetchMemories() {
    const supabase = createClient()
    Promise.all([
      supabase
        .from('memories')
        .select('id, name, category, date, added_by_user_id')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('memories')
        .select('id', { count: 'exact', head: true })
        .eq('couple_id', coupleId),
    ]).then(([{ data }, { count }]) => {
      if (data) setRecentMemories(data)
      if (count !== null) setLocalMemoriesCount(count)
    })
  }

  function refetchCalendarDates() {
    createClient()
      .from('calendar_entries')
      .select('bucket_item_id, date')
      .eq('couple_id', coupleId)
      .not('bucket_item_id', 'is', null)
      .then(({ data }) => {
        if (data) setCalendarDates(Object.fromEntries(data.map(e => [e.bucket_item_id, e.date])))
      })
  }

  useEffect(() => {
    refetchMemories()
    refetchCalendarDates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId])

  // Realtime
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('bucket-' + coupleId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bucket_items' }, (payload) => {
        const row = payload.new ?? payload.old
        if (row?.couple_id !== coupleId) return
        if (payload.eventType === 'INSERT') {
          setItems(prev => prev.some(i => i.id === payload.new.id) ? prev : [payload.new, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setItems(prev => prev.map(i => i.id === payload.new.id ? payload.new : i))
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(i => i.id !== payload.old.id))
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_entries' }, (payload) => {
        const row = payload.new ?? payload.old
        if (row?.couple_id !== coupleId) return
        if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && payload.new.bucket_item_id) {
          setCalendarDates(prev => ({ ...prev, [payload.new.bucket_item_id]: payload.new.date }))
        } else if (payload.eventType === 'DELETE' && payload.old.bucket_item_id) {
          setCalendarDates(prev => { const next = { ...prev }; delete next[payload.old.bucket_item_id]; return next })
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [coupleId])

  // Cleanup pick interval on unmount
  useEffect(() => () => { if (rollTimerRef.current) clearInterval(rollTimerRef.current) }, [])

  // Derived
  const undoneItems = items.filter(i => !i.is_done)
  const doneItems = items.filter(i => i.is_done)
  const filteredWishlist = activeFilter === 'all'
    ? undoneItems
    : undoneItems.filter(i => i.category === activeFilter)

  // Handlers
  function pickRandom() {
    const pool = filteredWishlist
    if (pool.length === 0) return
    setRolling(true)
    let n = 0
    const total = 8
    if (rollTimerRef.current) clearInterval(rollTimerRef.current)
    rollTimerRef.current = setInterval(() => {
      const i = pool[Math.floor(Math.random() * pool.length)]
      setPicked(i)
      n += 1
      if (n >= total) {
        clearInterval(rollTimerRef.current)
        rollTimerRef.current = null
        setRolling(false)
      }
    }, 65)
  }

  function handleCloseAdd() {
    setIsClosingAdd(true)
    setTimeout(() => { setShowAddForm(false); setIsClosingAdd(false) }, 220)
  }

  function handleAddSuccess(row) {
    if (row) setItems(prev => prev.some(i => i.id === row.id) ? prev : [row, ...prev])
    handleCloseAdd()
  }

  function handleMarkDoneSuccess(memoryRow) {
    if (showDoneSheet) {
      setItems(prev => prev.map(i => i.id === showDoneSheet.id ? { ...i, is_done: true } : i))
      setLocalMemoriesCount(prev => prev + 1)
      const memCard = memoryRow
        ? { id: memoryRow.id, name: memoryRow.name, category: memoryRow.category, date: memoryRow.date, added_by_user_id: memoryRow.added_by_user_id }
        : { id: 'opt-' + showDoneSheet.id, name: showDoneSheet.name, category: showDoneSheet.category, date: null, added_by_user_id: currentUserId }
      setRecentMemories(prev => [memCard, ...prev.filter(m => m.id !== memCard.id)].slice(0, 8))
    }
    setShowDoneSheet(null)
    setPicked(null)
  }

  function handleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function exitSelectMode() {
    setIsSelecting(false)
    setSelectedIds(new Set())
  }

  function handleConfirmDelete() {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    setBulkError(null)
    const removed = items.filter(i => ids.includes(i.id))
    setShowDeleteConfirm(false)
    setItems(prev => prev.filter(i => !ids.includes(i.id)))
    exitSelectMode()
    startDeleteTransition(async () => {
      const result = await bulkDeleteBucketItems(ids)
      if (result?.error) {
        setItems(prev => [...removed, ...prev])
        setBulkError('Something went wrong. Please try again.')
      }
    })
  }

  const accent = isDark ? 'var(--v2-accent)' : '#D8513E'
  const accentDim = isDark ? 'var(--v2-accentDim)' : '#FCE3DC'

  return (
    <>
      <div>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-[24px] font-bold leading-tight tracking-[-0.4px] text-[#2A1810] dark:text-[#FAF3F1]">
              Bucket List
            </h1>
            <p className="text-[13px] mt-[3px] text-[#B19A8B] dark:text-[#7A5848]">
              {undoneItems.length} left · {localMemoriesCount} done
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-shrink-0">
            <IconBtn
              onClick={() => setShowHelp(true)}
              ariaLabel="Bucket list tips"
              active={false}
              isDark={isDark}
              disabled={isSelecting || showAddForm}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </IconBtn>
            <IconBtn
              onClick={() => isSelecting ? exitSelectMode() : setIsSelecting(true)}
              ariaLabel={isSelecting ? 'Exit select mode' : 'Select items'}
              active={isSelecting}
              isDark={isDark}
              disabled={showHelp || showAddForm}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </IconBtn>
            <button
              onClick={() => setShowAddForm(true)}
              disabled={isSelecting || showHelp}
              className="flex items-center gap-[5px] h-[30px] pl-[9px] pr-[11px] rounded-[9px] bg-[#D8513E] dark:bg-[#E8675A] text-white text-[12.5px] font-semibold cursor-pointer flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add
            </button>
          </div>
        </div>

        {bulkError && (
          <div className="text-sm text-[#D8513E] dark:text-[#F0907F] bg-[#FCE3DC] dark:bg-[#3D1E18] border border-[#ECDFD2] dark:border-[#3A2418] px-4 py-3 rounded-xl mb-4">
            {bulkError}
          </div>
        )}

        {/* ── Filter pills ───────────────────────────────────────────── */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
          {FILTER_TABS.map(f => {
            const active = activeFilter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className="flex-shrink-0 h-[30px] px-3.5 rounded-full text-[12px] font-medium border cursor-pointer transition-colors"
                style={{
                  background: active ? accent : (isDark ? 'var(--v2-surface)' : '#F8F2EB'),
                  color: active ? 'white' : (isDark ? 'var(--v2-t2)' : '#7A5C4E'),
                  borderColor: active ? accent : (isDark ? 'var(--v2-border)' : '#ECDFD2'),
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        {/* ── Memories link card ─────────────────────────────────────── */}
        <Link href="/memories" className="block mb-5">
          <div className="rounded-[14px] border border-[#ECDFD2] dark:border-[#3A2418] bg-white dark:bg-[#221714] px-3.5 py-3 flex items-center gap-3 cursor-pointer transition-colors hover:border-[#D8513E] dark:hover:border-[#E8675A]">
            <div
              className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center flex-shrink-0"
              style={{ background: accentDim }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={accent} aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-semibold text-[#2A1810] dark:text-[#FAF3F1]">
                {localMemoriesCount} {localMemoriesCount === 1 ? 'Memory' : 'Memories'}
              </p>
              <p className="text-[11.5px] mt-0.5 text-[#B19A8B] dark:text-[#7A5848]">
                Things you’ve done together
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#B19A8B] dark:text-[#7A5848] flex-shrink-0" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>

        {/* ── Section header + Pick for us ──────────────────────────── */}
        <div className="flex items-center gap-2.5 mb-3.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#B19A8B] dark:text-[#7A5848] flex-shrink-0">
            Bucket list · {filteredWishlist.length}
          </span>
          <div className="flex-1 h-px bg-[#ECDFD2] dark:bg-[#3A2418]" />
          <button
            onClick={pickRandom}
            disabled={filteredWishlist.length === 0 || rolling}
            className="flex items-center gap-[5px] h-[26px] px-2.5 rounded-[9px] text-[11.5px] font-semibold flex-shrink-0 cursor-pointer transition-opacity"
            style={{
              border: `1px solid ${accent}66`,
              background: accentDim,
              color: accent,
              opacity: filteredWishlist.length === 0 ? 0.5 : 1,
              cursor: filteredWishlist.length === 0 ? 'default' : 'pointer',
            }}
          >
            <span
              className="text-[12px] inline-block transition-transform duration-[250ms]"
              style={{ transform: rolling ? 'rotate(180deg)' : 'rotate(0)' }}
            >🎲</span>
            Pick for us
          </button>
        </div>

        {/* ── Bucket grid ───────────────────────────────────────────── */}
        {filteredWishlist.length === 0 ? (
          <div className="py-[30px] text-center">
            <p className="text-[14px] text-[#B19A8B] dark:text-[#7A5848]">Nothing in this category yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filteredWishlist.map(item => (
              <WishCard
                key={item.id}
                item={item}
                calendarDate={calendarDates[item.id] ?? null}
                onMarkDone={setShowDoneSheet}
                isSelecting={isSelecting}
                isSelected={selectedIds.has(item.id)}
                onToggleSelect={handleSelect}
                isDark={isDark}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                partnerName={partnerName}
              />
            ))}
          </div>
        )}

        {/* ── Memories strip ─────────────────────────────────────────── */}
        {localMemoriesCount > 0 && recentMemories.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2.5 mb-3.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#B19A8B] dark:text-[#7A5848] flex-shrink-0">
                Memories · {localMemoriesCount}
              </span>
              <div className="flex-1 h-px bg-[#ECDFD2] dark:bg-[#3A2418]" />
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
              {recentMemories.map(m => (
                <MiniMemoryCard
                  key={m.id}
                  memory={m}
                  isDark={isDark}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                  partnerName={partnerName}
                />
              ))}
            </div>
          </div>
        )}

        <div className="h-4" />
      </div>

      {/* ── Floating bulk-action bar ───────────────────────────────── */}
      {isSelecting && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div className="max-w-lg mx-auto" style={{ padding: '0 12px 80px' }}>
            {selectedIds.size > 0 ? (
              <div
                style={{
                  background: 'var(--v2-cardHigh)', border: '1px solid var(--v2-border)',
                  borderRadius: 16, padding: '8px 8px 8px 14px',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.55)',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--v2-t1)', flex: 1 }}>
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    height: 32, padding: '0 14px', borderRadius: 9, border: 'none',
                    background: 'var(--v2-accent)', color: 'white',
                    fontSize: 12.5, fontWeight: 600,
                    fontFamily: 'inherit', cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            ) : (
              <div
                style={{
                  background: 'var(--v2-cardHigh)', border: '1px solid var(--v2-border)',
                  borderRadius: 16, padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.55)',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--v2-t2)', flex: 1 }}>Tap items to select</span>
                <button
                  onClick={exitSelectMode}
                  style={{
                    height: 28, padding: '0 12px', borderRadius: 8,
                    border: '1px solid var(--v2-border)', background: 'transparent',
                    color: 'var(--v2-t2)', fontSize: 12, fontWeight: 600,
                    fontFamily: 'inherit', cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ── Add form ─────────────────────────────────────────────────── */}
      {showAddForm && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end">
          <div
            className={`absolute inset-0 ${isClosingAdd ? 'animate-fade-out' : 'animate-fade-in'}`}
            style={{ background: isDark ? 'rgba(var(--v2-overlayBase), 0.7)' : 'rgba(var(--v2-overlayBase), 0.55)' }}
            onClick={handleCloseAdd}
          />
          <div className={`relative bg-white dark:bg-[#2A1C18] rounded-t-[24px] px-5 pt-2.5 pb-[26px] max-h-[92vh] overflow-y-auto ${isClosingAdd ? 'animate-slide-down' : 'animate-slide-up'}`}>
            <div className="w-9 h-[3px] rounded-full bg-[#ECDFD2] dark:bg-[#3A2418] mx-auto mb-[14px]" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-semibold text-[#2A1810] dark:text-[#FAF3F1]">Add to bucket list</h2>
              <button onClick={handleCloseAdd} className="p-1 text-[#B19A8B] dark:text-[#7A5848] hover:text-[#2A1810] dark:hover:text-[#FAF3F1] cursor-pointer" aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <AddBucketForm
              coupleId={coupleId}
              currentUserId={currentUserId}
              onSuccess={handleAddSuccess}
              onCancel={handleCloseAdd}
            />
          </div>
        </div>
      )}

      {/* ── Mark done sheet ──────────────────────────────────────────── */}
      {showDoneSheet && typeof document !== 'undefined' && createPortal(
        <MarkDoneSheet
          item={showDoneSheet}
          coupleId={coupleId}
          calendarDate={calendarDates[showDoneSheet.id] ?? null}
          onSuccess={handleMarkDoneSuccess}
          onCancel={() => setShowDoneSheet(null)}
        />,
        document.body
      )}

      {/* ── Help sheet ───────────────────────────────────────────────── */}
      <BucketHelpSheet isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* ── Delete confirm ───────────────────────────────────────────── */}
      {showDeleteConfirm && typeof document !== 'undefined' && createPortal(
        <ConfirmSheet
          message={`Delete ${selectedIds.size} item${selectedIds.size === 1 ? '' : 's'}? This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />,
        document.body
      )}

      {/* ── Pick-for-us modal ─────────────────────────────────────── */}
      {picked && typeof document !== 'undefined' && createPortal(
        <PickModal
          item={picked}
          rolling={rolling}
          onPickAgain={pickRandom}
          onClose={() => { if (!rolling) setPicked(null) }}
          isDark={isDark}
        />,
        document.body
      )}
    </>
  )
}

// ── IconBtn ──────────────────────────────────────────────────────────────────

function IconBtn({ onClick, active, ariaLabel, isDark, disabled, children }) {
  const accent = isDark ? 'var(--v2-accent)' : '#D8513E'
  const accentDim = isDark ? 'var(--v2-accentDim)' : '#FCE3DC'
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center transition-all flex-shrink-0"
      style={{
        border: `1px solid ${active ? `${accent}66` : (isDark ? 'var(--v2-border)' : '#ECDFD2')}`,
        background: active ? accentDim : (isDark ? 'var(--v2-surface)' : '#F8F2EB'),
        color: active ? accent : (isDark ? 'var(--v2-t2)' : '#7A5C4E'),
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

// ── PickModal ────────────────────────────────────────────────────────────────

function PickModal({ item, rolling, onPickAgain, onClose, isDark }) {
  const c = catPair(item.category, isDark)
  const accent = isDark ? 'var(--v2-accent)' : '#D8513E'
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-5"
      style={{ background: 'rgba(var(--v2-overlayBase), 0.72)', transition: 'opacity 200ms', opacity: rolling ? 0.95 : 1 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-[300px] rounded-[22px] px-5 pt-5 pb-4 transition-transform duration-[80ms]"
        style={{
          background: isDark ? 'var(--v2-card)' : '#FFFFFF',
          border: `1px solid ${isDark ? 'var(--v2-border)' : '#ECDFD2'}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          transform: rolling ? 'rotate(-1deg) scale(0.98)' : 'rotate(0) scale(1)',
        }}
      >
        <p
          className="text-[11px] font-bold uppercase tracking-[0.1em] mb-3 text-center text-[#B19A8B] dark:text-[#7A5848]"
        >
          {rolling ? 'Rolling…' : 'Tonight’s pick 🎲'}
        </p>
        <div
          className="rounded-[14px] px-3.5 pt-3.5 pb-4 mb-3.5"
          style={{ background: c.bg, border: `1px solid ${c.fg}33` }}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: c.fg }}>
            {c.label}
          </span>
          <p className="text-[18px] font-bold leading-[1.25] mt-1.5 tracking-[-0.2px] text-[#2A1810] dark:text-[#FAF3F1]">
            {item.name}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onPickAgain}
            disabled={rolling}
            className="flex-1 h-10 rounded-[11px] bg-transparent text-[13px] font-semibold cursor-pointer transition-opacity"
            style={{
              border: `1px solid ${isDark ? 'var(--v2-border)' : '#ECDFD2'}`,
              color: isDark ? 'var(--v2-t1)' : '#2A1810',
              opacity: rolling ? 0.6 : 1,
            }}
          >
            Pick again
          </button>
          <button
            onClick={onClose}
            disabled={rolling}
            className="flex-1 h-10 rounded-[11px] text-white text-[13px] font-semibold cursor-pointer transition-opacity"
            style={{ background: accent, opacity: rolling ? 0.6 : 1 }}
          >
            Let’s do it
          </button>
        </div>
      </div>
    </div>
  )
}
