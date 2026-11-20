'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { convertLead } from '@/app/actions'
import { initialFormState } from '@/lib/types'
import type { Option } from '@/lib/objects'
import { SubmitButton } from '@/components/ConfirmButton'

export function ConvertForm({
  leadId,
  company,
  personName,
  accounts,
  suggestedAccountId,
}: {
  leadId: string
  company: string
  personName: string
  accounts: Option[]
  suggestedAccountId: string | null
}) {
  const [state, action] = useActionState(convertLead, initialFormState)
  const [mode, setMode] = useState<'new' | 'existing'>(suggestedAccountId ? 'existing' : 'new')
  const [createOpp, setCreateOpp] = useState(true)

  return (
    <form action={action} className="card form-card">
      <input type="hidden" name="lead_id" value={leadId} />
      {state.error && <div className="alert alert-error">{state.error}</div>}

      <fieldset className="form-section">
        <legend>Account</legend>
        <label className="radio">
          <input type="radio" name="account_mode" value="new" checked={mode === 'new'} onChange={() => setMode('new')} />
          Create new account: <strong>{company}</strong>
        </label>
        <label className="radio">
          <input type="radio" name="account_mode" value="existing" checked={mode === 'existing'} onChange={() => setMode('existing')} />
          Add to an existing account
        </label>
        {mode === 'existing' && (
          <select name="account_id" defaultValue={suggestedAccountId ?? ''} required aria-label="Existing account">
            <option value="">Select an account…</option>
            {accounts.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        )}
        {suggestedAccountId && mode === 'existing' && <p className="muted small">An account named “{company}” already exists, so it is selected.</p>}
      </fieldset>

      <fieldset className="form-section">
        <legend>Contact</legend>
        <p>
          A new contact, <strong>{personName}</strong>, will be created from the lead’s details. Open tasks, events and notes move to the contact.
        </p>
      </fieldset>

      <fieldset className="form-section">
        <legend>Opportunity</legend>
        <label className="toggle">
          <input type="checkbox" name="create_opportunity" checked={createOpp} onChange={(e) => setCreateOpp(e.target.checked)} />
          <span>Create an opportunity</span>
        </label>
        {createOpp && <input name="opportunity_name" defaultValue={`${company} - New Business`} aria-label="Opportunity name" />}
      </fieldset>

      <div className="form-actions">
        <Link href={`/leads/${leadId}`} className="btn">
          Cancel
        </Link>
        <SubmitButton pendingText="Converting…">Convert</SubmitButton>
      </div>
    </form>
  )
}
