'use client'

import { useState, useEffect, useTransition } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { bulkUndoDone, bulkDeleteMemories } from '@/app/actions/bucket'
import ConfirmSheet from '@/app/components/ConfirmSheet'
import MemoriesHelpSheet from './MemoriesHelpSheet'
import AddMemoryForm from './AddMemoryForm'
import { useTheme } from '@/app/ThemeProvider'

const CAT_PALETTE = {
  restaurant: { lightBg: '#FDECEA', lightFg: '#C2493A', darkBg: '#3D1E18', darkFg: '#F0907F', label: 'Restaurant' },
  travel:     { lightBg: '#DBEAFE', lightFg: '#1E40AF', darkBg: '#1A2535', darkFg: '#7AB0D8', label: 'Travel'     },
  activity:   { lightBg: '#EAF3DE', lightFg: '#3B6D11', darkBg: '#162404', darkFg: '#8EC44C', label: 'Activity'   },
  movie:      { lightBg: '#EDE9FE', lightFg: '#5B21B6', darkBg: '#271A36', darkFg: '#C084FC', label: 'Movie'      },
  other:      { lightBg: '#F3F4F6', lightFg: '#374151', darkBg: '#222222', darkFg: '#9CA3AF', label: 'Other'      },
}

function catPair(key, isDark) {
  const c = CAT_PALETTE[key] ?? CAT_PALETTE.other
  return { bg: isDark ? c.darkBg : c.lightBg, fg: isDark ? c.darkFg : c.lightFg, label: c.label }
}

function formatMemoryDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// ── MemoryCard ───────────────────────────────────────────────────────────────

function MemoryCard({ memory, isSelecting, isSelected, onToggleSelect, isDark }) {
  const c = catPair(memory.category, isDark)
  const accent = isDark ? '#E8675A' : '#C2493A'
  const accentDim = isDark ? '#3D1E18' : '#FDECEA'
  const innerBg = isDark
    ? (isSelected ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.22)')
    : (isSelected ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.4)')

  return (
    <div
      onClick={isSelecting ? () => onToggleSelect(memory.id) : undefined}
      className={`rounded-2xl p-1 flex flex-col overflow-hidden transition-colors duration-150 ${isSelecting ? 'cursor-pointer' : ''}`}
      style={{
        background: isSelected ? accentDim : c.bg,
        border: `1px solid ${isSelected ? `${accent}88` : `${c.fg}22`}`,
      }}
    >
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
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.fg }} />
        )}
        <span
          className="text-[9.5px] font-bold uppercase tracking-[0.08em] whitespace-nowrap"
          style={{ color: c.fg }}
        >
          {c.label}
        </span>
      </div>

      <div
        className="rounded-xl px-3 pt-[11px] pb-2.5 flex flex-col gap-1.5"
        style={{ background: innerBg, minHeight: 78 }}
      >
        <p className="text-[14px] font-semibold leading-[1.3] text-[#1C1210] dark:text-[#FAF3F1]">
          {memory.name}
        </p>
        {memory.note && (
          <p
            className="text-[11px] italic leading-[1.4] flex-1"
            style={{ color: isDark ? '#C89080' : '#A07060', opacity: 0.85 }}
          >
            “{memory.note}”
          </p>
        )}
        <div
          className="flex items-center gap-1 self-end text-[10px] font-semibold tabular-nums"
          style={{
            color: c.fg,
            opacity: 0.7,
            marginTop: memory.note ? 2 : 'auto',
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {formatMemoryDate(memory.date)}
        </div>
      </div>
    </div>
  )
}

// ── IconBtn ──────────────────────────────────────────────────────────────────

function IconBtn({ onClick, active, ariaLabel, isDark, children }) {
  const accent = isDark ? '#E8675A' : '#C2493A'
  const accentDim = isDark ? '#3D1E18' : '#FDECEA'
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center cursor-pointer transition-all flex-shrink-0"
      style={{
        border: `1px solid ${active ? `${accent}66` : (isDark ? '#3A2418' : '#EDE0DC')}`,
        background: active ? accentDim : (isDark ? '#221714' : '#FDF7F6'),
        color: active ? accent : (isDark ? '#C89080' : '#A07060'),
      }}
    >
      {children}
    </button>
  )
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function MemoriesClient({ initialMemories, coupleId }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [memories, setMemories] = useState(initialMemories)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [, startTransition] = useTransition()
  const [, startDeleteTransition] = useTransition()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [bulkError, setBulkError] = useState(null)

  // Realtime
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('memories-' + coupleId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'memories' },
        (payload) => {
          const row = payload.new ?? payload.old
          if (row?.couple_id !== coupleId) return
          if (payload.eventType === 'INSERT') {
            setMemories(prev =>
              prev.some(m => m.id === payload.new.id) ? prev : [payload.new, ...prev]
            )
          } else if (payload.eventType === 'UPDATE') {
            setMemories(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
          } else if (payload.eventType === 'DELETE') {
            setMemories(prev => prev.filter(m => m.id !== payload.old.id))
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [coupleId])

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

  function handleMoveToBucket() {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    setBulkError(null)
    const removed = memories.filter(m => ids.includes(m.id))
    setMemories(prev => prev.filter(m => !ids.includes(m.id)))
    exitSelectMode()
    startTransition(async () => {
      const result = await bulkUndoDone(ids)
      if (result?.error) {
        setMemories(prev => [...removed, ...prev])
        setBulkError('Something went wrong. Please try again.')
      }
    })
  }

  function handleConfirmDelete() {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    setBulkError(null)
    const removed = memories.filter(m => ids.includes(m.id))
    setShowDeleteConfirm(false)
    setMemories(prev => prev.filter(m => !ids.includes(m.id)))
    exitSelectMode()
    startDeleteTransition(async () => {
      const result = await bulkDeleteMemories(ids)
      if (result?.error) {
        setMemories(prev => [...removed, ...prev])
        setBulkError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <>
      <div>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start gap-2.5 mb-5">
          <Link
            href="/bucket"
            aria-label="Back to bucket list"
            className="w-9 h-9 rounded-[10px] border border-[#EDE0DC] dark:border-[#3A2418] bg-[#FDF7F6] dark:bg-[#221714] text-[#A07060] dark:text-[#C89080] flex items-center justify-center cursor-pointer flex-shrink-0 mt-0.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-bold leading-tight tracking-[-0.4px] text-[#1C1210] dark:text-[#FAF3F1]">
              Memories
            </h1>
            <p className="text-[13px] mt-[3px] text-[#C4A89E] dark:text-[#7A5848]">
              {memories.length} {memories.length === 1 ? 'thing' : 'things'} you’ve done together
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-shrink-0">
            <IconBtn onClick={() => setShowHelp(true)} ariaLabel="Memories tips" active={false} isDark={isDark}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </IconBtn>
            <IconBtn
              onClick={() => isSelecting ? exitSelectMode() : setIsSelecting(true)}
              ariaLabel={isSelecting ? 'Exit select mode' : 'Select memories'}
              active={isSelecting}
              isDark={isDark}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </IconBtn>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-[5px] h-[30px] pl-[9px] pr-[11px] rounded-[9px] bg-[#C2493A] dark:bg-[#E8675A] text-white text-[12.5px] font-semibold cursor-pointer flex-shrink-0"
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
          <div className="text-sm text-[#C2493A] dark:text-[#F0907F] bg-[#FDECEA] dark:bg-[#3D1E18] border border-[#EDE0DC] dark:border-[#3A2418] px-4 py-3 rounded-xl mb-4">
            {bulkError}
          </div>
        )}

        {memories.length === 0 ? (
          <div className="py-14 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#FDECEA] dark:bg-[#3D1E18] flex items-center justify-center mx-auto mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#C2493A" className="dark:fill-[#E8675A]" aria-hidden="true">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <p className="text-[15px] font-semibold mb-2 text-[#1C1210] dark:text-[#FAF3F1]">No memories yet</p>
            <p className="text-[13px] mb-5 leading-relaxed text-[#A07060] dark:text-[#C89080]">
              Mark bucket list items as done to create your first memory together
            </p>
            <Link
              href="/bucket"
              className="inline-block h-10 px-5 rounded-xl bg-[#C2493A] dark:bg-[#E8675A] hover:bg-[#A83D30] dark:hover:bg-[#D45849] text-white text-sm font-medium leading-10 transition-colors"
            >
              Go to bucket list
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {memories.map(m => (
              <MemoryCard
                key={m.id}
                memory={m}
                isSelecting={isSelecting}
                isSelected={selectedIds.has(m.id)}
                onToggleSelect={handleSelect}
                isDark={isDark}
              />
            ))}
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
                  background: '#321E1A', border: '1px solid #3A2418',
                  borderRadius: 16, padding: '8px 8px 8px 14px',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.55)',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: '#FAF3F1', flex: 1 }}>
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    height: 32, padding: '0 12px', borderRadius: 9,
                    border: '1px solid #3A2418', background: 'transparent',
                    color: '#FAF3F1', fontSize: 12.5, fontWeight: 600,
                    fontFamily: 'inherit', cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
                <button
                  onClick={handleMoveToBucket}
                  style={{
                    height: 32, padding: '0 12px', borderRadius: 9, border: 'none',
                    background: '#E8675A', color: 'white',
                    fontSize: 12.5, fontWeight: 600,
                    fontFamily: 'inherit', cursor: 'pointer',
                  }}
                >
                  Move to bucket
                </button>
              </div>
            ) : (
              <div
                style={{
                  background: '#321E1A', border: '1px solid #3A2418',
                  borderRadius: 16, padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.55)',
                }}
              >
                <span style={{ fontSize: 13, color: '#C89080', flex: 1 }}>Tap items to select</span>
                <button
                  onClick={exitSelectMode}
                  style={{
                    height: 28, padding: '0 12px', borderRadius: 8,
                    border: '1px solid #3A2418', background: 'transparent',
                    color: '#C89080', fontSize: 12, fontWeight: 600,
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

      {/* ── Delete confirm ───────────────────────────────────────────── */}
      {showDeleteConfirm && typeof document !== 'undefined' && createPortal(
        <ConfirmSheet
          message={`Delete ${selectedIds.size} memor${selectedIds.size === 1 ? 'y' : 'ies'}? This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />,
        document.body
      )}

      {/* ── Add memory form ──────────────────────────────────────────── */}
      {showAddForm && typeof document !== 'undefined' && createPortal(
        <AddMemoryForm
          onSuccess={() => setShowAddForm(false)}
          onCancel={() => setShowAddForm(false)}
        />,
        document.body
      )}

      {/* ── Help sheet ───────────────────────────────────────────────── */}
      <MemoriesHelpSheet isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
