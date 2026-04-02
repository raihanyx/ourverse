'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const VALID_CATEGORIES = ['restaurant', 'travel', 'activity', 'movie', 'other']

export async function addBucketItem(prevState, formData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const name = formData.get('name')?.trim()
  const category = formData.get('category')
  const notes = formData.get('notes')?.trim() || null
  const coupleId = formData.get('couple_id')
  const addedByUserId = formData.get('added_by_user_id')

  if (!name) return { errors: { name: 'Please enter a name.' } }
  if (!VALID_CATEGORIES.includes(category)) return { error: 'Please select a valid category.' }

  const { error: insertError } = await supabase.from('bucket_items').insert({
    couple_id: coupleId,
    added_by_user_id: addedByUserId,
    name,
    category,
    notes,
  })

  if (insertError) return { error: 'Could not save item. Please try again.' }

  return { success: true }
}

export async function markAsDone(prevState, formData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const bucketItemId = formData.get('bucket_item_id')
  const name = formData.get('name')
  const category = formData.get('category')
  const date = formData.get('date')
  const note = formData.get('note')?.trim() || null
  const coupleId = formData.get('couple_id')

  if (!date) return { error: 'Please select a date.' }

  const { error: updateError } = await supabase
    .from('bucket_items')
    .update({ is_done: true })
    .eq('id', bucketItemId)

  if (updateError) return { error: 'Could not update item. Please try again.' }

  const { error: memoryError } = await supabase.from('memories').insert({
    couple_id: coupleId,
    bucket_item_id: bucketItemId,
    name,
    category,
    date,
    note,
  })

  if (memoryError) return { error: 'Could not save memory. Please try again.' }

  // Move any linked calendar entry to the actual completion date
  await supabase
    .from('calendar_entries')
    .update({ date })
    .eq('bucket_item_id', bucketItemId)

  return { success: true }
}

export async function bulkMarkDone(ids, coupleId) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!Array.isArray(ids) || ids.length === 0) return { error: 'No items selected.' }

  const { data: bucketItems } = await supabase
    .from('bucket_items')
    .select('id, name, category')
    .in('id', ids)
    .eq('is_done', false)

  if (!bucketItems?.length) return { error: 'Items not found.' }

  const today = new Date().toISOString().slice(0, 10)

  const { error: updateError } = await supabase
    .from('bucket_items')
    .update({ is_done: true })
    .in('id', ids)

  if (updateError) return { error: 'Could not update items.' }

  const memories = bucketItems.map(item => ({
    couple_id: coupleId,
    bucket_item_id: item.id,
    name: item.name,
    category: item.category,
    date: today,
    note: null,
  }))

  const { error: memoryError } = await supabase.from('memories').insert(memories)
  if (memoryError) return { error: 'Could not save memories.' }

  return { success: true }
}

export async function bulkUndoDone(memoryIds) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!Array.isArray(memoryIds) || memoryIds.length === 0) return { error: 'No items selected.' }

  const { data: memories } = await supabase
    .from('memories')
    .select('id, bucket_item_id')
    .in('id', memoryIds)

  if (!memories?.length) return { error: 'Memories not found.' }

  const bucketItemIds = memories.map(m => m.bucket_item_id)

  const { error: updateError } = await supabase
    .from('bucket_items')
    .update({ is_done: false })
    .in('id', bucketItemIds)

  if (updateError) return { error: 'Could not update bucket items.' }

  const { error: deleteError } = await supabase
    .from('memories')
    .delete()
    .in('id', memoryIds)

  if (deleteError) return { error: 'Could not delete memories.' }

  // Restore each linked calendar entry back to its original planned date
  for (const bucketItemId of bucketItemIds) {
    const { data: calEntry } = await supabase
      .from('calendar_entries')
      .select('id, original_date')
      .eq('bucket_item_id', bucketItemId)
      .maybeSingle()
    if (calEntry?.original_date) {
      await supabase
        .from('calendar_entries')
        .update({ date: calEntry.original_date })
        .eq('id', calEntry.id)
    }
  }

  revalidatePath('/calendar')
  return { success: true }
}

export async function deleteBucketItem(id) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase.from('bucket_items').delete().eq('id', id)
  if (error) return { error: 'Could not delete item.' }

  return { success: true }
}

export async function bulkDeleteBucketItems(ids) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!Array.isArray(ids) || ids.length === 0) return { error: 'No items selected.' }

  const { error } = await supabase.from('bucket_items').delete().in('id', ids)
  if (error) return { error: 'Could not delete items.' }

  return { success: true }
}

export async function bulkDeleteMemories(ids) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!Array.isArray(ids) || ids.length === 0) return { error: 'No items selected.' }

  const { data: memories } = await supabase
    .from('memories')
    .select('id, bucket_item_id')
    .in('id', ids)

  if (!memories?.length) return { error: 'Memories not found.' }

  const { error: deleteMemoriesError } = await supabase
    .from('memories')
    .delete()
    .in('id', ids)

  if (deleteMemoriesError) return { error: 'Could not delete memories.' }

  const bucketItemIds = memories.map(m => m.bucket_item_id).filter(Boolean)
  if (bucketItemIds.length > 0) {
    await supabase.from('bucket_items').delete().in('id', bucketItemIds)
  }

  return { success: true }
}
