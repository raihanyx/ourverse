'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { SUPPORTED_CURRENCIES } from '@/lib/currency'

function generateInviteCode() {
  // Omit ambiguous chars: 0/O, 1/I/L
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

export async function createCouple(prevState, formData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated.' }

  const inviteCode = generateInviteCode()

  const { data: couple, error: coupleError } = await supabase
    .from('couples')
    .insert({ invite_code: inviteCode, creator_id: user.id })
    .select('id')
    .single()

  if (coupleError) {
    return { error: 'Could not create couple space. Please try again.' }
  }

  const { error: profileError } = await supabase
    .from('users')
    .update({ couple_id: couple.id })
    .eq('id', user.id)

  if (profileError) {
    return { error: 'Could not link your profile. Please try again.' }
  }

  // Return the code for display — do NOT redirect yet (partner needs to see it)
  return { inviteCode }
}

export async function joinCouple(prevState, formData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated.' }

  const inviteCode = formData.get('inviteCode')?.toUpperCase().trim()

  if (!inviteCode || inviteCode.length !== 6) {
    return { error: 'Please enter a valid 6-character invite code.' }
  }

  const { data: couple, error } = await supabase
    .from('couples')
    .select('id, creator_id')
    .eq('invite_code', inviteCode)
    .single()

  if (error || !couple) {
    return { error: 'Invite code not found. Double-check with your partner.' }
  }

  if (couple.creator_id === user.id) {
    return { error: "That's your own invite code — share it with your partner instead." }
  }

  // Check how many users are already in this couple — max 2
  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('couple_id', couple.id)

  if (count >= 2) {
    return { error: 'This couple space is already full.' }
  }

  const { error: profileError } = await supabase
    .from('users')
    .update({ couple_id: couple.id })
    .eq('id', user.id)

  if (profileError) {
    return { error: 'Could not join couple space. Please try again.' }
  }

  redirect('/dashboard')
}

export async function saveAnniversaryDate(_, dateString) {
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

  if (!profile?.couple_id) return { error: 'No couple space found.' }

  await supabase
    .from('couples')
    .update({ anniversary_date: dateString })
    .eq('id', profile.couple_id)

  revalidatePath('/dashboard')
}

export async function updateBaseCurrency(prevState, formData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const currency = formData.get('base_currency')
  if (!SUPPORTED_CURRENCIES.includes(currency))
    return { error: 'Invalid currency.' }

  const { error } = await supabase
    .from('users')
    .update({ base_currency: currency })
    .eq('id', user.id)

  if (error) return { error: 'Could not update currency.' }

  revalidatePath('/dashboard')
  revalidatePath('/ledger')
  return { success: true }
}
