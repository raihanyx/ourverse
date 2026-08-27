'use client'

import { useState, useEffect, useMemo, useRef, useSyncExternalStore, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/currency'
import {
  addShoppingItem,
  setShoppingItemBought,
  bulkDeleteShoppingItems,
  clearBoughtItems,
} from '@/app/actions/shopping'
import ConfirmSheet from '@/app/components/ConfirmSheet'
import ShoppingHelpSheet from './ShoppingHelpSheet'
import { useTheme } from '@/app/ThemeProvider'

const BOUGHT_OPEN_KEY = 'ourverse.shopping.boughtOpen'

// How recently something must have been bought for the add-input to warn you.
// Deliberately short: a longer window catches more slow consumables, but fires
// often enough that you stop reading it. One number, easy to retune.
const RECENT_BUY_DAYS = 2

// How long the undo toast stays up after ticking something off.
const UNDO_MS = 6000

const DAY_MS = 86400000

function normalize(name) {
  return String(name ?? '').trim().toLowerCase()
}

/**
 * Coarse on purpose. Day-granular text is wrong for at most a few hours, which
 * nobody notices — and it means the labels need no ticking timer, only a
 * recompute when the app is actually looked at.
 */
function relativeTime(iso, nowMs) {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  const diff = Math.max(0, nowMs - then)
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(diff / DAY_MS)
  if (days < 30) return `${days}d ago`
  return formatDate(String(iso).slice(0, 10))
}

// Whether the Bought section is expanded is a per-device preference living in
// localStorage — an external store, so it is read through useSyncExternalStore.
// A lazy useState initialiser would disagree with the server's HTML and trip a
// hydration mismatch; reading it in an effect would cascade an extra render.
const boughtOpenStore = {
  listeners: new Set(),
  subscribe(listener) {
    boughtOpenStore.listeners.add(listener)
    return () => boughtOpenStore.listeners.delete(listener)
  },
  getSnapshot() {
    try { return localStorage.getItem(BOUGHT_OPEN_KEY) === '1' } catch { return false }
  },
  getServerSnapshot() {
    return false
  },
  set(next) {
    try { localStorage.setItem(BOUGHT_OPEN_KEY, next ? '1' : '0') } catch {}
    boughtOpenStore.listeners.forEach(listener => listener())
  },
}

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

function ItemRow({ item, isSelecting, isSelected, onToggle, onSelect, isDark, currentUserId, partnerName, nowMs, selectIds }) {
  const accent = isDark ? 'var(--v2-accent)' : '#D8513E'
  const accentDim = isDark ? 'var(--v2-accentDim)' : '#FCE3DC'
  const bought = item.is_bought

  const nameFor = id => (id === currentUserId ? 'You' : (partnerName || 'Partner'))
  const colorFor = id => (id === currentUserId ? (isDark ? 'var(--v2-accent)' : '#D8513E') : 'var(--v2-pink)')

  const addedWhen = relativeTime(item.created_at, nowMs)
  const boughtWhen = bought ? relativeTime(item.bought_at, nowMs) : null
  // Naming the same person twice on one line reads as a stutter, so the adder is
  // only spelled out when they are not also the buyer.
  const sameActor = bought && item.added_by_user_id === item.bought_by_user_id

  return (
    <button
      type="button"
      onClick={() => (isSelecting ? onSelect(selectIds ?? [item.id]) : onToggle(item))}
      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[14px] border text-left transition-colors cursor-pointer"
      style={{
        borderColor: isSelected ? `${accent}88` : (isDark ? 'var(--v2-border)' : '#ECDFD2'),
        background: isSelected ? accentDim : (isDark ? 'var(--v2-surface)' : '#FFFFFF'),
        opacity: bought && !isSelected ? 0.6 : 1,
      }}
    >
      <span
        className="w-[21px] h-[21px] rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
        style={{
          border: `2px solid ${isSelected || bought ? accent : (isDark ? 'var(--v2-t3)' : '#B19A8B')}`,
          background: isSelected || bought ? accent : 'transparent',
        }}
      >
        {(isSelected || bought) && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>

      <span className="flex-1 min-w-0">
        <span
          className="block text-[14.5px] text-[#2A1810] dark:text-[#FAF3F1] break-words"
          style={bought ? { textDecoration: 'line-through' } : undefined}
        >
          {item.name}
        </span>
        <span className="block text-[10.5px] mt-[3px] leading-[1.45] text-[#B19A8B] dark:text-[#7A5848]" suppressHydrationWarning>
          added {addedWhen}
          {!sameActor && (
            <> · <span style={{ color: colorFor(item.added_by_user_id), fontWeight: 600 }}>{nameFor(item.added_by_user_id)}</span></>
          )}
          {bought && (
            <>
              {' → '}bought {boughtWhen} ·{' '}
              <span style={{ color: colorFor(item.bought_by_user_id), fontWeight: 600 }}>{nameFor(item.bought_by_user_id)}</span>
            </>
          )}
        </span>
      </span>
    </button>
  )
}

export default function ShoppingClient({ initialItems, coupleId, currentUserId, partnerName }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [items, setItems] = useState(initialItems)
  const [draft, setDraft] = useState('')
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showHelp, setShowHelp] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [noticeMsg, setNoticeMsg] = useState(null)
  const [undoItem, setUndoItem] = useState(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [, startTransition] = useTransition()
  const inputRef = useRef(null)
  const undoTimerRef = useRef(null)

  const accent = isDark ? 'var(--v2-accent)' : '#D8513E'
  const accentDim = isDark ? 'var(--v2-accentDim)' : '#FCE3DC'

  const boughtOpen = useSyncExternalStore(
    boughtOpenStore.subscribe,
    boughtOpenStore.getSnapshot,
    boughtOpenStore.getServerSnapshot
  )

  const openItems = useMemo(
    () => items.filter(i => !i.is_bought).sort((a, b) => (b.sort_at ?? '').localeCompare(a.sort_at ?? '')),
    [items]
  )
  const boughtItems = useMemo(
    () => items.filter(i => i.is_bought).sort((a, b) => (b.bought_at ?? '').localeCompare(a.bought_at ?? '')),
    [items]
  )

  // Relative labels go stale only while nobody is looking. Recompute when the
  // app comes back to the foreground rather than on an interval — an interval
  // would re-render the whole list every minute for cosmetics.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNowMs(Date.now())
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current) }, [])

  /**
   * Warn before you commit, not after. Matched entirely against rows already in
   * memory, so it costs no round-trip and updates as you type.
   */
  const hint = useMemo(() => {
    const target = normalize(draft)
    if (!target) return null

    const open = items.find(i => !i.is_bought && normalize(i.name) === target)
    if (open) return { kind: 'open', text: 'Already on the list.' }

    const lastBought = items
      .filter(i => i.is_bought && i.bought_at && normalize(i.name) === target)
      .sort((a, b) => (b.bought_at ?? '').localeCompare(a.bought_at ?? ''))[0]

    if (lastBought) {
      const ageDays = (nowMs - new Date(lastBought.bought_at).getTime()) / DAY_MS
      if (ageDays <= RECENT_BUY_DAYS) {
        const who = lastBought.bought_by_user_id === currentUserId ? 'You' : (partnerName || 'Your partner')
        return { kind: 'bought', text: `${who} bought this ${relativeTime(lastBought.bought_at, nowMs)}.` }
      }
    }
    return null
  }, [draft, items, nowMs, currentUserId, partnerName])

  // An "already on the list" hint is a hard stop — two identical live rows help
  // nobody. A recent-purchase hint is advisory and can be waved through.
  const blocked = hint?.kind === 'open'

  function toggleBoughtSection() {
    boughtOpenStore.set(!boughtOpen)
  }

  // Realtime — cross-device backstop only; our own mutations already updated
  // state optimistically. No server-side filter (unreliable on some configs);
  // RLS handles visibility and we guard on couple_id here.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('shopping-' + coupleId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, (payload) => {
        const row = payload.new ?? payload.old
        if (row?.couple_id !== coupleId) return

        if (payload.eventType === 'INSERT') {
          setItems(prev => {
            if (prev.some(i => i.id === payload.new.id)) return prev
            // A partner's insert can land while our own optimistic row for the
            // same name is still in flight — drop the placeholder, not the row.
            const withoutTemp = prev.filter(
              i => !(String(i.id).startsWith('tmp-') && normalize(i.name) === normalize(payload.new.name))
            )
            return [payload.new, ...withoutTemp]
          })
        } else if (payload.eventType === 'UPDATE') {
          setItems(prev => prev.map(i => (i.id === payload.new.id ? payload.new : i)))
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(i => i.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [coupleId])

  function commitAdd(rawName, { refocus = true } = {}) {
    const name = String(rawName ?? '').trim()
    if (!name) return

    const tempId = 'tmp-' + (globalThis.crypto?.randomUUID?.() ?? Date.now())
    const now = new Date().toISOString()

    setErrorMsg(null)
    setNoticeMsg(null)
    setDraft('')
    // Only pull focus back when the add came from the input. Doing it after a
    // tap down in the Bought list would scroll the page up under the user.
    if (refocus) inputRef.current?.focus()

    setItems(prev => [
      {
        id: tempId,
        couple_id: coupleId,
        added_by_user_id: currentUserId,
        name,
        is_bought: false,
        bought_at: null,
        bought_by_user_id: null,
        sort_at: now,
        created_at: now,
      },
      ...prev,
    ])

    startTransition(async () => {
      const result = await addShoppingItem(name)
      if (result?.error) {
        // Roll back only this row. Restoring a whole snapshot would delete
        // anything added while this request was still in flight.
        setItems(prev => prev.filter(i => i.id !== tempId))
        setErrorMsg(result.error)
        return
      }
      if (result?.duplicate) {
        // Partner added the same thing in the same moment — keep theirs.
        setItems(prev => {
          const withoutTemp = prev.filter(i => i.id !== tempId)
          return withoutTemp.some(i => i.id === result.data.id) ? withoutTemp : [result.data, ...withoutTemp]
        })
        setNoticeMsg(`${result.data.name} was already on the list.`)
        return
      }
      setItems(prev => {
        const withoutTemp = prev.filter(i => i.id !== tempId)
        return withoutTemp.some(i => i.id === result.data.id)
          ? withoutTemp.map(i => (i.id === result.data.id ? result.data : i))
          : [result.data, ...withoutTemp]
      })
    })
  }

  function handleSubmit(e) {
    e?.preventDefault()
    if (blocked) return
    commitAdd(draft)
  }

  function handleToggle(item) {
    // Bought rows are history and are never revived. Tapping one means "buy this
    // again", which creates a fresh row so the old purchase stays on the record.
    if (item.is_bought) {
      setErrorMsg(null)
      const stillOpen = openItems.find(i => normalize(i.name) === normalize(item.name))
      if (stillOpen) {
        setNoticeMsg(`${item.name} is already on the list.`)
        return
      }
      commitAdd(item.name, { refocus: false })
      return
    }

    const snapshot = item
    setErrorMsg(null)
    setNoticeMsg(null)
    setItems(prev =>
      prev.map(i =>
        i.id === item.id
          ? { ...i, is_bought: true, bought_at: new Date().toISOString(), bought_by_user_id: currentUserId }
          : i
      )
    )
    showUndo(snapshot)

    startTransition(async () => {
      const result = await setShoppingItemBought(item.id, true)
      if (result?.error) {
        setItems(prev => prev.map(i => (i.id === snapshot.id ? snapshot : i)))
        setErrorMsg(result.error)
        clearUndo()
        return
      }
      setItems(prev => prev.map(i => (i.id === result.data.id ? result.data : i)))
    })
  }

  function showUndo(item) {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoItem(item)
    undoTimerRef.current = setTimeout(() => setUndoItem(null), UNDO_MS)
  }

  function clearUndo() {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    undoTimerRef.current = null
    setUndoItem(null)
  }

  function handleUndo() {
    const item = undoItem
    if (!item) return
    clearUndo()
    setErrorMsg(null)

    setItems(prev =>
      prev.map(i => (i.id === item.id ? { ...i, is_bought: false, bought_at: null, bought_by_user_id: null } : i))
    )

    startTransition(async () => {
      const result = await setShoppingItemBought(item.id, false)
      if (result?.error) {
        setItems(prev =>
          prev.map(i =>
            i.id === item.id
              ? { ...i, is_bought: true, bought_at: new Date().toISOString(), bought_by_user_id: currentUserId }
              : i
          )
        )
        setErrorMsg(result.error)
        return
      }
      setItems(prev => prev.map(i => (i.id === result.data.id ? result.data : i)))
    })
  }

  // Takes an array so a row can stand for more than one record if that is ever
  // needed; today every row selects exactly itself.
  function handleSelect(ids) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      const allSelected = ids.every(id => next.has(id))
      ids.forEach(id => (allSelected ? next.delete(id) : next.add(id)))
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
    setErrorMsg(null)
    const removed = items.filter(i => ids.includes(i.id))
    setShowDeleteConfirm(false)
    setItems(prev => prev.filter(i => !ids.includes(i.id)))
    exitSelectMode()

    startTransition(async () => {
      const result = await bulkDeleteShoppingItems(ids)
      if (result?.error) {
        setItems(prev => [...removed, ...prev])
        setErrorMsg('Something went wrong. Please try again.')
      }
    })
  }

  function handleConfirmClear() {
    setErrorMsg(null)
    const removed = boughtItems
    setShowClearConfirm(false)
    setItems(prev => prev.filter(i => !i.is_bought))

    startTransition(async () => {
      const result = await clearBoughtItems()
      if (result?.error) {
        setItems(prev => [...prev, ...removed])
        setErrorMsg('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-[24px] font-bold leading-tight tracking-[-0.4px] text-[#2A1810] dark:text-[#FAF3F1]">
            Shopping
          </h1>
          <p className="text-[13px] mt-[3px] text-[#B19A8B] dark:text-[#7A5848]">
            {openItems.length === 0 ? 'Nothing to buy' : `${openItems.length} to buy`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 mt-1 flex-shrink-0">
          <IconBtn onClick={() => setShowHelp(true)} ariaLabel="Shopping list tips" active={false} isDark={isDark} disabled={isSelecting}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </IconBtn>
          <IconBtn
            onClick={() => (isSelecting ? exitSelectMode() : setIsSelecting(true))}
            ariaLabel={isSelecting ? 'Exit select mode' : 'Select items'}
            active={isSelecting}
            isDark={isDark}
            disabled={showHelp || items.length === 0}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </IconBtn>
        </div>
      </div>

      {errorMsg && (
        <div className="text-sm text-[#D8513E] dark:text-[#F0907F] bg-[#FCE3DC] dark:bg-[#3D1E18] border border-[#ECDFD2] dark:border-[#3A2418] px-4 py-3 rounded-xl mb-4">
          {errorMsg}
        </div>
      )}

      {noticeMsg && (
        <div className="text-[13px] text-[#7A5C4E] dark:text-[#C89080] bg-[#F8F2EB] dark:bg-[#221714] border border-[#ECDFD2] dark:border-[#3A2418] px-4 py-2.5 rounded-xl mb-4">
          {noticeMsg}
        </div>
      )}

      {/* Add row — always visible, keeps focus so several items can go in a row */}
      <div className="mb-5">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            disabled={isSelecting}
            maxLength={120}
            enterKeyHint="done"
            autoComplete="off"
            autoCapitalize="sentences"
            placeholder="Add something to buy…"
            aria-label="Add something to buy"
            className="flex-1 min-w-0 h-[46px] px-3.5 rounded-xl border text-[14px]
                       bg-[#F8F2EB] dark:bg-[#221714]
                       text-[#2A1810] dark:text-[#FAF3F1]
                       placeholder:text-[#B19A8B] dark:placeholder:text-[#7A5848]
                       focus:outline-none transition-colors disabled:opacity-40"
            style={{ borderColor: hint ? `${accent}66` : (isDark ? 'var(--v2-border)' : '#ECDFD2') }}
          />
          <button
            type="submit"
            disabled={!draft.trim() || isSelecting || blocked}
            aria-label="Add"
            className="w-[46px] h-[46px] flex-shrink-0 rounded-xl bg-[#D8513E] dark:bg-[#E8675A] hover:bg-[#C04830] dark:hover:bg-[#D45849] text-white flex items-center justify-center cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </form>

        {hint && (
          <div
            className="mt-2 px-3.5 py-2.5 rounded-xl border flex items-center gap-2.5"
            style={{ borderColor: `${accent}44`, background: accentDim }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="flex-1 min-w-0 text-[12.5px] leading-snug" style={{ color: accent }}>
              {hint.text}
            </span>
            {hint.kind === 'bought' && (
              <button
                type="button"
                onClick={() => commitAdd(draft)}
                className="h-[28px] px-3 rounded-[9px] text-[12px] font-semibold flex-shrink-0 cursor-pointer bg-[#D8513E] dark:bg-[#E8675A] text-white"
              >
                Add anyway
              </button>
            )}
          </div>
        )}
      </div>

      {/* Open list */}
      {openItems.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: accentDim }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="20" r="1.5" />
              <circle cx="18" cy="20" r="1.5" />
              <path d="M2 3h2.5l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h8.9a1.5 1.5 0 0 0 1.5-1.2L21 7H5.2" />
            </svg>
          </div>
          <p className="text-[15px] font-semibold mb-2 text-[#2A1810] dark:text-[#FAF3F1]">All caught up</p>
          <p className="text-[13px] leading-relaxed text-[#7A5C4E] dark:text-[#C89080]">
            Nothing to buy right now — add something above.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {openItems.map(item => (
            <ItemRow
              key={item.id}
              item={item}
              isSelecting={isSelecting}
              isSelected={selectedIds.has(item.id)}
              onToggle={handleToggle}
              onSelect={handleSelect}
              isDark={isDark}
              currentUserId={currentUserId}
              partnerName={partnerName}
              nowMs={nowMs}
            />
          ))}
        </div>
      )}

      {/* Bought — one entry per item, newest purchase first */}
      {boughtItems.length > 0 && (
        <div className="mt-7">
          <div className="flex items-center gap-2.5 mb-3">
            <button
              onClick={toggleBoughtSection}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#B19A8B] dark:text-[#7A5848] flex-shrink-0 cursor-pointer"
              aria-expanded={boughtOpen}
            >
              <svg
                width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                className="transition-transform duration-200"
                style={{ transform: boughtOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              Bought · {boughtItems.length}
            </button>
            <div className="flex-1 h-px bg-[#ECDFD2] dark:bg-[#3A2418]" />
            {boughtOpen && (
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={isSelecting}
                className="h-[26px] px-2.5 rounded-[9px] text-[11.5px] font-semibold flex-shrink-0 cursor-pointer transition-opacity disabled:opacity-40"
                style={{ border: `1px solid ${accent}66`, background: accentDim, color: accent }}
              >
                Clear
              </button>
            )}
          </div>

          {boughtOpen && (
            <>
              <p className="text-[11.5px] mb-2.5 text-[#B19A8B] dark:text-[#7A5848]">
                Every purchase is kept, newest first. Need it again? Tap to put it back on the list.
              </p>
              <div className="flex flex-col gap-2">
                {boughtItems.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    isSelecting={isSelecting}
                    isSelected={selectedIds.has(item.id)}
                    onToggle={handleToggle}
                    onSelect={handleSelect}
                    isDark={isDark}
                    currentUserId={currentUserId}
                    partnerName={partnerName}
                    nowMs={nowMs}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <ShoppingHelpSheet isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Undo toast — the mistap safety net. Sits above the tab bar. */}
      {undoItem && !isSelecting && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 25, paddingBottom: 'env(safe-area-inset-bottom)', pointerEvents: 'none' }}>
          <div className="max-w-lg mx-auto animate-fade-in" style={{ padding: '0 12px 76px' }}>
            <div
              style={{
                background: 'var(--v2-cardHigh)', border: '1px solid var(--v2-border)', borderRadius: 14,
                padding: '9px 9px 9px 14px', display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: '0 10px 30px rgba(0,0,0,0.35)', pointerEvents: 'auto',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--v2-t1)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {undoItem.name} bought
              </span>
              <button
                onClick={handleUndo}
                style={{ height: 30, padding: '0 13px', borderRadius: 9, border: 'none', background: 'var(--v2-accent)', color: 'white', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0 }}
              >
                Undo
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Bulk action bar */}
      {isSelecting && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30, paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="max-w-lg mx-auto" style={{ padding: '0 12px 80px' }}>
            {selectedIds.size > 0 ? (
              <div style={{ background: 'var(--v2-cardHigh)', border: '1px solid var(--v2-border)', borderRadius: 16, padding: '8px 8px 8px 14px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.55)' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--v2-t1)', flex: 1 }}>
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{ height: 32, padding: '0 14px', borderRadius: 9, border: 'none', background: 'var(--v2-accent)', color: 'white', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  Delete
                </button>
              </div>
            ) : (
              <div style={{ background: 'var(--v2-cardHigh)', border: '1px solid var(--v2-border)', borderRadius: 16, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.55)' }}>
                <span style={{ fontSize: 13, color: 'var(--v2-t2)', flex: 1 }}>Tap items to select</span>
                <button
                  onClick={exitSelectMode}
                  style={{ height: 28, padding: '0 12px', borderRadius: 8, border: '1px solid var(--v2-border)', background: 'transparent', color: 'var(--v2-t2)', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {showDeleteConfirm && typeof document !== 'undefined' && createPortal(
        <ConfirmSheet
          message={`Delete ${selectedIds.size} item${selectedIds.size === 1 ? '' : 's'}? This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />,
        document.body
      )}

      {showClearConfirm && typeof document !== 'undefined' && createPortal(
        <ConfirmSheet
          message={`Clear ${boughtItems.length} bought entr${boughtItems.length === 1 ? 'y' : 'ies'}? This erases your purchase history.`}
          confirmLabel="Clear"
          onConfirm={handleConfirmClear}
          onCancel={() => setShowClearConfirm(false)}
        />,
        document.body
      )}
    </div>
  )
}
