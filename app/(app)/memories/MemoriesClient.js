'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { bulkUndoDone, bulkDeleteMemories } from '@/app/actions/bucket'
import { formatDate } from '@/lib/currency'
import ConfirmSheet from '@/app/components/ConfirmSheet'
import MemoriesHelpSheet from './MemoriesHelpSheet'
import AddMemoryForm from './AddMemoryForm'
import { BUCKET_CATEGORY_COLORS as CATEGORY_COLORS, BUCKET_CATEGORY_LABELS as CATEGORY_LABELS } from '@/lib/constants'

export default function MemoriesClient({ initialMemories, coupleId }) {
  const [memories, setMemories] = useState(initialMemories)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [bulkError, setBulkError] = useState(null)

  const refetch = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('memories')
      .select('*')
      .eq('couple_id', coupleId)
      .order('date', { ascending: false })
    if (data) setMemories(data)
  }, [coupleId])

  // Sync on mount — corrects stale initialMemories from router cache
  useEffect(() => { refetch() }, [refetch])

  // Realtime — keep both users in sync
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

  function handleCancelSelecting() {
    setIsSelecting(false)
    setSelectedIds(new Set())
  }

  function handleUndoDone() {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    setBulkError(null)
    const removed = memories.filter(m => ids.includes(m.id))
    setMemories(prev => prev.filter(m => !ids.includes(m.id)))
    setIsSelecting(false)
    setSelectedIds(new Set())
    startTransition(async () => {
      const result = await bulkUndoDone(ids)
      if (result?.error) {
        setMemories(prev => [...removed, ...prev])
        setBulkError('Something went wrong. Please try again.')
      }
    })
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return
    setShowDeleteConfirm(true)
  }

  function handleConfirmDelete() {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    setBulkError(null)
    const removed = memories.filter(m => ids.includes(m.id))
    setShowDeleteConfirm(false)
    setMemories(prev => prev.filter(m => !ids.includes(m.id)))
    setIsSelecting(false)
    setSelectedIds(new Set())
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
      <div className="space-y-5">
        {/* Top nav row */}
        <div className={`flex items-center justify-between ${isSelecting ? 'invisible' : ''}`}>
          <Link
            href="/bucket"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-[#EDE0DC] dark:border-[#3D2820] bg-white dark:bg-[#2E201C] text-xs font-medium text-[#A07060] dark:text-[#D4A090] hover:border-[#C2493A] hover:text-[#C2493A] dark:hover:border-[#F0907F] dark:hover:text-[#F0907F] transition-colors duration-200 shadow-[0_1px_4px_rgba(194,73,58,0.06)] cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Bucket list
          </Link>
          <button
            onClick={() => setShowHelp(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-[#EDE0DC] dark:border-[#3D2820] bg-white dark:bg-[#2E201C] text-xs font-medium text-[#A07060] dark:text-[#D4A090] hover:border-[#C2493A] hover:text-[#C2493A] dark:hover:border-[#F0907F] dark:hover:text-[#F0907F] transition-colors duration-200 shadow-[0_1px_4px_rgba(194,73,58,0.06)] cursor-pointer"
            aria-label="Memories tips"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Tip
          </button>
        </div>

        {/* Page header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#FDECEA] dark:bg-[#3D1E18] flex items-center justify-center flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#C2493A" className="dark:fill-[#F0907F]" aria-hidden="true">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <div>
              <h1 className="text-[18px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] leading-snug">Memories</h1>
              <p className="text-[12px] text-[#A07060] dark:text-[#D4A090] mt-0.5">
                {memories.length > 0
                  ? `${memories.length} thing${memories.length === 1 ? '' : 's'} done together`
                  : 'Things you\'ve done together'}
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
                {memories.length > 0 && (
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

        {bulkError && (
          <div className="text-sm text-[#C2493A] dark:text-[#F0907F] bg-[#FDECEA] dark:bg-[#3D1E18] border border-[#EDE0DC] dark:border-[#3D2820] px-4 py-3 rounded-xl">
            {bulkError}
          </div>
        )}

        {memories.length === 0 ? (
          <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] py-14 text-center px-6 shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none">
            <div className="w-12 h-12 rounded-2xl bg-[#FDECEA] dark:bg-[#3D1E18] flex items-center justify-center mx-auto mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#C2493A" className="dark:fill-[#F0907F]" aria-hidden="true">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] mb-2">
              No memories yet
            </p>
            <p className="text-[13px] text-[#A07060] dark:text-[#D4A090] mb-5 leading-relaxed">
              Mark bucket list items as done to create your first memory together
            </p>
            <Link
              href="/bucket"
              className="inline-block h-10 px-5 bg-[#C2493A] dark:bg-[#E8675A] text-white rounded-xl font-medium text-sm hover:bg-[#A83D30] transition-colors leading-10"
            >
              Go to bucket list
            </Link>
          </div>
        ) : (
          <div>
            {memories.map(memory => (
              <div
                key={memory.id}
                onClick={isSelecting ? () => handleSelect(memory.id) : undefined}
                className={`bg-white dark:bg-[#2E201C] rounded-[14px] border p-[14px] mb-[10px] transition-colors shadow-[0_2px_12px_rgba(194,73,58,0.06)] dark:shadow-none
                  ${isSelecting ? 'cursor-pointer' : ''}
                  ${selectedIds.has(memory.id)
                    ? 'border-[#C2493A] dark:border-[#F0907F] bg-[#FEF6F5] dark:bg-[#2A1510]'
                    : 'border-[#EDE0DC] dark:border-[#3D2820]'
                  }`}
              >
                <div className="flex items-start gap-3">
                  {isSelecting && (
                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all
                      ${selectedIds.has(memory.id)
                        ? 'bg-[#C2493A] border-[#C2493A] dark:bg-[#F0907F] dark:border-[#F0907F]'
                        : 'border-[#D4C8C4] dark:border-[#5A3830]'
                      }`}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] mb-1">
                      {memory.name}
                    </p>
                    <div className={`flex items-center gap-2 ${memory.note ? 'mb-2' : ''}`}>
                      <span className="text-[11px] text-[#A07060] dark:text-[#D4A090]">
                        {formatDate(memory.date)}
                      </span>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium ${CATEGORY_COLORS[memory.category] ?? CATEGORY_COLORS.other}`}>
                        {CATEGORY_LABELS[memory.category] ?? memory.category}
                      </span>
                    </div>
                    {memory.note && (
                      <p
                        className="text-[12px] text-[#A07060] dark:text-[#D4A090] italic leading-[1.55] pl-[10px]"
                        style={{ borderLeft: '2px solid #EDE0DC' }}
                      >
                        {memory.note}
                      </p>
                    )}
                  </div>
                </div>
              </div>
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
              <span className="text-sm text-[#C4A89E] dark:text-[#8A6A60]">Tap memories to select</span>
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
                onClick={handleUndoDone}
                disabled={isPending || selectedIds.size === 0}
                className="h-9 px-4 rounded-xl border border-[#EDE0DC] dark:border-[#3D2820] text-sm font-medium text-[#A07060] dark:text-[#D4A090] hover:bg-[#F5EDE9] dark:hover:bg-[#3D2820] disabled:opacity-40 transition-colors"
              >
                {isPending ? 'Undoing…' : 'Undo done'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && typeof document !== 'undefined' && createPortal(
        <ConfirmSheet
          message={`Delete ${selectedIds.size} memor${selectedIds.size === 1 ? 'y' : 'ies'}? This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />,
        document.body
      )}

      {/* Add memory form */}
      {showAddForm && typeof document !== 'undefined' && createPortal(
        <AddMemoryForm
          onSuccess={() => { setShowAddForm(false); refetch() }}
          onCancel={() => setShowAddForm(false)}
        />,
        document.body
      )}

      {/* Help sheet */}
      <MemoriesHelpSheet isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
