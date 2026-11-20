'use client'

import { useActionState, useState } from 'react'
import { signIn, signUp } from './actions'
import type { AuthState } from '@/lib/types'
import { SubmitButton } from '@/components/ConfirmButton'

const initial: AuthState = { error: null, message: null, email: '' }

export function LoginForm({ urlError }: { urlError?: string }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [signInState, signInAction] = useActionState(signIn, initial)
  const [signUpState, signUpAction] = useActionState(signUp, initial)
  const state = mode === 'signin' ? signInState : signUpState
  const error = state.error ?? (mode === 'signin' ? urlError : undefined)

  return (
    <div className="auth-card">
      <div className="auth-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>
          Log in
        </button>
        <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>
          Sign up
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {state.message && <div className="alert alert-success">{state.message}</div>}

      <form key={mode} action={mode === 'signin' ? signInAction : signUpAction} className="auth-form">
        {mode === 'signup' && (
          <label>
            Full name
            <input name="full_name" type="text" autoComplete="name" placeholder="Ada Lovelace" />
          </label>
        )}
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required defaultValue={state.email} placeholder="you@company.com" />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            required
            minLength={mode === 'signup' ? 8 : undefined}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
        </label>
        <SubmitButton className="btn btn-brand btn-block" pendingText={mode === 'signin' ? 'Logging in…' : 'Creating account…'}>
          {mode === 'signin' ? 'Log in' : 'Create account'}
        </SubmitButton>
      </form>

      {mode === 'signup' && <p className="auth-hint">The first person to sign up becomes the org admin.</p>}
    </div>
  )
}
