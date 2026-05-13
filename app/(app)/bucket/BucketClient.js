'use client'

import { useState, useEffect, useTransition } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { bulkMarkDone, bulkDeleteBucketItems } from '@/app/actions/bucket'
import { todayISO } from '@/lib/currency'
import AddBucketForm from './AddBucketForm'
import MarkDoneSheet from './MarkDoneSheet'
import BucketHelpSheet from './BucketHelpSheet'
import ConfirmSheet from '@/app/components/ConfirmSheet'
import { BUCKET_CATEGORY_LABELS as CATEGORY_LABELS } from '@/lib/constants'

// ── Category visual maps ────────────────────────────────────────────────────

const CAT_CARD_BG = {
  restaurant: 'bg-[#FDECEA] dark:bg-[#3D1E18]',
  travel:     'bg-[#DBEAFE] dark:bg-[#1E2A3A]',
  activity:   'bg-[#EAF3DE] dark:bg-[#173404]',
  movie:      'bg-[#EDE9FE] dark:bg-[#2D1F3A]',
  other:      'bg-[#F3F4F6] dark:bg-[#252525]',
}

const CAT_FG_TEXT = {
  restaurant: 'text-[#C2493A] dark:text-[#F0907F]',
  travel:     'text-[#1E40AF] dark:text-[#7AB0D8]',
  activity:   'text-[#3B6D11] dark:text-[#97C459]',
  movie:      'text-[#5B21B6] dark:text-[#C084FC]',
  other:      'text-[#374151] dark:text-[#9CA3AF]',
}

const CAT_DONE_BTN_BORDER = {
  restaurant: 'border-[rgba(194,73,58,0.33)] dark:border-[rgba(240,144,127,0.33)]',
  travel:     'border-[rgba(30,64,175,0.33)] dark:border-[rgba(122,176,216,0.33)]',
  activity:   'border-[rgba(59,109,17,0.33)] dark:border-[rgba(151,196,89,0.33)]',
  movie:      'border-[rgba(91,33,182,0.33)] dark:border-[rgba(192,132,252,0.33)]',
  other:      'border-[rgba(55,65,81,0.33)] dark:border-[rgba(156,163,175,0.33)]',
}

const FILTER_TABS = [
  { key: 'all',        label: 'All' },
  { key: 'restaurant', label: 'Food' },
  { key: 'travel',     label: 'Travel' },
  { key: 'activity',   label: 'Activity' },
  { key: 'movie',      label: 'Movie' },
  { key: 'other',      label: 'Other' },
]

const PICKER_CATEGORIES = [
  { key: 'all',        label: 'All' },
  { key: 'restaurant', label: 'Food' },
  { key: 'travel',     label: 'Travel' },
  { key: 'activity',   label: 'Activity' },
  { key: 'movie',      label: 'Movie' },
  { key: 'other',      label: 'Other' },
]

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatCalDate(dateString) {
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Sub-components ───────────────────────────────────────────────────────────

function WishCard({ item, calendarDate, onMarkDone, isSelecting, isSelected, onToggleSelect }) {
  const cardBg = isSelected
    ? 'bg-[#FDECEA] dark:bg-[#3D1E18]'
    : (CAT_CARD_BG[item.category] ?? CAT_CARD_BG.other)
  const cardBorder = isSelected
    ? 'border-[rgba(194,73,58,0.5)] dark:border-[rgba(232,103,90,0.5)]'
    : 'border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.07)]'
  const fgText = CAT_FG_TEXT[item.category] ?? CAT_FG_TEXT.other
  const doneBtnBorder = CAT_DONE_BTN_BORDER[item.category] ?? CAT_DONE_BTN_BORDER.other

  return (
    <div
      onClick={isSelecting ? () => onToggleSelect(item.id) : undefined}
      className={`relative rounded-[16px] p-[11px_13px_12px] flex flex-col gap-2.5 border transition-colors duration-150 ${cardBg} ${cardBorder} ${isSelecting ? 'cursor-pointer' : ''}`}
    >
      {/* Select checkbox */}
      {isSelecting && (
        <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center z-10 transition-all
          ${isSelected
            ? 'bg-[#C2493A] dark:bg-[#E8675A] border-[#C2493A] dark:border-[#E8675A]'
            : 'bg-[rgba(0,0,0,0.1)] dark:bg-[rgba(0,0,0,0.3)] border-[rgba(0,0,0,0.2)] dark:border-[rgba(255,255,255,0.25)]'
          }`}
        >
          {isSelected && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      )}

      {/* Top: category label + date badge */}
      <div className={`flex items-center justify-between gap-1 ${isSelecting ? 'pr-5' : ''}`}>
        <span className={`text-[9.5px] font-bold uppercase tracking-[0.08em] leading-none ${fgText}`}>
          {CATEGORY_LABELS[item.category] ?? item.category}
        </span>
        {calendarDate && (
          <span className={`text-[10px] font-semibold inline-flex items-center gap-[3px] px-[6px] py-[2px] rounded-[5px] bg-[rgba(0,0,0,0.06)] dark:bg-[rgba(255,255,255,0.09)] ${fgText}`}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {formatCalDate(calendarDate)}
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-[14px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] leading-[1.3] flex-1">
        {item.name}
      </p>

      {/* Done button */}
      {!isSelecting && (
        <button
          onClick={() => onMarkDone(item)}
          className={`self-start h-6 px-2.5 rounded-[7px] border text-[10.5px] font-semibold cursor-pointer bg-transparent opacity-70 hover:opacity-100 transition-opacity ${fgText} ${doneBtnBorder}`}
        >
          Done
        </button>
      )}
    </div>
  )
}

function MemoryCard({ memory }) {
  const cardBg = CAT_CARD_BG[memory.category] ?? CAT_CARD_BG.other
  const fgText = CAT_FG_TEXT[memory.category] ?? CAT_FG_TEXT.other

  return (
    <div className={`w-[130px] flex-shrink-0 rounded-[14px] p-[10px_12px_12px] border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.07)] flex flex-col gap-2 ${cardBg}`}>
      <span className={`text-[9px] font-bold uppercase tracking-[0.08em] leading-none ${fgText}`}>
        {CATEGORY_LABELS[memory.category] ?? memory.category}
      </span>
      <p className="text-[12.5px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] leading-[1.3]">
        {memory.name}
      </p>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

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
  const [items, setItems] = useState(initialItems)
  const [calendarDates, setCalendarDates] = useState(initialCalendarDates ?? {})
  const [recentMemories, setRecentMemories] = useState(initialRecentMemories ?? [])
  const [localMemoriesCount, setLocalMemoriesCount] = useState(memoriesCount)
  const [activeFilter, setActiveFilter] = useState('all')
  const [randomCategory, setRandomCategory] = useState('all')
  const [pickedItem, setPickedItem] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isClosingAdd, setIsClosingAdd] = useState(false)
  const [showDoneSheet, setShowDoneSheet] = useState(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [showHelp, setShowHelp] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [bulkDoneIds, setBulkDoneIds] = useState(null)
  const [bulkError, setBulkError] = useState(null)

  // ── Refetch helpers ─────────────────────────────────────────────────────────

  function refetchItems() {
    createClient()
      .from('bucket_items')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setItems(data) })
  }

  function refetchMemories() {
    const supabase = createClient()
    Promise.all([
      supabase
        .from('memories')
        .select('id, name, category, date')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('memories')
        .select('id', { count: 'exact', head: true })
        .eq('couple_id', coupleId),
    ]).then(([{ data }, { count }]) => {
      if (data) setRecentMemories(data)
      if (count !== null) setLocalMemoriesCount(count)
    })
  }

  // Fetch fresh memories on mount (server prop may be stale if navigating back)
  useEffect(() => {
    refetchMemories()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId])

  // Realtime subscriptions
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
        if (payload.eventType === 'INSERT' && payload.new.bucket_item_id) {
          setCalendarDates(prev => ({ ...prev, [payload.new.bucket_item_id]: payload.new.date }))
        } else if (payload.eventType === 'UPDATE' && payload.new.bucket_item_id) {
          setCalendarDates(prev => ({ ...prev, [payload.new.bucket_item_id]: payload.new.date }))
        } else if (payload.eventType === 'DELETE' && payload.old.bucket_item_id) {
          setCalendarDates(prev => { const next = { ...prev }; delete next[payload.old.bucket_item_id]; return next })
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [coupleId])

  // ── Derived ────────────────────────────────────────────────────────────────

  function getUserName(userId) {
    if (userId === currentUserId) return currentUserName
    if (userId === partnerId) return partnerName ?? 'Partner'
    return 'Unknown'
  }

  const filteredItems = activeFilter === 'all'
    ? items.filter(i => !i.is_done)
    : items.filter(i => !i.is_done && i.category === activeFilter)

  const undoneItems = items.filter(i => !i.is_done)

  function getPickerPool() {
    const undone = items.filter(i => !i.is_done && !calendarDates[i.id])
    return randomCategory === 'all' ? undone : undone.filter(i => i.category === randomCategory)
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handlePick() {
    const pool = getPickerPool()
    setPickedItem(pool[Math.floor(Math.random() * pool.length)])
  }

  function handlePickAgain() {
    const pool = getPickerPool()
    const others = pool.filter(i => i.id !== pickedItem?.id)
    const source = others.length > 0 ? others : pool
    setPickedItem(source[Math.floor(Math.random() * source.length)])
  }

  function handleCloseAdd() {
    setIsClosingAdd(true)
    setTimeout(() => { setShowAddForm(false); setIsClosingAdd(false) }, 220)
  }

  function handleAddSuccess() {
    handleCloseAdd()
    refetchItems()
  }

  function handleMarkDoneSuccess() {
    if (showDoneSheet) {
      // Optimistic: mark item done in list, prepend to memories strip
      setItems(prev => prev.map(i => i.id === showDoneSheet.id ? { ...i, is_done: true } : i))
      setLocalMemoriesCount(prev => prev + 1)
      setRecentMemories(prev => [
        { id: 'opt-' + showDoneSheet.id, name: showDoneSheet.name, category: showDoneSheet.category, date: null },
        ...prev,
      ].slice(0, 3))
      // Sync real data from DB (server action has already completed at this point)
      refetchMemories()
    }
    setShowDoneSheet(null)
    setPickedItem(null)
  }

  function handleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleCancelSelecting() {
    setIsSelecting(false)
    setSelectedIds(new Set())
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return
    setShowDeleteConfirm(true)
  }

  function handleConfirmDelete() {
    const ids = filteredItems.filter(i => selectedIds.has(i.id)).map(i => i.id)
    if (ids.length === 0) return
    setBulkError(null)
    const removed = items.filter(i => ids.includes(i.id))
    setShowDeleteConfirm(false)
    setItems(prev => prev.filter(i => !ids.includes(i.id)))
    setIsSelecting(false)
    setSelectedIds(new Set())
    setPickedItem(null)
    startDeleteTransition(async () => {
      const result = await bulkDeleteBucketItems(ids)
      if (result?.error) {
        setItems(prev => [...removed, ...prev])
        setBulkError('Something went wrong. Please try again.')
      }
    })
  }

  function handleBulkMarkDone() {
    const ids = filteredItems.filter(i => selectedIds.has(i.id)).map(i => i.id)
    if (ids.length === 0) return
    setBulkDoneIds(ids)
  }

  function handleConfirmBulkDone(date) {
    const ids = bulkDoneIds
    setBulkError(null)
    setBulkDoneIds(null)
    setItems(prev => prev.map(i => ids.includes(i.id) ? { ...i, is_done: true } : i))
    setLocalMemoriesCount(prev => prev + ids.length)
    const newMemories = ids
      .map(id => items.find(i => i.id === id))
      .filter(Boolean)
      .map(item => ({ id: 'opt-' + item.id, name: item.name, category: item.category, date }))
    setRecentMemories(prev => [...newMemories, ...prev].slice(0, 3))
    setIsSelecting(false)
    setSelectedIds(new Set())
    setPickedItem(null)
    startTransition(async () => {
      const result = await bulkMarkDone(ids, date)
      if (result?.error) {
        setItems(prev => prev.map(i => ids.includes(i.id) ? { ...i, is_done: false } : i))
        setLocalMemoriesCount(prev => prev - ids.length)
        setBulkError('Something went wrong. Please try again.')
      } else {
        refetchMemories()
      }
    })
  }

  const pickerPool = getPickerPool()
  const eligibleSelectedCount = filteredItems.filter(i => selectedIds.has(i.id)).length

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between pb-5">
          <div>
            <h1 className="text-[22px] font-bold text-[#1C1210] dark:text-[#FAF3F1] tracking-[-0.4px]">
              Bucket List
            </h1>
            <p className="text-[12px] text-[#C4A89E] dark:text-[#7A5848] mt-0.5">
              {undoneItems.length} left · {localMemoriesCount} done
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isSelecting ? (
              <button
                onClick={handleCancelSelecting}
                className="h-[30px] px-3.5 rounded-[9px] border border-[#EDE0DC] dark:border-[#3A2418] text-[12px] font-medium text-[#A07060] dark:text-[#C89080] cursor-pointer"
              >
                Cancel
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowHelp(true)}
                  className="w-[30px] h-[30px] rounded-[9px] border border-[#EDE0DC] dark:border-[#3A2418] bg-[#FDF7F6] dark:bg-[#221714] flex items-center justify-center text-[#A07060] dark:text-[#C89080] cursor-pointer"
                  aria-label="Bucket list tips"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </button>
                {undoneItems.length > 0 && (
                  <button
                    onClick={() => { setIsSelecting(true); setSelectedIds(new Set()) }}
                    className="w-[30px] h-[30px] rounded-[9px] border border-[#EDE0DC] dark:border-[#3A2418] bg-[#FDF7F6] dark:bg-[#221714] flex items-center justify-center text-[#A07060] dark:text-[#C89080] cursor-pointer"
                    aria-label="Select items"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-[5px] h-[30px] px-[11px] pl-[9px] bg-[#C2493A] dark:bg-[#E8675A] text-white rounded-[9px] text-[12.5px] font-semibold cursor-pointer"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add
                </button>
              </>
            )}
          </div>
        </div>

        {bulkError && (
          <div className="text-sm text-[#C2493A] dark:text-[#F0907F] bg-[#FDECEA] dark:bg-[#3D1E18] border border-[#EDE0DC] dark:border-[#3D2820] px-4 py-3 rounded-xl mb-4">
            {bulkError}
          </div>
        )}

        {/* ── Filter pills ───────────────────────────────────────────── */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5" style={{ scrollbarWidth: 'none' }}>
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveFilter(tab.key); setSelectedIds(new Set()) }}
              className={`flex-shrink-0 h-[30px] px-3.5 rounded-full text-[12px] font-medium border transition-colors cursor-pointer
                ${activeFilter === tab.key
                  ? 'bg-[#C2493A] dark:bg-[#E8675A] text-white border-[#C2493A] dark:border-[#E8675A]'
                  : 'border-[#EDE0DC] dark:border-[#3A2418] text-[#A07060] dark:text-[#C89080] bg-[#FDF7F6] dark:bg-[#221714]'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Memories link button ───────────────────────────────────── */}
        <Link href="/memories" className="block mb-5">
          <div className="rounded-[14px] border border-[#EDE0DC] dark:border-[#3A2418] bg-white dark:bg-[#221714] px-[14px] py-3 flex items-center gap-3 hover:border-[#C2493A] dark:hover:border-[#E8675A] transition-colors">
            <div className="w-[34px] h-[34px] rounded-[10px] bg-[#FDECEA] dark:bg-[#3D1E18] flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#C2493A" className="dark:fill-[#E8675A]" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[13.5px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">
                {localMemoriesCount} {localMemoriesCount === 1 ? 'Memory' : 'Memories'}
              </p>
              <p className="text-[11.5px] text-[#C4A89E] dark:text-[#7A5848] mt-0.5">
                Things you&apos;ve done together
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#C4A89E] dark:text-[#7A5848] flex-shrink-0" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>

        {/* ── Random picker ──────────────────────────────────────────── */}
        <div className="rounded-[18px] border border-[#EDE0DC] dark:border-[#3A2418] bg-white dark:bg-[#221714] p-[16px_18px] mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#C4A89E] dark:text-[#7A5848] mb-3">
            Pick something random
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3" style={{ scrollbarWidth: 'none', flexWrap: 'nowrap' }}>
            {PICKER_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setRandomCategory(cat.key)}
                className={`flex-shrink-0 text-[11.5px] font-medium h-[26px] px-3 rounded-full border transition-colors cursor-pointer
                  ${randomCategory === cat.key
                    ? 'bg-[#C2493A] dark:bg-[#E8675A] text-white border-[#C2493A] dark:border-[#E8675A]'
                    : 'border-[#EDE0DC] dark:border-[#3A2418] text-[#A07060] dark:text-[#C89080]'
                  }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <button
            onClick={handlePick}
            disabled={pickerPool.length === 0}
            className="w-full h-10 bg-[#C2493A] dark:bg-[#E8675A] text-white rounded-xl font-medium text-sm hover:bg-[#A83D30] disabled:opacity-40 transition-colors cursor-pointer"
          >
            {pickerPool.length === 0 ? 'Nothing here yet' : 'Pick for us 🎲'}
          </button>
        </div>

        {/* ── Picked item result ─────────────────────────────────────── */}
        {pickedItem && !isSelecting && (
          <div className="rounded-[14px] border border-[#C2493A] dark:border-[#E8675A] p-[14px] bg-[#FDECEA] dark:bg-[#3D1E18] mb-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#C2493A] dark:text-[#E8675A] mb-1">
              Tonight, go here
            </p>
            <p className="text-[16px] font-bold text-[#C2493A] dark:text-[#E8675A] mb-1">
              {pickedItem.name}
            </p>
            <p className="text-[11px] text-[#A07060] dark:text-[#C89080] mb-3 capitalize">
              {CATEGORY_LABELS[pickedItem.category] ?? pickedItem.category} · Added by {getUserName(pickedItem.added_by_user_id)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDoneSheet(pickedItem)}
                className="flex-1 h-9 bg-[#C2493A] dark:bg-[#E8675A] text-white rounded-xl text-sm font-medium cursor-pointer"
              >
                Mark as done
              </button>
              <button
                onClick={handlePickAgain}
                className="flex-1 h-9 rounded-xl border border-[#C2493A] dark:border-[#E8675A] text-[#C2493A] dark:text-[#E8675A] text-sm font-medium cursor-pointer"
              >
                Pick again
              </button>
            </div>
            <button
              onClick={() => setPickedItem(null)}
              className="block w-full text-center text-[11px] text-[#A07060] dark:text-[#C89080] mt-3 cursor-pointer border-none bg-transparent"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Bucket list section rule + grid ───────────────────────── */}
        <div className="flex items-center gap-2.5 mb-3.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#C4A89E] dark:text-[#7A5848] flex-shrink-0">
            Bucket list · {filteredItems.length}
          </span>
          <div className="flex-1 h-px bg-[#EDE0DC] dark:bg-[#3A2418]" />
        </div>

        {filteredItems.length === 0 ? (
          <div className="py-10 text-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 text-[#D4C8C4] dark:text-[#3A2418]" aria-hidden="true">
              <line x1="11" y1="5" x2="22" y2="5" /><line x1="11" y1="12" x2="22" y2="12" /><line x1="11" y1="19" x2="22" y2="19" />
              <polyline points="3 5 5 7 8 3" /><polyline points="3 12 5 14 8 10" /><polyline points="3 19 5 21 8 17" />
            </svg>
            <p className="text-[13px] text-[#C4A89E] dark:text-[#7A5848]">Nothing here yet</p>
            <p className="text-[11px] text-[#D4C8C4] dark:text-[#3A2418] mt-1">Tap Add to put something on the list</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filteredItems.map(item => (
              <WishCard
                key={item.id}
                item={item}
                calendarDate={calendarDates[item.id] ?? null}
                onMarkDone={setShowDoneSheet}
                isSelecting={isSelecting}
                isSelected={selectedIds.has(item.id)}
                onToggleSelect={handleSelect}
              />
            ))}
          </div>
        )}

        {/* ── Memories strip ─────────────────────────────────────────── */}
        {localMemoriesCount > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#C4A89E] dark:text-[#7A5848] flex-shrink-0">
                Memories · {localMemoriesCount}
              </span>
              <div className="flex-1 h-px bg-[#EDE0DC] dark:bg-[#3A2418]" />
              <Link
                href="/memories"
                className="text-[11px] text-[#C4A89E] dark:text-[#7A5848] flex-shrink-0 hover:text-[#C2493A] dark:hover:text-[#E8675A] transition-colors"
              >
                See all →
              </Link>
            </div>

            {recentMemories.length > 0 ? (
              <div className="flex gap-2.5 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {recentMemories.map(memory => (
                  <MemoryCard key={memory.id} memory={memory} />
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-[#C4A89E] dark:text-[#7A5848]">
                Memories will appear here after marking items done.
              </p>
            )}
          </div>
        )}

        <div className="h-4" />
      </div>

      {/* ── Bulk action bar (portal) ──────────────────────────────────── */}
      {isSelecting && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-[#221714] border-t border-[#EDE0DC] dark:border-[#3A2418]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between gap-3">
            {selectedIds.size === 0 ? (
              <span className="text-sm text-[#C4A89E] dark:text-[#7A5848]">Tap items to select</span>
            ) : (
              <span className="text-sm text-[#A07060] dark:text-[#C89080]">{selectedIds.size} selected</span>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting || selectedIds.size === 0}
                className="h-9 px-4 rounded-xl border border-red-200 dark:border-red-900 text-red-500 dark:text-red-400 text-sm font-medium disabled:opacity-40 transition-colors cursor-pointer"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
              <button
                onClick={handleBulkMarkDone}
                disabled={isPending || eligibleSelectedCount === 0}
                className="h-9 px-4 bg-[#C2493A] dark:bg-[#E8675A] text-white rounded-xl text-sm font-medium disabled:opacity-40 transition-colors cursor-pointer"
              >
                {isPending ? 'Saving…' : 'Mark done'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Add form ─────────────────────────────────────────────────── */}
      {showAddForm && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end">
          <div
            className={`absolute inset-0 bg-[rgba(28,18,16,0.55)] dark:bg-[rgba(10,6,5,0.65)] ${isClosingAdd ? 'animate-fade-out' : 'animate-fade-in'}`}
            onClick={handleCloseAdd}
          />
          <div className={`relative bg-white dark:bg-[#2E201C] rounded-t-2xl p-5 max-h-[92vh] overflow-y-auto ${isClosingAdd ? 'animate-slide-down' : 'animate-slide-up'}`}>
            <div className="w-8 h-[3px] rounded-sm bg-[#F5EDE9] dark:bg-[#3D2820] mx-auto mb-[14px]" />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">Add to bucket list</h2>
              <button onClick={handleCloseAdd} className="text-[#A07060] dark:text-[#D4A090] text-xl leading-none cursor-pointer" aria-label="Close">×</button>
            </div>
            <AddBucketForm
              coupleId={coupleId}
              currentUserId={currentUserId}
              onSuccess={handleCloseAdd}
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

      {/* ── Bulk mark done date picker ───────────────────────────────── */}
      {bulkDoneIds && typeof document !== 'undefined' && createPortal(
        <BulkMarkDoneSheet
          count={bulkDoneIds.length}
          onConfirm={handleConfirmBulkDone}
          onCancel={() => setBulkDoneIds(null)}
        />,
        document.body
      )}
    </>
  )
}

// ── Bulk mark done sheet ──────────────────────────────────────────────────────

function BulkMarkDoneSheet({ count, onConfirm, onCancel }) {
  const today = todayISO()
  const [date, setDate] = useState(today)

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div className="absolute inset-0 bg-[rgba(28,18,16,0.55)] dark:bg-[rgba(10,6,5,0.65)] animate-fade-in" onClick={onCancel} />
      <div className="relative bg-white dark:bg-[#2E201C] rounded-t-2xl p-5 animate-slide-up">
        <div className="w-8 h-[3px] rounded-sm bg-[#F5EDE9] dark:bg-[#3D2820] mx-auto mb-[14px]" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">
            Mark {count} item{count === 1 ? '' : 's'} as done
          </h2>
          <button onClick={onCancel} className="text-[#A07060] dark:text-[#D4A090] text-xl leading-none cursor-pointer" aria-label="Close">×</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1C1210] dark:text-[#D4A090] mb-1.5">
              When did you do {count === 1 ? 'it' : 'these'}?
            </label>
            <input
              type="date"
              value={date}
              max={today}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-[10px] rounded-[10px] border text-sm border-[#EDE0DC] dark:border-[#3D2820] bg-[#FDF7F6] dark:bg-[#1A1210] text-[#1C1210] dark:text-[#FAF3F1] focus:outline-none focus:border-[#C2493A] dark:focus:border-[#F0907F] transition-colors"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl border border-[#EDE0DC] dark:border-[#3D2820] text-sm text-[#A07060] dark:text-[#D4A090] transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="button" onClick={() => onConfirm(date)} className="flex-1 py-3 bg-[#C2493A] dark:bg-[#E8675A] hover:bg-[#A83D30] text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer">
              Save memories
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
