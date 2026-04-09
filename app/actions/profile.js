'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateName(prevState, formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const name = formData.get('name')?.trim()
  if (!name) return { errors: { name: 'Name cannot be empty.' } }
  if (name.length > 200) return { errors: { name: 'Name must be 200 characters or fewer.' } }

  const { error } = await supabase
    .from('users')
    .update({ name })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/profile')
  revalidatePath('/dashboard')
  revalidatePath('/ledger')
  return { success: true, name }
}
