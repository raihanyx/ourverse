'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const VALID_CATEGORIES = ['restaurant', 'travel', 'activity', 'movie', 'other']

export async function addCalendarEntry(prevState, formData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase.from('users').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: 'No couple space found.' }
  const coupleId = profile.couple_id

  const title      = formData.get('title')?.trim()
  const date       = formData.get('date')
  const notes      = formData.get('notes')?.trim() || null
  const isPersonal = formData.get('is_personal') === 'true'
  const category   = formData.get('category') || 'other'

  const errors = {}
  if (!title) errors.title = 'Please enter a title.'
  else if (title.length > 200) errors.title = 'Title must be 200 characters or fewer.'
  if (!date) errors.date = 'Please select a date.'
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.date = 'Invalid date format.'
  if (!VALID_CATEGORIES.includes(category)) errors.category = 'Please select a valid category.'
  if (notes && notes.length > 1000) errors.notes = 'Notes must be 1000 characters or fewer.'
  if (Object.keys(errors).length > 0) return { errors }

  let bucketItemId = null

  // Couple entries auto-create a linked bucket_item
  if (!isPersonal) {
    const { data: bucketItem, error: bucketError } = await supabase
      .from('bucket_items')
      .insert({
        couple_id:        coupleId,
        added_by_user_id: user.id,
        name:             title,
        category,
        notes,
      })
      .select('id')
      .single()

    if (bucketError) return { error: 'Could not create linked bucket item. Please try again.' }
    bucketItemId = bucketItem.id
  }

  const { error: insertError } = await supabase.from('calendar_entries').insert({
    couple_id:      coupleId,
    user_id:        user.id,
    bucket_item_id: bucketItemId,
    title,
    date,
    original_date:  date,
    category,
    notes,
    is_personal:    isPersonal,
  })

  if (insertError) return { error: 'Could not save entry. Please try again.' }

  revalidatePath('/calendar')
  if (!isPersonal) revalidatePath('/bucket')
  return { success: true }
}

export async function markCalendarEntryDone(prevState, formData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const calendarEntryId = formData.get('calendar_entry_id')
  const date            = formData.get('date')
  const note            = formData.get('note')?.trim() || null

  if (!date) return { error: 'Please select a date.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Invalid date format.' }

  const { data: profile } = await supabase
    .from('users')
    .select('couple_id')
    .eq('id', user.id)
    .single()

  if (!profile?.couple_id) return { error: 'No couple space found.' }

  // Fetch entry server-side — verifies ownership, derives all fields from DB
  const { data: entry } = await supabase
    .from('calendar_entries')
    .select('bucket_item_id, title, category, couple_id')
    .eq('id', calendarEntryId)
    .eq('couple_id', profile.couple_id)
    .single()

  if (!entry) return { error: 'Entry not found or you do not have permission.' }

  if (entry.bucket_item_id) {
    const { data: bucketItem } = await supabase
      .from('bucket_items')
      .select('is_done')
      .eq('id', entry.bucket_item_id)
      .single()

    if (bucketItem?.is_done) return { error: 'This entry has already been marked as done.' }

    const { error: updateError } = await supabase
      .from('bucket_items')
      .update({ is_done: true })
      .eq('id', entry.bucket_item_id)

    if (updateError) return { error: 'Could not update item. Please try again.' }
  }

  const { error: memoryError } = await supabase.from('memories').insert({
    couple_id:      entry.couple_id,
    bucket_item_id: entry.bucket_item_id,
    name:           entry.title,
    category:       entry.category,
    date,
    note,
  })

  if (memoryError) return { error: 'Could not save memory. Please try again.' }

  // Move the calendar entry to the actual completion date
  await supabase
    .from('calendar_entries')
    .update({ date })
    .eq('id', calendarEntryId)

  revalidatePath('/calendar')
  revalidatePath('/bucket')
  revalidatePath('/memories')
  return { success: true }
}

export async function deleteCalendarEntry(id) {
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

  // Fetch entry scoped to couple — either partner can delete shared entries
  const { data: entry } = await supabase
    .from('calendar_entries')
    .select('bucket_item_id, is_personal, user_id')
    .eq('id', id)
    .eq('couple_id', profile.couple_id)
    .single()

  if (!entry) return { error: 'Entry not found or you do not have permission to delete it.' }

  // Personal entries can only be deleted by their creator
  if (entry.is_personal && entry.user_id !== user.id) {
    return { error: 'You can only delete your own personal entries.' }
  }

  const { error } = await supabase.from('calendar_entries').delete().eq('id', id)
  if (error) return { error: 'Could not delete entry. Please try again.' }

  // If linked bucket_item exists and is not yet done, delete it too
  if (entry.bucket_item_id) {
    const { data: item } = await supabase
      .from('bucket_items')
      .select('is_done')
      .eq('id', entry.bucket_item_id)
      .single()
    if (item && !item.is_done) {
      await supabase.from('bucket_items').delete().eq('id', entry.bucket_item_id)
    }
  }

  revalidatePath('/calendar')
  revalidatePath('/bucket')
  return { success: true }
}
