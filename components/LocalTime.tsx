'use client'

import { useEffect, useState } from 'react'

/** Renders a timestamp in the viewer's own time zone. */
export function LocalTime({ value, withTime = true }: { value: string | null | undefined; withTime?: boolean }) {
  const [text, setText] = useState('')

  useEffect(() => {
    if (!value) return
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return
    setText(
      withTime
        ? d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
    )
  }, [value, withTime])

  if (!value) return null
  return <time dateTime={value}>{text}</time>
}
