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

  const { data: profile } = await supabase
    .from('users')
    .select('couple_id')
    .eq('id', user.id)
    .single()

  if (!profile?.couple_id) return { error: 'No couple space found.' }

  const name = formData.get('name')?.trim()
  const category = formData.get('category')
  const notes = formData.get('notes')?.trim() || null

  if (!name) return { errors: { name: 'Please enter a name.' } }
  if (name.length > 200) return { errors: { name: 'Name must be 200 characters or fewer.' } }
  if (notes && notes.length > 1000) return { errors: { notes: 'Notes must be 1000 characters or fewer.' } }
  if (!VALID_CATEGORIES.includes(category)) return { error: 'Please select a valid category.' }

  const { error: insertError } = await supabase.from('bucket_items').insert({
    couple_id: profile.couple_id,
    added_by_user_id: user.id,
    name,
    category,
    notes,
  })

  if (insertError) return { error: 'Could not save item. Please try again.' }

  revalidatePath('/bucket')
  return { success: true }
}

export async function markAsDone(prevState, formData) {
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

  const bucketItemId = formData.get('bucket_item_id')
  const date = formData.get('date')
  const note = formData.get('note')?.trim() || null

  if (!date) return { error: 'Please select a date.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Invalid date format.' }
  if (note && note.length > 2000) return { error: 'Note must be 2000 characters or fewer.' }

  // Fetch name/category/is_done from DB — never trust form data for stored values
  const { data: bucketItem } = await supabase
    .from('bucket_items')
    .select('name, category, is_done')
    .eq('id', bucketItemId)
    .eq('couple_id', profile.couple_id)
    .single()

  if (!bucketItem) return { error: 'Item not found.' }
  if (bucketItem.is_done) return { error: 'This item is already marked as done.' }

  const { error: updateError } = await supabase
    .from('bucket_items')
    .update({ is_done: true })
    .eq('id', bucketItemId)
    .eq('couple_id', profile.couple_id)

  if (updateError) return { error: 'Could not update item. Please try again.' }

  const { error: memoryError } = await supabase.from('memories').insert({
    couple_id: profile.couple_id,
    bucket_item_id: bucketItemId,
    name: bucketItem.name,
    category: bucketItem.category,
    date,
    note,
  })

  if (memoryError) return { error: 'Could not save memory. Please try again.' }

  revalidatePath('/bucket')
  revalidatePath('/memories')
  revalidatePath('/calendar')

  // Move any linked calendar entry to the actual completion date
  await supabase
    .from('calendar_entries')
    .update({ date })
    .eq('bucket_item_id', bucketItemId)
    .eq('couple_id', profile.couple_id)

  return { success: true }
}

export async function bulkMarkDone(ids, date) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!Array.isArray(ids) || ids.length === 0) return { error: 'No items selected.' }
  if (ids.length > 500) return { error: 'Too many items selected.' }

  const { data: profile } = await supabase
    .from('users')
    .select('couple_id')
    .eq('id', user.id)
    .single()

  if (!profile?.couple_id) return { error: 'No couple space found.' }

  const { data: bucketItems } = await supabase
    .from('bucket_items')
    .select('id, name, category')
    .in('id', ids)
    .eq('couple_id', profile.couple_id)
    .eq('is_done', false)

  if (!bucketItems?.length) return { error: 'Items not found.' }

  const today = date || new Date().toISOString().slice(0, 10)

  const { error: updateError } = await supabase
    .from('bucket_items')
    .update({ is_done: true })
    .in('id', ids)
    .eq('couple_id', profile.couple_id)

  if (updateError) return { error: 'Could not update items.' }

  const memories = bucketItems.map(item => ({
    couple_id: profile.couple_id,
    bucket_item_id: item.id,
    name: item.name,
    category: item.category,
    date: today,
    note: null,
  }))

  const { error: memoryError } = await supabase.from('memories').insert(memories)
  if (memoryError) return { error: 'Could not save memories.' }

  // Move any linked calendar entries to the actual completion date
  await supabase
    .from('calendar_entries')
    .update({ date: today })
    .in('bucket_item_id', ids)
    .eq('couple_id', profile.couple_id)

  revalidatePath('/calendar')
  revalidatePath('/bucket')
  revalidatePath('/memories')
  return { success: true }
}

export async function bulkUndoDone(memoryIds) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!Array.isArray(memoryIds) || memoryIds.length === 0) return { error: 'No items selected.' }
  if (memoryIds.length > 500) return { error: 'Too many items selected.' }

  const { data: profile } = await supabase.from('users').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: 'No couple space found.' }

  const { data: memories } = await supabase
    .from('memories')
    .select('id, bucket_item_id')
    .in('id', memoryIds)
    .eq('couple_id', profile.couple_id)

  if (!memories?.length) return { error: 'Memories not found.' }

  const bucketItemIds = memories.map(m => m.bucket_item_id)

  const { error: updateError } = await supabase
    .from('bucket_items')
    .update({ is_done: false })
    .in('id', bucketItemIds)
    .eq('couple_id', profile.couple_id)

  if (updateError) return { error: 'Could not update bucket items.' }

  const { error: deleteError } = await supabase
    .from('memories')
    .delete()
    .in('id', memoryIds)
    .eq('couple_id', profile.couple_id)

  if (deleteError) return { error: 'Could not delete memories.' }

  // Restore linked calendar entries to their original planned dates
  const { data: calEntries } = await supabase
    .from('calendar_entries')
    .select('id, original_date')
    .in('bucket_item_id', bucketItemIds)
    .not('original_date', 'is', null)

  if (calEntries?.length) {
    await Promise.all(
      calEntries.map(entry =>
        supabase
          .from('calendar_entries')
          .update({ date: entry.original_date })
          .eq('id', entry.id)
      )
    )
  }

  revalidatePath('/calendar')
  revalidatePath('/bucket')
  revalidatePath('/memories')
  return { success: true }
}

export async function deleteBucketItem(id) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase.from('users').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: 'No couple space found.' }

  const { error } = await supabase.from('bucket_items').delete().eq('id', id).eq('couple_id', profile.couple_id)
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
  if (ids.length > 500) return { error: 'Too many items selected.' }

  const { data: profile } = await supabase.from('users').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: 'No couple space found.' }

  const { error } = await supabase.from('bucket_items').delete().in('id', ids).eq('couple_id', profile.couple_id)
  if (error) return { error: 'Could not delete items.' }

  return { success: true }
}

export async function addDirectMemory(prevState, formData) {
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

  const { data: bucketItem, error: bucketError } = await supabase
    .from('bucket_items')
    .insert({
      couple_id:        profile.couple_id,
      added_by_user_id: user.id,
      name,
      category,
      is_done:          true,
    })
    .select('id')
    .single()

  if (bucketError) return { error: 'Could not save memory. Please try again.' }

  const { error: memoryError } = await supabase.from('memories').insert({
    couple_id:      profile.couple_id,
    bucket_item_id: bucketItem.id,
    name,
    category,
    date,
    note,
  })

  if (memoryError) return { error: 'Could not save memory. Please try again.' }

  revalidatePath('/calendar')
  revalidatePath('/memories')
  revalidatePath('/bucket')
  return { success: true }
}

export async function bulkDeleteMemories(ids) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!Array.isArray(ids) || ids.length === 0) return { error: 'No items selected.' }
  if (ids.length > 500) return { error: 'Too many items selected.' }

  const { data: profile } = await supabase.from('users').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: 'No couple space found.' }

  const { data: memories } = await supabase
    .from('memories')
    .select('id, bucket_item_id')
    .in('id', ids)
    .eq('couple_id', profile.couple_id)

  if (!memories?.length) return { error: 'Memories not found.' }

  const { error: deleteMemoriesError } = await supabase
    .from('memories')
    .delete()
    .in('id', ids)
    .eq('couple_id', profile.couple_id)

  if (deleteMemoriesError) return { error: 'Could not delete memories.' }

  const bucketItemIds = memories.map(m => m.bucket_item_id).filter(Boolean)
  if (bucketItemIds.length > 0) {
    await supabase.from('calendar_entries').delete().in('bucket_item_id', bucketItemIds)
    await supabase.from('bucket_items').delete().in('id', bucketItemIds)
  }

  revalidatePath('/calendar')
  revalidatePath('/bucket')
  return { success: true }
}
