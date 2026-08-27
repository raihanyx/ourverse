'use server'

import { after } from 'next/server'
import { getActionContext } from '@/lib/data/getActionContext'
import { notifyPartner } from '@/lib/push/send'

const MAX_NAME = 120

function normalize(value) {
  return String(value ?? '').trim().toLowerCase()
}

function pushOnAppear(supabase, user, coupleId, item) {
  after(() =>
    notifyPartner(supabase, user.id, coupleId, (actorName) => ({
      title: 'Ourverse',
      body: `${actorName} added ${item.name} to the shopping list`,
      url: '/shopping',
      tag: `shopping-${item.id}`,
    }))
  )
}

/**
 * Add an item to the list.
 * Takes a plain string, not formData — the client owns a single always-visible
 * input rather than a form, so there is nothing to serialise.
 *
 * Bought rows are permanent history and are never reused: adding a name that
 * was bought before inserts a NEW row, so "we bought this three times" stays
 * visible instead of being erased by a restock. The client warns about a recent
 * purchase before you commit.
 *
 * Only OPEN rows collapse, so both partners noticing the same thing can't
 * produce two live entries. The client checks this too — this is the
 * authoritative check for the case where both add at the same moment.
 */
export async function addShoppingItem(name) {
  const ctx = await getActionContext()
  if (ctx.error) return { error: ctx.error }
  const { supabase, user, coupleId } = ctx

  const trimmed = typeof name === 'string' ? name.trim() : ''
  if (!trimmed) return { error: 'Please enter something to buy.' }
  if (trimmed.length > MAX_NAME) return { error: `Keep it to ${MAX_NAME} characters or fewer.` }

  // Match on the name in JS rather than with ilike: a name containing %, _ or *
  // would otherwise be read as LIKE pattern syntax and match the wrong rows.
  const { data: openRows } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('is_bought', false)
    .limit(1000)

  const target = normalize(trimmed)
  const alreadyOpen = (openRows ?? []).find(row => normalize(row.name) === target)

  // Already live on the list. This one is never waved through — two identical
  // open rows is not what anyone wants. Only the recent-purchase warning is
  // something the client can let you override.
  if (alreadyOpen) {
    return { success: true, data: alreadyOpen, duplicate: true }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('shopping_items')
    .insert({
      couple_id: coupleId,
      added_by_user_id: user.id,
      name: trimmed,
      sort_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (insertError) return { error: 'Could not add that. Please try again.' }

  pushOnAppear(supabase, user, coupleId, inserted)
  return { success: true, data: inserted }
}

/** Tick an item off, or undo a mistap. */
export async function setShoppingItemBought(id, isBought) {
  const ctx = await getActionContext()
  if (ctx.error) return { error: ctx.error }
  const { supabase, user, coupleId } = ctx

  if (!id) return { error: 'Item not found.' }

  const patch = isBought
    ? {
        is_bought: true,
        bought_at: new Date().toISOString(),
        bought_by_user_id: user.id,
      }
    : {
        // Undoing a mistap. The item was never really bought, so it keeps its
        // original sort position instead of jumping to the top of the list.
        is_bought: false,
        bought_at: null,
        bought_by_user_id: null,
      }

  const { data: updated, error: updateError } = await supabase
    .from('shopping_items')
    .update(patch)
    .eq('id', id)
    .eq('couple_id', coupleId)
    .select('*')
    .single()

  if (updateError || !updated) return { error: 'Could not update that. Please try again.' }

  // Silent both ways. Ticking off would be a pile of pings on a full shop, and
  // un-ticking is someone correcting their own mistap.
  return { success: true, data: updated }
}

export async function bulkDeleteShoppingItems(ids) {
  const ctx = await getActionContext()
  if (ctx.error) return { error: ctx.error }
  const { supabase, coupleId } = ctx

  if (!Array.isArray(ids) || ids.length === 0) return { error: 'No items selected.' }
  if (ids.length > 500) return { error: 'Too many items selected.' }

  const { error: deleteError } = await supabase
    .from('shopping_items')
    .delete()
    .in('id', ids)
    .eq('couple_id', coupleId)

  if (deleteError) return { error: 'Could not delete. Please try again.' }

  return { success: true }
}

/** Empty the Bought section. Open items are untouched. */
export async function clearBoughtItems() {
  const ctx = await getActionContext()
  if (ctx.error) return { error: ctx.error }
  const { supabase, coupleId } = ctx

  const { error: deleteError } = await supabase
    .from('shopping_items')
    .delete()
    .eq('couple_id', coupleId)
    .eq('is_bought', true)

  if (deleteError) return { error: 'Could not clear. Please try again.' }

  return { success: true }
}
