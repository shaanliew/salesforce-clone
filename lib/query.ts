import type { ListView, ViewFilter } from './objects'

function resolve(value: ViewFilter['value']): string {
  if (value === '$now') return new Date().toISOString()
  if (value === '$today') return new Date().toISOString().slice(0, 10)
  return String(value ?? '')
}

/** Apply a list view's filters to a PostgREST query builder. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyView(query: any, view: ListView, userId: string): any {
  let q = query
  if (view.mine) q = q.eq('owner_id', userId)
  for (const f of view.filters ?? []) {
    const list = Array.isArray(f.value) ? f.value : [String(f.value ?? '')]
    switch (f.op) {
      case 'eq':
        q = q.eq(f.column, resolve(f.value))
        break
      case 'neq':
        q = q.neq(f.column, resolve(f.value))
        break
      case 'in':
        q = q.in(f.column, list)
        break
      case 'not_in':
        q = q.not(f.column, 'in', `(${list.join(',')})`)
        break
      case 'is_true':
        q = q.eq(f.column, true)
        break
      case 'is_false':
        q = q.eq(f.column, false)
        break
      case 'gte':
        q = q.gte(f.column, resolve(f.value))
        break
      case 'lt':
        q = q.lt(f.column, resolve(f.value))
        break
    }
  }
  return q
}

/** OR-ilike search across columns. `term` must already be sanitised. */
export function searchFilter(columns: string[], term: string): string {
  return columns.map((c) => `${c}.ilike.%${term}%`).join(',')
}
