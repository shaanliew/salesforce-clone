'use client'

import { useEffect, useState } from 'react'

function toLocalInput(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * A datetime-local input that edits in the viewer's time zone and submits a
 * full ISO timestamp (with offset) under `name`.
 */
export function DateTimeInput({
  name,
  defaultValue,
  required,
  id,
}: {
  name: string
  defaultValue?: string | null
  required?: boolean
  id?: string
}) {
  const [local, setLocal] = useState('')

  useEffect(() => {
    setLocal(defaultValue ? toLocalInput(defaultValue) : '')
  }, [defaultValue])

  let iso = ''
  if (local) {
    const d = new Date(local)
    if (!Number.isNaN(d.getTime())) iso = d.toISOString()
  }

  return (
    <>
      <input id={id} type="datetime-local" value={local} required={required} onChange={(e) => setLocal(e.target.value)} />
      <input type="hidden" name={name} value={iso} />
    </>
  )
}
