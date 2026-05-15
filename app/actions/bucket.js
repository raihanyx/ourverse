'use server'

import { getActionContext } from '@/lib/data/getActionContext'

const VALID_CATEGORIES = ['restaurant', 'travel', 'activity', 'movie', 'other']

export async function addBucketItem(prevState, formData) {
  const ctx = await getActionContext()
  if (ctx.error) return { error: ctx.error }
  const { supabase, user, coupleId } = ctx

  const name = formData.get('name')?.trim()
  const category = formData.get('category')
  const notes = formData.get('notes')?.trim() || null

  if (!name) return { errors: { name: 'Please enter a name.' } }
  if (name.length > 200) return { errors: { name: 'Name must be 200 characters or fewer.' } }
  if (notes && notes.length > 1000) return { errors: { notes: 'Notes must be 1000 characters or fewer.' } }
  if (!VALID_CATEGORIES.includes(category)) return { error: 'Please select a valid category.' }

  const { data: inserted, error: insertError } = await supabase.from('bucket_items').insert({
    couple_id: coupleId,
    added_by_user_id: user.id,
    name,
    category,
    notes,
  }).select('*').single()

  if (insertError) return { error: 'Could not save item. Please try again.' }

  return { success: true, data: inserted }
}

export async function markAsDone(prevState, formData) {
  const ctx = await getActionContext()
  if (ctx.error) return { error: ctx.error }
  const { supabase, coupleId } = ctx

  const bucketItemId = formData.get('bucket_item_id')
  const date = formData.get('date')
  const note = formData.get('note')?.trim() || null

  if (!date) return { error: 'Please select a date.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Invalid date format.' }
  if (note && note.length > 2000) return { error: 'Note must be 2000 characters or fewer.' }

  const { data: bucketItem } = await supabase
    .from('bucket_items')
    .select('name, category, is_done')
    .eq('id', bucketItemId)
    .eq('couple_id', coupleId)
    .single()

  if (!bucketItem) return { error: 'Item not found.' }
  if (bucketItem.is_done) return { error: 'This item is already marked as done.' }

  const { count: linkedCount } = await supabase
    .from('calendar_entries')
    .select('id', { count: 'exact', head: true })
    .eq('bucket_item_id', bucketItemId)
    .eq('couple_id', coupleId)

  if (linkedCount && linkedCount > 0) {
    return { error: 'This item is scheduled on the calendar. Mark it done from the calendar instead.' }
  }

  const { error: updateError } = await supabase
    .from('bucket_items')
    .update({ is_done: true })
    .eq('id', bucketItemId)
    .eq('couple_id', coupleId)

  if (updateError) return { error: 'Could not update item. Please try again.' }

  const { data: insertedMemory, error: memoryError } = await supabase.from('memories').insert({
    couple_id:      coupleId,
    bucket_item_id: bucketItemId,
    name:           bucketItem.name,
    category:       bucketItem.category,
    date,
    note,
    origin:         'bucket_item',
    original_date:  null,
  }).select('*').single()

  if (memoryError) return { error: 'Could not save memory. Please try again.' }

  return { success: true, data: insertedMemory }
}

// Undo / move-to-bucket. Routes by memory.origin:
//   bucket_item    → unset bucket_items.is_done, delete memory
//   couple_entry   → unset bucket_items.is_done, restore calendar entry to original_date, delete memory
//   personal_entry → restore calendar entry to original_date, delete memory
//   direct         → rejected (direct-logged memories have no plan to return to)
export async function bulkUndoDone(memoryIds) {
  const ctx = await getActionContext()
  if (ctx.error) return { error: ctx.error }
  const { supabase, coupleId } = ctx

  if (!Array.isArray(memoryIds) || memoryIds.length === 0) return { error: 'No items selected.' }
  if (memoryIds.length > 500) return { error: 'Too many items selected.' }

  const { data: memories } = await supabase
    .from('memories')
    .select('id, bucket_item_id, calendar_entry_id, origin, original_date')
    .in('id', memoryIds)
    .eq('couple_id', coupleId)

  if (!memories?.length) return { error: 'Memories not found.' }

  if (memories.some(m => m.origin === 'direct')) {
    return { error: 'Direct-logged memories can\'t be moved to the bucket list.' }
  }

  const bucketIdsToRestore = memories
    .filter(m => m.origin === 'bucket_item' || m.origin === 'couple_entry')
    .map(m => m.bucket_item_id)
    .filter(Boolean)

  if (bucketIdsToRestore.length) {
    const { error: bErr } = await supabase
      .from('bucket_items')
      .update({ is_done: false })
      .in('id', bucketIdsToRestore)
      .eq('couple_id', coupleId)
    if (bErr) return { error: 'Could not restore bucket items.' }
  }

  const calRestores = memories
    .filter(m => (m.origin === 'couple_entry' || m.origin === 'personal_entry') && m.calendar_entry_id && m.original_date)
  if (calRestores.length) {
    await Promise.all(
      calRestores.map(m =>
        supabase
          .from('calendar_entries')
          .update({ date: m.original_date })
          .eq('id', m.calendar_entry_id)
      )
    )
  }

  const { error: dErr } = await supabase
    .from('memories')
    .delete()
    .in('id', memoryIds)
    .eq('couple_id', coupleId)
  if (dErr) return { error: 'Could not delete memories.' }

  return { success: true }
}

export async function deleteBucketItem(id) {
  const ctx = await getActionContext()
  if (ctx.error) return { error: ctx.error }
  const { supabase, coupleId } = ctx

  const { error } = await supabase.from('bucket_items').delete().eq('id', id).eq('couple_id', coupleId)
  if (error) return { error: 'Could not delete item.' }

  return { success: true }
}

export async function bulkDeleteBucketItems(ids) {
  const ctx = await getActionContext()
  if (ctx.error) return { error: ctx.error }
  const { supabase, coupleId } = ctx

  if (!Array.isArray(ids) || ids.length === 0) return { error: 'No items selected.' }
  if (ids.length > 500) return { error: 'Too many items selected.' }

  const { error } = await supabase.from('bucket_items').delete().in('id', ids).eq('couple_id', coupleId)
  if (error) return { error: 'Could not delete items.' }

  return { success: true }
}

export async function addDirectMemory(prevState, formData) {
  const ctx = await getActionContext()
  if (ctx.error) return { error: ctx.error }
  const { supabase, coupleId } = ctx

  const name     = formData.get('name')?.trim()
  const category = formData.get('category')
  const date     = formData.get('date')
  const note     = formData.get('note')?.trim() || null

  if (!name) return { errors: { name: 'Please enter a name.' } }
  if (name.length > 200) return { errors: { name: 'Name must be 200 characters or fewer.' } }
  if (!VALID_CATEGORIES.includes(category)) return { error: 'Please select a valid category.' }
  if (!date) return { error: 'Please provide a date.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Invalid date format.' }
  if (note && note.length > 2000) return { error: 'Note must be 2000 characters or fewer.' }

  const { data: insertedMemory, error: memoryError } = await supabase.from('memories').insert({
    couple_id:      coupleId,
    bucket_item_id: null,
    name,
    category,
    date,
    note,
    origin:         'direct',
    original_date:  null,
  }).select('*').single()

  if (memoryError) return { error: 'Could not save memory. Please try again.' }

  return { success: true, data: insertedMemory }
}

export async function bulkDeleteMemories(ids) {
  const ctx = await getActionContext()
  if (ctx.error) return { error: ctx.error }
  const { supabase, coupleId } = ctx

  if (!Array.isArray(ids) || ids.length === 0) return { error: 'No items selected.' }
  if (ids.length > 500) return { error: 'Too many items selected.' }

  const { data: memories } = await supabase
    .from('memories')
    .select('id, bucket_item_id')
    .in('id', ids)
    .eq('couple_id', coupleId)

  if (!memories?.length) return { error: 'Memories not found.' }

  const { error: deleteMemoriesError } = await supabase
    .from('memories')
    .delete()
    .in('id', ids)
    .eq('couple_id', coupleId)

  if (deleteMemoriesError) return { error: 'Could not delete memories.' }

  const bucketItemIds = memories.map(m => m.bucket_item_id).filter(Boolean)
  if (bucketItemIds.length > 0) {
    await supabase.from('calendar_entries').delete().in('bucket_item_id', bucketItemIds)
    await supabase.from('bucket_items').delete().in('id', bucketItemIds)
  }

  return { success: true }
}
