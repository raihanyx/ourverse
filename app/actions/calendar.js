'use server'

import { getActionContext } from '@/lib/data/getActionContext'

const VALID_CATEGORIES = ['restaurant', 'travel', 'activity', 'movie', 'other']
const VALID_TYPES      = ['couple', 'personal', 'memory', 'anniversary']

export async function addCalendarEntry(prevState, formData) {
  const ctx = await getActionContext()
  if (ctx.error) return { error: ctx.error }
  const { supabase, user, coupleId } = ctx

  const title    = formData.get('title')?.trim()
  const date     = formData.get('date')
  const notes    = formData.get('notes')?.trim() || null
  const type     = formData.get('type') || 'couple'
  const category = formData.get('category') || 'other'

  const errors = {}
  if (!title) errors.title = 'Please enter a title.'
  else if (title.length > 200) errors.title = 'Title must be 200 characters or fewer.'
  if (!date) errors.date = 'Please select a date.'
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.date = 'Invalid date format.'
  if (!VALID_TYPES.includes(type)) errors.type = 'Please select a valid type.'
  if (!VALID_CATEGORIES.includes(category)) errors.category = 'Please select a valid category.'
  if (notes && notes.length > 1000) errors.notes = 'Notes must be 1000 characters or fewer.'
  if (Object.keys(errors).length > 0) return { errors }

  // Anniversary: write to couples.anniversary_date instead of creating a calendar entry.
  if (type === 'anniversary') {
    const { error: annErr } = await supabase
      .from('couples')
      .update({ anniversary_date: date })
      .eq('id', coupleId)
    if (annErr) return { error: 'Could not save anniversary. Please try again.' }
    return { success: true, data: { kind: 'anniversary', anniversary_date: date } }
  }

  // Memory direct-log from AddEventSheet — past-only enforcement here.
  if (type === 'memory') {
    const today = new Date().toLocaleDateString('en-CA')
    if (date > today) return { error: 'Memory must be on today or a past date.' }

    const { data: memory, error: memErr } = await supabase.from('memories').insert({
      couple_id:      coupleId,
      bucket_item_id: null,
      name:           title,
      category,
      date,
      note:           notes,
      origin:         'direct',
      original_date:  null,
    }).select('*').single()

    if (memErr) return { error: 'Could not save memory. Please try again.' }
    return { success: true, data: { kind: 'memory', memory } }
  }

  // couple / personal types
  const isPersonal = type === 'personal'
  let bucketItemId = null

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

  const { data: insertedEntry, error: insertError } = await supabase.from('calendar_entries').insert({
    couple_id:      coupleId,
    user_id:        user.id,
    bucket_item_id: bucketItemId,
    title,
    date,
    original_date:  date,
    category,
    notes,
    is_personal:    isPersonal,
  }).select('*').single()

  if (insertError) return { error: 'Could not save entry. Please try again.' }

  return { success: true, data: { kind: 'entry', entry: insertedEntry } }
}

export async function markCalendarEntryDone(prevState, formData) {
  const ctx = await getActionContext()
  if (ctx.error) return { error: ctx.error }
  const { supabase, coupleId } = ctx

  const calendarEntryId = formData.get('calendar_entry_id')
  const date            = formData.get('date')
  const note            = formData.get('note')?.trim() || null

  if (!date) return { error: 'Please select a date.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Invalid date format.' }

  const { data: entry } = await supabase
    .from('calendar_entries')
    .select('id, bucket_item_id, title, category, couple_id, is_personal, original_date, date')
    .eq('id', calendarEntryId)
    .eq('couple_id', coupleId)
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

  const { data: insertedMemory, error: memoryError } = await supabase.from('memories').insert({
    couple_id:         entry.couple_id,
    bucket_item_id:    entry.bucket_item_id,
    calendar_entry_id: entry.id,
    name:              entry.title,
    category:          entry.category,
    date,
    note,
    origin:            entry.is_personal ? 'personal_entry' : 'couple_entry',
    original_date:     entry.original_date ?? entry.date,
  }).select('*').single()

  if (memoryError) return { error: 'Could not save memory. Please try again.' }

  await supabase
    .from('calendar_entries')
    .update({ date })
    .eq('id', calendarEntryId)

  return { success: true, data: { memory: insertedMemory, calendarEntryId, date } }
}

export async function deleteCalendarEntry(id) {
  const ctx = await getActionContext()
  if (ctx.error) return { error: ctx.error }
  const { supabase, user, coupleId } = ctx

  const { data: entry } = await supabase
    .from('calendar_entries')
    .select('bucket_item_id, is_personal, user_id')
    .eq('id', id)
    .eq('couple_id', coupleId)
    .single()

  if (!entry) return { error: 'Entry not found or you do not have permission to delete it.' }

  if (entry.is_personal && entry.user_id !== user.id) {
    return { error: 'You can only delete your own personal entries.' }
  }

  const { error } = await supabase.from('calendar_entries').delete().eq('id', id).eq('couple_id', coupleId)
  if (error) return { error: 'Could not delete entry. Please try again.' }

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

  return { success: true }
}
