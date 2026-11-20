import Link from 'next/link'
import { recordName, type ObjectDef } from '@/lib/objects'
import { FieldValue, columnField } from './FieldValue'

type SortState = { column: string; ascending: boolean; hrefFor: (column: string) => string | null }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

/** Table of records for list views and related lists. */
export function RecordTable({
  def,
  rows,
  columns,
  sort,
  empty = 'No records to display.',
}: {
  def: ObjectDef
  rows: Row[]
  columns: string[]
  sort?: SortState
  empty?: string
}) {
  const header = (column: string) => {
    if (column === '__name') return def.label === 'Campaign Member' ? 'Member' : `${def.label} Name`
    return columnField(def.fields, column)?.label ?? column
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => {
              const href = sort?.hrefFor(c)
              const active = sort && (sort.column === c || (c === '__name' && sort.column === '__name'))
              return (
                <th key={c} scope="col">
                  {href ? (
                    <Link href={href} className={active ? 'sorted' : undefined}>
                      {header(c)}
                      {active ? (sort!.ascending ? ' ▲' : ' ▼') : ''}
                    </Link>
                  ) : (
                    header(c)
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="muted empty-row">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((c) => {
                if (c === '__name') {
                  return (
                    <td key={c} className="name-cell">
                      <Link href={`/${def.key}/${row.id}`}>{recordName(def, row)}</Link>
                    </td>
                  )
                }
                const field = columnField(def.fields, c)
                const numeric = field && ['currency', 'number', 'percent'].includes(field.type)
                return (
                  <td key={c} className={numeric ? 'num' : undefined}>
                    {field ? <FieldValue field={field} record={row} /> : String(row[c] ?? '')}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
