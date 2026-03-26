'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { togglePaid } from '@/app/actions/expenses'
import { formatAmount, sumByCurrency } from '@/lib/currency'
import { computeUnifiedTotal, getRateLines } from '@/lib/exchangeRates'
import AddExpenseForm from './AddExpenseForm'

const CATEGORY_COLORS = {
  food:          'bg-[#FEF3C7] text-[#92400E] dark:bg-[#3A2A12] dark:text-[#F0A840]',
  transport:     'bg-[#DBEAFE] text-[#1E40AF] dark:bg-[#1E2A3A] dark:text-[#7AB0D8]',
  accommodation: 'bg-[#EDE9FE] text-[#5B21B6] dark:bg-[#2D1F3A] dark:text-[#C084FC]',
  shopping:      'bg-[#FCE7F3] text-[#9D174D] dark:bg-[#3A1A2A] dark:text-[#F472B6]',
  other:         'bg-[#F3F4F6] text-[#374151] dark:bg-[#252525] dark:text-[#9CA3AF]',
}

function TotalsBadges({ expenses, baseCurrency, rates }) {
  const unpaid = expenses.filter(e => !e.is_paid)
  const totals = sumByCurrency(unpaid)
  const entries = Object.entries(totals).filter(([, v]) => v > 0)

  const unifiedTotal = computeUnifiedTotal(totals, baseCurrency, rates)
  const rateLines = getRateLines(baseCurrency, rates)

  if (entries.length === 0) {
    return <p className="text-sm text-[#A07060] dark:text-[#C49080]">Nothing owed</p>
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {entries.map(([currency, amount]) => (
          <span
            key={currency}
            className="text-[13px] font-semibold text-[#C2493A] dark:text-[#F0907F] bg-[#FDECEA] dark:bg-[#4A2820] px-3 py-1 rounded-full"
          >
            {formatAmount(amount, currency)}
          </span>
        ))}
      </div>

      {/* Unified total in base currency */}
      {rates && unifiedTotal !== null && unifiedTotal > 0 && (
        <p className="text-xs text-[#A07060] dark:text-[#C49080] mt-2">
          ≈ {formatAmount(unifiedTotal, baseCurrency)} at current rates
        </p>
      )}

      {/* Rate transparency */}
      {rates && rateLines.length > 0 && (
        <p className="text-xs text-[#C4A89E] dark:text-[#8A6A60] mt-1 leading-relaxed">
          {rateLines.join(' · ')}
        </p>
      )}
    </div>
  )
}

function ExpenseRow({ expense, onToggle, isPending }) {
  return (
    <div
      className={`flex items-start gap-3 py-3 border-b border-[#F5EDE9] dark:border-[#3D2C29] last:border-0
                  transition-opacity ${expense.is_paid ? 'opacity-40' : ''}`}
    >
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate
                      ${expense.is_paid
                        ? 'line-through text-[#A07060] dark:text-[#C49080]'
                        : 'text-[#1C1210] dark:text-[#FAF3F1]'
                      }`}
        >
          {expense.name}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-[#A07060] dark:text-[#C49080]">{expense.date}</span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded-md font-medium
                        ${CATEGORY_COLORS[expense.category] ?? 'bg-[#F3F4F6] text-[#374151] dark:bg-[#252525] dark:text-[#9CA3AF]'}`}
          >
            {expense.category}
          </span>
          {expense.notes && (
            <span className="text-xs text-[#C4A89E] dark:text-[#8A6A60] truncate max-w-[120px]">
              {expense.notes}
            </span>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-[#1C1210] dark:text-[#FAF3F1]">
          {formatAmount(expense.amount, expense.currency)}
        </p>
        <button
          onClick={() => onToggle(expense.id)}
          disabled={isPending}
          className={`text-xs mt-0.5 disabled:opacity-40 transition-colors
                      ${expense.is_paid
                        ? 'text-[#C4A89E] dark:text-[#8A6A60] hover:text-[#A07060] dark:hover:text-[#C49080]'
                        : 'text-[#C2493A] dark:text-[#F0907F] hover:text-[#A83D30] dark:hover:text-[#E8675A]'
                      }`}
        >
          {expense.is_paid ? 'Undo' : 'Mark paid'}
        </button>
      </div>
    </div>
  )
}

export default function LedgerClient({
  initialExpenses,
  currentUserId,
  currentUserName,
  partnerId,
  partnerName,
  coupleId,
  baseCurrency,
  rates,
}) {
  const [expenses, setExpenses] = useState(initialExpenses)
  const [activeTab, setActiveTab] = useState('owe_me')
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const refetch = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('couple_id', coupleId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (data) setExpenses(data)
  }, [coupleId])

  // Realtime subscription — no server-side filter (more reliable across configs)
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('expenses-' + coupleId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        (payload) => {
          const row = payload.new ?? payload.old
          if (row?.couple_id !== coupleId) return

          if (payload.eventType === 'INSERT') {
            setExpenses(prev =>
              prev.some(e => e.id === payload.new.id)
                ? prev
                : [payload.new, ...prev]
            )
          } else if (payload.eventType === 'UPDATE') {
            setExpenses(prev =>
              prev.map(e => (e.id === payload.new.id ? payload.new : e))
            )
          } else if (payload.eventType === 'DELETE') {
            setExpenses(prev => prev.filter(e => e.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [coupleId])

  async function handleExpenseAdded() {
    setShowForm(false)
    await refetch()
  }

  function handleToggle(expenseId) {
    startTransition(async () => {
      await togglePaid(expenseId)
      await refetch()
    })
  }

  const theyOweMe = expenses.filter(e => e.paid_by_user_id === currentUserId)
  const iOweThem = expenses.filter(e => e.paid_by_user_id === partnerId)
  const activeList = activeTab === 'owe_me' ? theyOweMe : iOweThem

  const sorted = [...activeList].sort((a, b) => {
    if (a.is_paid !== b.is_paid) return a.is_paid ? 1 : -1
    return new Date(b.date) - new Date(a.date) || new Date(b.created_at) - new Date(a.created_at)
  })

  const tabs = [
    { key: 'owe_me', label: 'They owe me', list: theyOweMe },
    { key: 'i_owe', label: 'I owe them', list: iOweThem },
  ]

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">Ledger</h1>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#F0E8E4] dark:bg-[#1E1512] rounded-xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors
                          ${activeTab === tab.key
                            ? 'bg-white dark:bg-[#342420] text-[#1C1210] dark:text-[#FAF3F1] shadow-sm'
                            : 'text-[#A07060] dark:text-[#8A6A60] hover:text-[#1C1210] dark:hover:text-[#FAF3F1]'
                          }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Totals card */}
        <div className="bg-white dark:bg-[#342420] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2C29] p-[18px]">
          <p className="text-[10px] font-semibold text-[#A07060] dark:text-[#C49080] uppercase tracking-wider mb-2">
            {activeTab === 'owe_me'
              ? `${partnerName} owes you`
              : `You owe ${partnerName}`}
          </p>
          <TotalsBadges
            expenses={activeList}
            baseCurrency={baseCurrency}
            rates={rates}
          />
        </div>

        {/* Expense list */}
        <div className="bg-white dark:bg-[#342420] rounded-2xl border border-[#EDE0DC] dark:border-[#3D2C29] px-[18px]">
          {sorted.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[#C4A89E] dark:text-[#8A6A60] text-sm">No expenses here yet</p>
            </div>
          ) : (
            sorted.map(expense => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                onToggle={handleToggle}
                isPending={isPending}
              />
            ))
          )}
        </div>

        <div className="h-20" />
      </div>

      {/* FAB */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#C2493A] dark:bg-[#E8675A] text-white rounded-full
                     text-[28px] flex items-center justify-center z-20 transition-colors
                     shadow-[0_4px_14px_rgba(194,73,58,0.30)] dark:shadow-[0_4px_14px_rgba(232,103,90,0.25)]
                     hover:bg-[#A83D30] dark:hover:bg-[#E8675A]"
          aria-label="Add expense"
        >
          +
        </button>
      )}

      {/* Slide-up form panel */}
      {showForm && (
        <div className="fixed inset-0 z-20 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-[rgba(28,18,16,0.55)] dark:bg-[rgba(10,6,5,0.65)]"
            onClick={() => setShowForm(false)}
          />
          <div className="relative bg-white dark:bg-[#342420] rounded-t-2xl p-5 max-h-[92vh] overflow-y-auto">
            <div className="w-8 h-[3px] rounded-sm bg-[#F5EDE9] dark:bg-[#3D2C29] mx-auto mb-[14px]" />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-semibold text-[#1C1210] dark:text-[#FAF3F1]">Add expense</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-[#A07060] dark:text-[#C49080] hover:text-[#1C1210] dark:hover:text-[#FAF3F1] text-xl leading-none transition-colors"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <AddExpenseForm
              currentUserName={currentUserName}
              partnerId={partnerId}
              partnerName={partnerName}
              onSuccess={handleExpenseAdded}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
