'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AuthState } from '@/lib/types'

function field(formData: FormData, key: string): string {
  const v = formData.get(key)
  return typeof v === 'string' ? v.trim() : ''
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = field(formData, 'email')
  const password = String(formData.get('password') ?? '')
  if (!email || !password) return { error: 'Enter your email and password.', message: null, email }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message, message: null, email }
  redirect('/')
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = field(formData, 'email')
  const password = String(formData.get('password') ?? '')
  const fullName = field(formData, 'full_name')
  if (!email || !password) return { error: 'Enter an email and password.', message: null, email }
  if (password.length < 8) return { error: 'Use a password of at least 8 characters.', message: null, email }

  const h = await headers()
  const origin = h.get('origin') ?? `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: `${origin}/auth/callback` },
  })
  if (error) return { error: error.message, message: null, email }

  // If email confirmation is turned off in Supabase, the user is signed in now.
  if (data.session) redirect('/')
  return { error: null, message: 'Check your inbox to confirm your email, then sign in.', email }
}
