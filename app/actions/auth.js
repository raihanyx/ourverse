'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(prevState, formData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function signup(prevState, formData) {
  const supabase = await createClient()

  const name = formData.get('name')?.trim()
  const email = formData.get('email')?.trim()
  const password = formData.get('password')

  if (!name) return { error: 'Please enter your name.' }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/onboarding')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
