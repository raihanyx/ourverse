'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { bulkMarkDone, bulkDeleteBucketItems } from '@/app/actions/bucket'
import { formatDate } from '@/lib/currency'
import AddBucketForm from './AddBucketForm'
import MarkDoneSheet from './MarkDoneSheet'
import BucketHelpSheet from './BucketHelpSheet'
import ConfirmSheet from '@/app/components/ConfirmSheet'

const CATEGORY_COLORS = {
  restaurant: 'bg-[#FDECEA] text-[#C2493A] dark:bg-[#3D1E18] dark:text-[#F0907F]',
  travel:     'bg-[#DBEAFE] text-[#1E40AF] dark:bg-[#1E2A3A] dark:text-[#7AB0D8]',
  activity:   'bg-[#EAF3DE] text-[#3B6D11] dark:bg-[#173404] dark:text-[#97C459]',
  movie:      'bg-[#EDE9FE] text-[#5B21B6] dark:bg-[#2D1F3A] dark:text-[#C084FC]',
  other:      'bg-[#F3F4F6] text-[#374151] dark:bg-[#252525] dark:text-[#9CA3AF]',
}

const CATEGORY_LABELS = {
  restaurant: 'Restaurant',
  travel:     'Travel',
  activity:   'Activity',
  movie:      'Movie',
  other:      'Other',
}

const FILTER_TABS = [
  { key: 'all',        label: 'All' },
  { key: 'restaurant', label: 'Restaurants' },
  { key: 'travel',     label: 'Travel' },
  { key: 'activity',   label: 'Activities' },
  { key: 'movie',      label: 'Movies' },
  { key: 'other',      label: 'Other' },
  { key: 'done',       label: 'Done' },
]

const PICKER_CATEGORIES = [
  { key: 'all',        label: 'All' },
  { key: 'restaurant', label: 'Restaurants' },
  { key: 'travel',     label: 'Travel' },
  { key: 'activity',   label: 'Activities' },
  { key: 'movie',      label: 'Movies' },
  { key: 'other',      label: 'Other' },
]

function CategoryBadge({ category }) {
  return (
    <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium ${CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other}`}>
      {CATEGORY_LABELS[category] ?? category}
    </span>
  )
}


function BucketItemRow({ item, addedByName, calendarDate, onMarkDone, isSelecting, isSelected, onSelect, isPending }) {
  const canSelect = isSelecting && !item.is_done

  return (
    <div
      onClick={canSelect ? () => onSelect(item.id) : undefined}
      className={`flex items-center gap-3 py-3 border-b border-[#F5EDE9] dark:border-[#3D2820] last:border-0
        ${item.is_done ? 'opacity-45' : ''}
        ${canSelect ? 'cursor-pointer' : ''}
        ${isSelected ? 'mx-[-18px] px-[18px] bg-[#FEF6F5] dark:bg-[#2A1510] first:rounded-t-2xl last:rounded-b-2xl' : ''}
      `}
    >
      {isSelecting && !item.is_done && (
        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all
          ${isSelected
            ? 'bg-[#C2493A] border-[#C2493A] dark:bg-[#F0907F] dark:border-[#F0907F]'
            : 'border-[#D4C8C4] dark:border-[#5A3830]'
          }`}
        />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${item.is_done ? 'line-through text-[#A07060] dark:text-[#D4A090]' : 'text-[#1C1210] dark:text-[#FAF3F1]'}`}>
          {item.name}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <CategoryBadge category={item.category} />
          {calendarDate && !item.is_done && (
            <span className="text-[11px] px-1.5 py-0.5 rounded-md font-medium bg-[#DBEAFE] text-[#1E40AF] dark:bg-[#1E2A3A] dark:text-[#7AB0D8]">
              {formatDate(calendarDate)}
            </span>
          )}
          {item.is_done && (
            <span className="text-[11px] px-1.5 py-0.5 rounded-md font-medium bg-[#DCFCE7] text-[#166534] dark:bg-[#14532D] dark:text-[#86EFAC]">
              memory
            </span>
          )}
          <span className="text-[11px] text-[#C4A89E] dark:text-[#A07868]">
            Added by {addedByName}
          </span>
        </div>
      </div>
      {!isSelecting && !item.is_done && (
        <button
          onClick={() => onMarkDone(item)}
          disabled={isPending}
          className="flex-shrink-0 h-7 px-3 rounded-full border border-[#C2493A] dark:border-[#E8675A] text-[11px] font-medium text-[#C2493A] dark:text-[#E8675A] hover:bg-[#FDECEA] dark:hover:bg-[#3D1E18] disabled:opacity-40 transition-colors cursor-pointer"
        >
          Mark done
        </button>
      )}
    </div>
  )
}

export default function BucketClient({
  initialItems,
  initialCalendarDates,
  currentUserId,
  currentUserName,
  partnerId,
  partnerName,
  coupleId,
  memoriesCount,
}) {
  const [items, setItems] = useState(initialItems)
  const [calendarDates, setCalendarDates] = useState(initialCalendarDates ?? {})
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

  const refetchItems = useCallback(async () => {
    const supabase = createClient()
    const [{ data }, { data: calEntries }] = await Promise.all([
      supabase
        .from('bucket_items')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false }),
      supabase
        .from('calendar_entries')
        .select('bucket_item_id, date')
        .eq('couple_id', coupleId)
        .not('bucket_item_id', 'is', null),
    ])
    if (data) setItems(data)
    if (calEntries) setCalendarDates(Object.fromEntries(calEntries.map(e => [e.bucket_item_id, e.date])))
  }, [coupleId])

  // Sync on mount — corrects stale initialItems from router cache
  useEffect(() => { refetchItems() }, [refetchItems])

  // Realtime
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('bucket-' + coupleId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bucket_items' },
        (payload) => {
          const row = payload.new ?? payload.old
          if (row?.couple_id !== coupleId) return

          if (payload.eventType === 'INSERT') {
            setItems(prev =>
              prev.some(i => i.id === payload.new.id) ? prev : [payload.new, ...prev]
            )
          } else if (payload.eventType === 'UPDATE') {
            setItems(prev => prev.map(i => i.id === payload.new.id ? payload.new : i))
          } else if (payload.eventType === 'DELETE') {
            setItems(prev => prev.filter(i => i.id !== payload.old.id))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_entries' },
        (payload) => {
          const row = payload.new ?? payload.old
          if (row?.couple_id !== coupleId) return

          if (payload.eventType === 'INSERT' && payload.new.bucket_item_id) {
            setCalendarDates(prev => ({ ...prev, [payload.new.bucket_item_id]: payload.new.date }))
          } else if (payload.eventType === 'UPDATE' && payload.new.bucket_item_id) {
            setCalendarDates(prev => ({ ...prev, [payload.new.bucket_item_id]: payload.new.date }))
          } else if (payload.eventType === 'DELETE' && payload.old.bucket_item_id) {
            setCalendarDates(prev => {
              const next = { ...prev }
              delete next[payload.old.bucket_item_id]
              return next
            })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [coupleId])

  function getUserName(userId) {
    if (userId === currentUserId) return currentUserName
    if (userId === partnerId) return partnerName ?? 'Partner'
    return 'Unknown'
  }

  const filteredItems = activeFilter === 'done'
    ? items.filter(i => i.is_done)
    : activeFilter === 'all'
    ? items.filter(i => !i.is_done)
    : items.filter(i => !i.is_done && i.category === activeFilter)

  function getPickerPool() {
    const undone = items.filter(i => !i.is_done && !calendarDates[i.id])
    if (randomCategory === 'all') return undone
    return undone.filter(i => i.category === randomCategory)
  }

  function handlePick() {
    const pool = getPickerPool()
    if (pool.length === 0) { setPickedItem(null); return }
    setPickedItem(pool[Math.floor(Math.random() * pool.length)])
  }

  function handlePickAgain() {
    const pool = getPickerPool()
    if (pool.length === 0) { setPickedItem(null); return }
    const others = pool.filter(i => i.id !== pickedItem?.id)
    const source = others.length > 0 ? others : pool
    setPickedItem(source[Math.floor(Math.random() * source.length)])
  }

  function handleCloseAdd() {
    setIsClosingAdd(true)
    setTimeout(() => { setShowAddForm(false); setIsClosingAdd(false) }, 220)
  }

  function handleAddSuccess() {
    refetchItems()
    handleCloseAdd()
  }

  function handleMarkDoneSuccess() {
    if (showDoneSheet) {
      setItems(prev => prev.map(i => i.id === showDoneSheet.id ? { ...i, is_done: true } : i))
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
    const ids = filteredItems
      .filter(i => selectedIds.has(i.id))
      .map(i => i.id)
    if (ids.length === 0) return
    setShowDeleteConfirm(false)
    setItems(prev => prev.filter(i => !ids.includes(i.id)))
    setIsSelecting(false)
    setSelectedIds(new Set())
    setPickedItem(null)
    startDeleteTransition(async () => {
      await bulkDeleteBucketItems(ids)
    })
  }

  function handleBulkMarkDone() {
    const ids = filteredItems
      .filter(i => selectedIds.has(i.id) && !i.is_done)
      .map(i => i.id)
    if (ids.length === 0) return
    setBulkDoneIds(ids)
  }

  function handleConfirmBulkDone(date) {
    const ids = bulkDoneIds
    setBulkDoneIds(null)
    setItems(prev => prev.map(i => ids.includes(i.id) ? { ...i, is_done: true } : i))
    setIsSelecting(false)
    setSelectedIds(new Set())
    setPickedItem(null)
    startTransition(async () => {
      await bulkMarkDone(ids, date)
    })
  }

  const undoneItems = items.filter(i => !i.is_done)
  const pickerPool = getPickerPool()
  const eligibleSelectedCount = filteredItems.filter(i => selectedIds.has(i.id) && !i.is_done).length

  return (
    <>
      <div className="space-y-5">
        {/* Page header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#FDECEA] dark:bg-[#3D1E18] flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C2493A" className="dark:stroke-[#F0907F]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-[18px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] leading-snug">Bucket list</h1>
              <p className="text-[12px] text-[#A07060] dark:text-[#D4A090] mt-0.5">
                {undoneItems.length > 0
                  ? `${undoneItems.length} thing${undoneItems.length === 1 ? '' : 's'} to explore`
                  : 'Start adding things to do'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
              {isSelecting ? (
                <button
                  onClick={handleCancelSelecting}
                  className="h-8 px-3.5 rounded-xl border border-[#EDE0DC] dark:border-[#3D2820] bg-[#FDF7F6] dark:bg-[#1A1210] text-xs font-medium text-[#A07060] dark:text-[#D4A090] hover:border-[#C2493A] hover:text-[#C2493A] dark:hover:border-[#F0907F] dark:hover:text-[#F0907F] transition-colors duration-200 cursor-pointer"
                >
                  Cancel
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowHelp(true)}
                    className="w-8 h-8 rounded-xl border border-[#EDE0DC] dark:border-[#3D2820] bg-[#FDF7F6] dark:bg-[#1A1210] flex items-center justify-center text-[#A07060] dark:text-[#D4A090] hover:border-[#C2493A] hover:text-[#C2493A] dark:hover:border-[#F0907F] dark:hover:text-[#F0907F] transition-colors duration-200 cursor-pointer"
                    aria-label="Bucket list tips"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </button>
                  {undoneItems.length > 0 && (
                    <button
                      onClick={() => { setIsSelecting(true); setSelectedIds(new Set()) }}
                      className="h-8 px-3.5 rounded-xl border border-[#EDE0DC] dark:border-[#3D2820] bg-[#FDF7F6] dark:bg-[#1A1210] text-xs font-medium text-[#A07060] dark:text-[#D4A090] hover:border-[#C2493A] hover:text-[#C2493A] dark:hover:border-[#F0907F] dark:hover:text-[#F0907F] transition-colors duration-200 cursor-pointer"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-1.5 h-8 px-3 bg-[#C2493A] dark:bg-[#E8675A] text-white rounded-xl text-[13px] font-semibold hover:bg-[#A83D30] dark:hover:bg-[#D85A4E] transition-colors cursor-pointer"
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

        {/* Memories link card */}
        <Link href="/memories" className="block">
          <div className="bg-white dark:bg-[#2E201C] rounded-[14px] border border-[#EDE0DC] dark:border-[#3D2820] flex items-center justify-between px-4 py-[13px] shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none hover:border-[#C2493A] dark:hover:border-[#F0907F] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#FDECEA] dark:bg-[#3D1E18] flex items-center justify-center flex-shrink-0">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#C2493A" className="dark:fill-[#F0907F]" aria-hidden="true">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">Memories</p>
                <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] mt-0.5">
                  {memoriesCount === 0 ? 'Nothing done together yet' : `${memoriesCount} things you've done together`}
                </p>
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#C2493A] dark:text-[#F0907F] flex-shrink-0" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>

        {/* Random picker card */}
        <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] p-[18px] shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">
          <p className="text-[10px] font-semibold text-[#A07060] dark:text-[#D4A090] uppercase tracking-wider mb-3">
            Pick something random
          </p>
          <div className="flex gap-[6px] overflow-x-auto pb-1 mb-3 scrollbar-none" style={{ flexWrap: 'nowrap' }}>
            {PICKER_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setRandomCategory(cat.key)}
                className={`flex-shrink-0 text-[12px] font-medium px-3 py-1 rounded-full border transition-colors cursor-pointer
                  ${randomCategory === cat.key
                    ? 'bg-[#C2493A] dark:bg-[#E8675A] text-white border-[#C2493A] dark:border-[#E8675A]'
                    : 'border-[#EDE0DC] dark:border-[#3D2820] text-[#A07060] dark:text-[#D4A090] hover:border-[#C2493A] dark:hover:border-[#F0907F]'
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
            {pickerPool.length === 0 ? 'Nothing in this category yet' : 'Pick for us'}
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`flex-shrink-0 h-8 px-3 rounded-full text-[12px] font-medium border transition-colors cursor-pointer
                ${activeFilter === tab.key
                  ? 'bg-[#C2493A] dark:bg-[#E8675A] text-white border-[#C2493A] dark:border-[#E8675A]'
                  : 'border-[#EDE0DC] dark:border-[#3D2820] text-[#A07060] dark:text-[#D4A090] hover:border-[#C2493A] dark:hover:border-[#F0907F]'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Picked item result card */}
        {pickedItem && !isSelecting && (
          <div className="rounded-[14px] border border-[#C2493A] dark:border-[#F0907F] p-[14px] bg-[#FDECEA] dark:bg-[#3D1E18]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#C2493A] dark:text-[#F0907F] mb-1">
              Tonight, go here
            </p>
            <p className="text-[16px] font-bold text-[#C2493A] dark:text-[#F0907F] mb-1">
              {pickedItem.name}
            </p>
            <p className="text-[11px] text-[#A07060] dark:text-[#D4A090] mb-3 capitalize">
              {CATEGORY_LABELS[pickedItem.category] ?? pickedItem.category} · Added by {getUserName(pickedItem.added_by_user_id)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDoneSheet(pickedItem)}
                className="flex-1 h-9 bg-[#C2493A] dark:bg-[#E8675A] text-white rounded-xl text-sm font-medium hover:bg-[#A83D30] transition-colors cursor-pointer"
              >
                Mark as done
              </button>
              <button
                onClick={handlePickAgain}
                className="flex-1 h-9 rounded-xl border border-[#C2493A] dark:border-[#F0907F] text-[#C2493A] dark:text-[#F0907F] text-sm font-medium hover:bg-[#FDECEA] dark:hover:bg-[#3D1E18] transition-colors"
              >
                Pick again
              </button>
            </div>
            <button
              onClick={() => setPickedItem(null)}
              style={{ fontSize: '11px', fontWeight: 500, textAlign: 'center', display: 'block', width: '100%', padding: '6px 0', marginTop: '6px', marginBottom: '-8px', cursor: 'pointer', border: 'none', background: 'transparent' }}
              className="text-[#A07060] dark:text-[#D4A090]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Item list */}
        {filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] py-10 text-center space-y-2 shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-[#D4C8C4] dark:text-[#5A3830]" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <p className="text-[#C4A89E] dark:text-[#A07868] text-sm">
              {activeFilter === 'done' ? 'Nothing done together yet' : 'Nothing here yet'}
            </p>
            {activeFilter !== 'done' && (
              <p className="text-xs text-[#D4C8C4] dark:text-[#5A3830]">Tap Add to put something on the list</p>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] px-[18px] shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">
            {filteredItems.map(item => (
              <BucketItemRow
                key={item.id}
                item={item}
                addedByName={getUserName(item.added_by_user_id)}
                calendarDate={calendarDates[item.id] ?? null}
                onMarkDone={setShowDoneSheet}
                isSelecting={isSelecting}
                isSelected={selectedIds.has(item.id)}
                onSelect={handleSelect}
                isPending={isPending}
              />
            ))}
          </div>
        )}

        <div className="h-4" />
      </div>

      {/* Bulk action bar */}
      {isSelecting && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-[#2E201C] border-t border-[#EDE0DC] dark:border-[#3D2820]"
          style={{ animation: 'fadeIn 150ms ease-out', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between gap-3">
            {selectedIds.size === 0 ? (
              <span className="text-sm text-[#C4A89E] dark:text-[#8A6A60]">Tap items to select</span>
            ) : (
              <span className="text-sm text-[#A07060] dark:text-[#D4A090]">{selectedIds.size} selected</span>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting || selectedIds.size === 0}
                className="h-9 px-4 rounded-xl border border-red-200 dark:border-red-900 text-red-500 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-40 transition-colors"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
              <button
                onClick={handleBulkMarkDone}
                disabled={isPending || eligibleSelectedCount === 0}
                className="h-9 px-4 bg-[#C2493A] dark:bg-[#E8675A] text-white rounded-xl text-sm font-medium hover:bg-[#A83D30] dark:hover:bg-[#D45A4A] disabled:opacity-40 transition-colors"
              >
                {isPending ? 'Saving…' : 'Mark done'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add form slide-up */}
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
              <button
                onClick={handleCloseAdd}
                className="text-[#A07060] dark:text-[#D4A090] hover:text-[#1C1210] dark:hover:text-[#FAF3F1] text-xl leading-none transition-colors"
                aria-label="Close"
              >
                ×
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

      {/* Mark as done sheet */}
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

      {/* Help sheet */}
      <BucketHelpSheet
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />

      {/* Delete confirmation */}
      {showDeleteConfirm && typeof document !== 'undefined' && createPortal(
        <ConfirmSheet
          message={`Delete ${selectedIds.size} item${selectedIds.size === 1 ? '' : 's'}? This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />,
        document.body
      )}

      {/* Bulk mark done date picker */}
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

function BulkMarkDoneSheet({ count, onConfirm, onCancel }) {
  const today = new Date().toLocaleDateString('en-CA')
  const [date, setDate] = useState(today)

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-[rgba(28,18,16,0.55)] dark:bg-[rgba(10,6,5,0.65)] animate-fade-in"
        onClick={onCancel}
      />
      <div className="relative bg-white dark:bg-[#2E201C] rounded-t-2xl p-5 animate-slide-up">
        <div className="w-8 h-[3px] rounded-sm bg-[#F5EDE9] dark:bg-[#3D2820] mx-auto mb-[14px]" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">Mark {count} item{count === 1 ? '' : 's'} as done</h2>
          <button
            onClick={onCancel}
            className="text-[#A07060] dark:text-[#D4A090] hover:text-[#1C1210] dark:hover:text-[#FAF3F1] text-xl leading-none transition-colors cursor-pointer"
            aria-label="Close"
          >
            ×
          </button>
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
              className="w-full px-3 py-[10px] rounded-[10px] border text-sm
                         border-[#EDE0DC] dark:border-[#3D2820] bg-[#FDF7F6] dark:bg-[#1A1210]
                         text-[#1C1210] dark:text-[#FAF3F1]
                         focus:outline-none focus:border-[#C2493A] dark:focus:border-[#F0907F] transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border border-[#EDE0DC] dark:border-[#3D2820] text-sm text-[#A07060] dark:text-[#D4A090] hover:bg-[#FDF7F6] dark:hover:bg-[#1A1210] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(date)}
              className="flex-1 py-3 bg-[#C2493A] dark:bg-[#E8675A] hover:bg-[#A83D30] text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
            >
              Save memories
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
