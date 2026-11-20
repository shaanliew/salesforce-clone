'use client'

import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'

/** Submit button that asks for confirmation first. */
export function ConfirmButton({
  children,
  message,
  className = 'btn btn-danger',
}: {
  children: ReactNode
  message: string
  className?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault()
      }}
    >
      {children}
    </button>
  )
}

/** Submit button that disables itself while the form is pending. */
export function SubmitButton({
  children,
  className = 'btn btn-brand',
  pendingText,
}: {
  children: ReactNode
  className?: string
  pendingText?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText ?? 'Saving…' : children}
    </button>
  )
}
