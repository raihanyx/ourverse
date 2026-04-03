'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { SUPPORTED_CURRENCIES } from '@/lib/currency'

const VALID_CURRENCIES = SUPPORTED_CURRENCIES
const VALID_CATEGORIES = ['food', 'transport', 'accommodation', 'shopping', 'other']

export async function addExpense(prevState, formData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const name = formData.get('name')?.trim()
  const amount = parseFloat(formData.get('amount'))
  const currency = formData.get('currency')
  const category = formData.get('category')
  const date = formData.get('date')
  const notes = formData.get('notes')?.trim() || null
  const whoPaid = formData.get('who_paid') // 'me' | 'partner'

  // Field-level validation — return per-field errors so the form can show them inline
  const errors = {}
  if (!name) errors.name = 'Please enter a name for this expense.'
  if (!formData.get('amount') || formData.get('amount') === '') errors.amount = 'Please enter an amount.'
  else if (isNaN(amount) || amount <= 0) errors.amount = 'Amount must be greater than zero.'
  if (!date) errors.date = 'Please select a date.'
  if (Object.keys(errors).length > 0) return { errors }

  if (!VALID_CURRENCIES.includes(currency)) return { error: 'Please select a valid currency.' }
  if (!VALID_CATEGORIES.includes(category)) return { error: 'Please select a valid category.' }

  const { data: profile } = await supabase
    .from('users')
    .select('couple_id')
    .eq('id', user.id)
    .single()

  if (!profile?.couple_id) return { error: 'No couple linked to your account.' }

  // Look up the real partner from DB — never trust partner_id from the client
  let paidByUserId = user.id
  if (whoPaid === 'partner') {
    const { data: partnerProfile } = await supabase
      .from('users')
      .select('id')
      .eq('couple_id', profile.couple_id)
      .neq('id', user.id)
      .single()
    if (partnerProfile?.id) paidByUserId = partnerProfile.id
  }

  const { error: insertError } = await supabase.from('expenses').insert({
    couple_id: profile.couple_id,
    paid_by_user_id: paidByUserId,
    name,
    amount,
    currency,
    category,
    is_paid: false,
    date,
    notes,
  })

  if (insertError) return { error: 'Could not save expense. Please try again.' }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function bulkSetPaid(ids, isPaid) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  if (!Array.isArray(ids) || ids.length === 0) return { error: 'No items selected.' }

  const { data: profile } = await supabase
    .from('users')
    .select('couple_id')
    .eq('id', user.id)
    .single()

  if (!profile?.couple_id) return { error: 'No couple linked to your account.' }

  const { error } = await supabase
    .from('expenses')
    .update({ is_paid: isPaid })
    .in('id', ids)
    .eq('couple_id', profile.couple_id)

  if (error) return { error: 'Could not update expenses.' }

  revalidatePath('/ledger/paid')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function bulkDeleteExpenses(ids) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  if (!Array.isArray(ids) || ids.length === 0) return { error: 'No items selected.' }

  const { data: profile } = await supabase
    .from('users')
    .select('couple_id')
    .eq('id', user.id)
    .single()

  if (!profile?.couple_id) return { error: 'No couple linked to your account.' }

  const { error } = await supabase
    .from('expenses')
    .delete()
    .in('id', ids)
    .eq('couple_id', profile.couple_id)

  if (error) return { error: 'Could not delete expenses.' }

  revalidatePath('/ledger')
  revalidatePath('/ledger/paid')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function togglePaid(expenseId) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('users')
    .select('couple_id')
    .eq('id', user.id)
    .single()

  if (!profile?.couple_id) return { error: 'No couple linked to your account.' }

  const { data: expense } = await supabase
    .from('expenses')
    .select('is_paid')
    .eq('id', expenseId)
    .eq('couple_id', profile.couple_id)
    .single()

  if (!expense) return { error: 'Expense not found.' }

  const { error } = await supabase
    .from('expenses')
    .update({ is_paid: !expense.is_paid })
    .eq('id', expenseId)
    .eq('couple_id', profile.couple_id)

  if (error) return { error: 'Could not update expense.' }

  revalidatePath('/ledger/paid')
  revalidatePath('/dashboard')
  return { success: true }
}
