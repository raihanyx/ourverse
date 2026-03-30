'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { bulkUndoDone } from '@/app/actions/bucket'
import { formatDate } from '@/lib/currency'

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

export default function MemoriesClient({ initialMemories }) {
  const [memories, setMemories] = useState(initialMemories)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [isPending, startTransition] = useTransition()

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
    startTransition(async () => {
      await bulkUndoDone(ids)
      setMemories(prev => prev.filter(m => !ids.includes(m.id)))
      setIsSelecting(false)
      setSelectedIds(new Set())
    })
  }

  return (
    <>
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between">
            <h1 className="text-[22px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">Memories</h1>
            {memories.length > 0 && (
              <button
                onClick={isSelecting ? handleCancelSelecting : () => { setIsSelecting(true); setSelectedIds(new Set()) }}
                style={{ fontSize: '11px', fontWeight: 500 }}
                className="text-[#A07060] dark:text-[#D4A090] hover:text-[#1C1210] dark:hover:text-[#FAF3F1] transition-colors"
              >
                {isSelecting ? 'Cancel' : 'Select'}
              </button>
            )}
          </div>
          <p className="text-[13px] text-[#A07060] dark:text-[#D4A090] mt-1">
            Things you've done together
          </p>
        </div>

        {memories.length === 0 ? (
          <div className="bg-white dark:bg-[#2E201C] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2820] py-14 text-center px-6">
            <p className="text-[28px] mb-3">✦</p>
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
                className={`bg-white dark:bg-[#2E201C] rounded-[14px] border p-[14px] mb-[10px] transition-colors
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
                    <div className="flex items-center gap-2 mb-2">
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

        <div className="h-20" />
      </div>

      {/* Bulk action bar */}
      {isSelecting && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-[#2E201C] border-t border-[#EDE0DC] dark:border-[#3D2820]"
          style={{ animation: 'fadeIn 150ms ease-out' }}
        >
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
            {selectedIds.size === 0 ? (
              <span className="text-sm text-[#C4A89E] dark:text-[#8A6A60]">Tap memories to select</span>
            ) : (
              <span className="text-sm text-[#A07060] dark:text-[#D4A090]">{selectedIds.size} selected</span>
            )}
            <button
              onClick={handleUndoDone}
              disabled={isPending || selectedIds.size === 0}
              className="h-9 px-4 rounded-xl border border-[#EDE0DC] dark:border-[#3D2820] text-sm font-medium text-[#A07060] dark:text-[#D4A090] hover:bg-[#F5EDE9] dark:hover:bg-[#3D2820] disabled:opacity-40 transition-colors"
            >
              {isPending ? 'Undoing…' : 'Undo done'}
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
