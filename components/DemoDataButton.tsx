'use client'

import { useActionState } from 'react'
import { loadDemoData } from '@/app/actions'
import { SubmitButton } from './ConfirmButton'

export function DemoDataButton() {
  const [state, action] = useActionState(loadDemoData, { error: null })
  return (
    <form action={action} className="inline-form">
      <SubmitButton pendingText="Loading sample data…">Load sample data</SubmitButton>
      {state.error && <span className="error-text">{state.error}</span>}
    </form>
  )
}
