import Link from 'next/link'
import { formatAmount } from '@/lib/currency'
import { EXPENSE_CATEGORY_COLORS, EXPENSE_CATEGORY_LABELS } from '@/lib/constants'

const CAT_BOX_BG = {
  food:          'bg-[#FEF3C7] dark:bg-[#3A2A12]',
  transport:     'bg-[#DBEAFE] dark:bg-[#1E2A3A]',
  accommodation: 'bg-[#EDE9FE] dark:bg-[#2D1F3A]',
  shopping:      'bg-[#FCE7F3] dark:bg-[#3A1A2A]',
  other:         'bg-[#F3F4F6] dark:bg-[#252525]',
}

const CAT_DOT_COLOR = {
  food:          'bg-[#D97706] dark:bg-[#F0A840]',
  transport:     'bg-[#2563EB] dark:bg-[#7AB0D8]',
  accommodation: 'bg-[#7C3AED] dark:bg-[#C084FC]',
  shopping:      'bg-[#9D174D] dark:bg-[#F472B6]',
  other:         'bg-[#6B7280] dark:bg-[#9CA3AF]',
}

function formatExpenseDate(dateString) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateString + 'T00:00:00')
  const diffDays = Math.round((date - today) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === -1) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function RecentExpenses({ expenses, userId, partnerName }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#C4A89E] dark:text-[#7A5848] flex-shrink-0">
          Recent
        </span>
        <div className="flex-1 h-px bg-[#EDE0DC] dark:bg-[#3A2418]" />
      </div>

      <div>
        {expenses.map((expense, i) => {
          const isLast = i === expenses.length - 1
          const paidByMe = expense.paid_by_user_id === userId
          const boxBg = CAT_BOX_BG[expense.category] ?? CAT_BOX_BG.other
          const dotColor = CAT_DOT_COLOR[expense.category] ?? CAT_DOT_COLOR.other
          const chipColors = EXPENSE_CATEGORY_COLORS[expense.category] ?? EXPENSE_CATEGORY_COLORS.other
          const chipLabel = EXPENSE_CATEGORY_LABELS[expense.category] ?? 'Other'

          return (
            <Link
              key={expense.id}
              href="/ledger"
              className={`flex items-center gap-3 py-2.5 ${!isLast ? 'border-b border-[#F5EDE9] dark:border-[#261812]' : ''}`}
            >
              <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 ${boxBg}`}>
                <span className={`w-4 h-4 rounded-full opacity-85 block ${dotColor}`} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-[#1C1210] dark:text-[#FAF3F1] mb-0.5 truncate">
                  {expense.name}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] text-[#C4A89E] dark:text-[#7A5848]">
                    {formatExpenseDate(expense.date)}
                  </span>
                  <span className={`text-[10px] font-semibold px-[7px] py-[2px] rounded-[5px] ${chipColors}`}>
                    {chipLabel}
                  </span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-[14px] font-semibold text-[#1C1210] dark:text-[#FAF3F1] tabular-nums">
                  {formatAmount(Number(expense.amount), expense.currency)}
                </p>
                <p className={`text-[11px] mt-0.5 ${paidByMe ? 'text-[#C2493A] dark:text-[#E8675A]' : 'text-[#C4A89E] dark:text-[#7A5848]'}`}>
                  {paidByMe ? 'you paid' : `${partnerName} paid`}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
