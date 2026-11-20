'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { saveRecord } from '@/app/actions'
import type { FieldDef, Option } from '@/lib/objects'
import { initialFormState } from '@/lib/types'
import { DateTimeInput } from './DateTimeInput'
import { SubmitButton } from './ConfirmButton'

type Props = {
  objectKey: string
  objectLabel: string
  id?: string
  fields: FieldDef[]
  values: Record<string, string>
  lookupOptions: Record<string, Option[]>
  cancelHref: string
}

/** Create/edit form generated from an object's field metadata. */
export function RecordForm({ objectKey, objectLabel, id, fields, values, lookupOptions, cancelHref }: Props) {
  const [state, formAction] = useActionState(saveRecord, initialFormState)
  const current = state.values ?? values

  const sections: { name: string; fields: FieldDef[] }[] = []
  for (const f of fields) {
    if (f.readOnly) continue
    const name = f.section ?? 'Information'
    let section = sections.find((s) => s.name === name)
    if (!section) {
      section = { name, fields: [] }
      sections.push(section)
    }
    section.fields.push(f)
  }

  return (
    <form action={formAction} className="card form-card">
      <input type="hidden" name="__object" value={objectKey} />
      {id && <input type="hidden" name="__id" value={id} />}

      {state.error && (
        <div className="alert alert-error" role="alert">
          {state.error}
        </div>
      )}

      {sections.map((section) => (
        <fieldset key={section.name} className="form-section">
          <legend>{section.name}</legend>
          <div className="form-grid">
            {section.fields.map((f) => (
              <div key={f.name} className={f.wide || f.type === 'textarea' ? 'form-field wide' : 'form-field'}>
                <label htmlFor={`f_${f.name}`}>
                  {f.required && <abbr title="required">*</abbr>}
                  {f.label}
                </label>
                <Input field={f} value={current[f.name] ?? ''} options={f.type === 'lookup' ? lookupOptions[f.name] ?? [] : f.options ?? []} />
              </div>
            ))}
          </div>
        </fieldset>
      ))}

      <div className="form-actions">
        <Link href={cancelHref} className="btn">
          Cancel
        </Link>
        <SubmitButton>{id ? 'Save' : `Save ${objectLabel}`}</SubmitButton>
      </div>
    </form>
  )
}

function Input({ field, value, options }: { field: FieldDef; value: string; options: Option[] }) {
  const id = `f_${field.name}`
  const common = { id, name: field.name, required: field.required }

  switch (field.type) {
    case 'textarea':
      return <textarea {...common} rows={4} defaultValue={value} />
    case 'boolean':
      return (
        <label className="toggle">
          <input id={id} name={field.name} type="checkbox" defaultChecked={value === 'true'} />
          <span>{field.label}</span>
        </label>
      )
    case 'picklist': {
      const allowed = options.filter((o) => !field.formExclude?.includes(o.value) || o.value === value)
      return (
        <select {...common} defaultValue={value}>
          {!field.required && <option value="">--None--</option>}
          {allowed.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
    }
    case 'lookup':
      return (
        <select {...common} defaultValue={value}>
          <option value="">{field.required ? 'Select…' : '--None--'}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
    case 'datetime':
      return <DateTimeInput id={id} name={field.name} defaultValue={value || null} required={field.required} />
    case 'date':
      return <input {...common} type="date" defaultValue={value} />
    case 'number':
    case 'percent':
      return <input {...common} type="number" step="1" min="0" max={field.type === 'percent' ? 100 : undefined} defaultValue={value} />
    case 'currency':
      return <input {...common} type="number" step="0.01" min="0" defaultValue={value} />
    case 'email':
      return <input {...common} type="email" defaultValue={value} />
    case 'phone':
      return <input {...common} type="tel" defaultValue={value} />
    case 'url':
      return <input {...common} type="text" inputMode="url" placeholder="https://" defaultValue={value} />
    default:
      return <input {...common} type="text" defaultValue={value} />
  }
}
