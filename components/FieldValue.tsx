import Link from 'next/link'
import { OBJECTS, optionLabel, recordName, type FieldDef } from '@/lib/objects'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'
import { LocalTime } from './LocalTime'

const BADGE_TONES: Record<string, string> = {
  hot: 'red',
  warm: 'orange',
  cold: 'blue',
  closed_won: 'green',
  closed_lost: 'gray',
  converted: 'green',
  unqualified: 'gray',
  completed: 'green',
  closed: 'gray',
  escalated: 'red',
  critical: 'red',
  high: 'orange',
  customer: 'green',
  partner: 'purple',
  in_progress: 'blue',
  working: 'blue',
  new: 'teal',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FieldValue({ field, record }: { field: FieldDef; record: any }) {
  const value = record?.[field.name]

  switch (field.type) {
    case 'lookup': {
      const ref = record?.[`${field.name}_ref`]
      if (!ref || !field.lookup) return null
      return <Link href={`/${field.lookup}/${ref.id}`}>{recordName(OBJECTS[field.lookup], ref)}</Link>
    }
    case 'boolean':
      return <span className={value ? 'check on' : 'check'}>{value ? '✓' : ''}</span>
    case 'picklist': {
      if (value === null || value === undefined || value === '') return null
      const tone = BADGE_TONES[String(value)]
      return tone ? <span className={`badge badge-${tone}`}>{optionLabel(field, value)}</span> : <>{optionLabel(field, value)}</>
    }
    case 'currency':
      return <>{formatCurrency(value)}</>
    case 'number':
      return <>{field.name === 'case_number' ? value ?? '' : formatNumber(value)}</>
    case 'percent':
      return value === null || value === undefined ? null : <>{value}%</>
    case 'date':
      return <>{formatDate(value)}</>
    case 'datetime':
      return <LocalTime value={value} />
    case 'url': {
      if (!value) return null
      const href = /^https?:\/\//i.test(value) ? value : `https://${value}`
      return (
        <a href={href} target="_blank" rel="noreferrer noopener">
          {String(value).replace(/^https?:\/\//i, '')}
        </a>
      )
    }
    case 'email':
      return value ? <a href={`mailto:${value}`}>{value}</a> : null
    case 'phone':
      return value ? <a href={`tel:${String(value).replace(/\s/g, '')}`}>{value}</a> : null
    case 'textarea':
      return value ? <span className="pre">{value}</span> : null
    default:
      return value === null || value === undefined ? null : <>{String(value)}</>
  }
}

const SYSTEM_FIELDS: Record<string, FieldDef> = {
  created_at: { name: 'created_at', label: 'Created', type: 'datetime' },
  updated_at: { name: 'updated_at', label: 'Last Modified', type: 'datetime' },
}

export function columnField(fields: FieldDef[], column: string): FieldDef | undefined {
  return fields.find((f) => f.name === column) ?? SYSTEM_FIELDS[column]
}
