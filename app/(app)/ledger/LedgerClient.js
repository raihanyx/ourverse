'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { togglePaid } from '@/app/actions/expenses'
import { formatAmount, sumByCurrency } from '@/lib/currency'
import { computeUnifiedTotal, getRateLines } from '@/lib/exchangeRates'
import AddExpenseForm from './AddExpenseForm'

const CATEGORY_COLORS = {
  food:          'bg-amber-50 text-amber-700',
  transport:     'bg-blue-50 text-blue-700',
  accommodation: 'bg-indigo-50 text-indigo-700',
  shopping:      'bg-pink-50 text-pink-700',
  other:         'bg-gray-100 text-gray-500',
}

function TotalsBadges({ expenses, baseCurrency, rates }) {
  const unpaid = expenses.filter(e => !e.is_paid)
  const totals = sumByCurrency(unpaid)
  const entries = Object.entries(totals).filter(([, v]) => v > 0)

  const unifiedTotal = computeUnifiedTotal(totals, baseCurrency, rates)
  const rateLines = getRateLines(baseCurrency, rates)

  if (entries.length === 0) {
    return <p className="text-sm text-gray-400">Nothing owed</p>
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {entries.map(([currency, amount]) => (
          <span
            key={currency}
            className="text-sm font-semibold text-violet-700 bg-violet-50 px-3 py-1 rounded-full"
          >
            {formatAmount(amount, currency)}
          </span>
        ))}
      </div>

      {/* Unified total in base currency */}
      {rates && unifiedTotal !== null && unifiedTotal > 0 && (
        <p className="text-xs text-gray-400 mt-2">
          ≈ {formatAmount(unifiedTotal, baseCurrency)} at current rates
        </p>
      )}

      {/* Rate transparency */}
      {rates && rateLines.length > 0 && (
        <p className="text-xs text-gray-300 mt-1 leading-relaxed">
          {rateLines.join(' · ')}
        </p>
      )}
    </div>
  )
}

function ExpenseRow({ expense, onToggle, isPending }) {
  return (
    <div
      className={`flex items-start gap-3 py-3.5 border-b border-gray-50 last:border-0
                  transition-opacity ${expense.is_paid ? 'opacity-40' : ''}`}
    >
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium text-gray-900 truncate
                      ${expense.is_paid ? 'line-through text-gray-400' : ''}`}
        >
          {expense.name}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-gray-400">{expense.date}</span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded-md font-medium
                        ${CATEGORY_COLORS[expense.category] ?? 'bg-gray-100 text-gray-500'}`}
          >
            {expense.category}
          </span>
          {expense.notes && (
            <span className="text-xs text-gray-300 truncate max-w-[120px]">
              {expense.notes}
            </span>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-gray-900">
          {formatAmount(expense.amount, expense.currency)}
        </p>
        <button
          onClick={() => onToggle(expense.id)}
          disabled={isPending}
          className="text-xs text-violet-500 hover:text-violet-700 mt-0.5
                     disabled:opacity-40 transition-colors"
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
          <h1 className="text-2xl font-semibold text-gray-900">Ledger</h1>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors
                          ${activeTab === tab.key
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                          }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Totals card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5">
          {sorted.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-gray-300 text-sm">No expenses here yet</p>
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
          className="fixed bottom-6 right-6 w-14 h-14 bg-violet-600 text-white rounded-full
                     text-3xl shadow-lg shadow-violet-200 hover:bg-violet-700 active:bg-violet-800
                     flex items-center justify-center transition-colors z-20"
          aria-label="Add expense"
        >
          +
        </button>
      )}

      {/* Slide-up form panel */}
      {showForm && (
        <div className="fixed inset-0 z-20 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowForm(false)}
          />
          <div className="relative bg-white rounded-t-2xl p-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Add expense</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
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
