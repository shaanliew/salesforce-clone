import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { getObject, nameSortColumn, selectWithRefs, sortable } from '@/lib/objects'
import { safeSearch, str } from '@/lib/format'
import { applyView, searchFilter } from '@/lib/query'
import { RecordTable } from '@/components/RecordTable'
import { ObjectIcon } from '@/components/ObjectIcon'

const PAGE_SIZE = 25

type Props = {
  params: Promise<{ object: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { object } = await params
  return { title: getObject(object)?.plural ?? 'Not found' }
}

export default async function ListPage({ params, searchParams }: Props) {
  const { object } = await params
  const def = getObject(object)
  if (!def) notFound()

  const sp = await searchParams
  const { supabase, user } = await getUser()
  if (!user) redirect('/login')

  const view = def.views.find((v) => v.key === str(sp.view)) ?? def.views[0]
  const q = safeSearch(str(sp.q))
  const sortParam = str(sp.sort)
  const validSort = sortParam === '__name' || (sortParam !== '' && sortable(def, sortParam))
  const sortColumn = validSort ? (sortParam === '__name' ? nameSortColumn(def) : sortParam) : def.defaultSort.column
  const ascending = validSort ? str(sp.dir) !== 'desc' : def.defaultSort.ascending
  const activeSort = validSort ? sortParam : def.defaultSort.column === nameSortColumn(def) ? '__name' : def.defaultSort.column
  const page = Math.max(1, parseInt(str(sp.page), 10) || 1)

  let query = supabase.from(def.table).select(selectWithRefs(def), { count: 'exact' })
  query = applyView(query, view, user.id)
  if (q && def.searchColumns.length) query = query.or(searchFilter(def.searchColumns, q))
  const { data, count, error } = await query
    .order(sortColumn, { ascending, nullsFirst: false })
    .order('id', { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  const total = count ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const href = (overrides: Record<string, string | null>) => {
    const params = new URLSearchParams()
    const base: Record<string, string> = { view: view.key, q, sort: validSort ? sortParam : '', dir: validSort ? (ascending ? 'asc' : 'desc') : '' }
    for (const [k, v] of Object.entries({ ...base, ...overrides })) if (v) params.set(k, v)
    const s = params.toString()
    return `/${def.key}${s ? `?${s}` : ''}`
  }

  const hrefFor = (column: string) => {
    if (column !== '__name' && !sortable(def, column)) return null
    const nextAsc = activeSort === column ? !ascending : true
    return href({ sort: column, dir: nextAsc ? 'asc' : 'desc', page: null })
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="title-with-icon">
          <ObjectIcon def={def} size="lg" />
          <div>
            <p className="eyebrow">{def.plural}</p>
            <h1>{view.label}</h1>
          </div>
        </div>
        <div className="actions">
          {def.key === 'opportunities' && (
            <Link className="btn" href="/pipeline">
              Pipeline board
            </Link>
          )}
          {def.canCreate && (
            <Link className="btn btn-brand" href={`/${def.key}/new`}>
              New
            </Link>
          )}
        </div>
      </div>

      <div className="card">
        <div className="list-toolbar">
          <div className="pills">
            {def.views.map((v) => (
              <Link key={v.key} href={href({ view: v.key, page: null })} className={v.key === view.key ? 'pill active' : 'pill'}>
                {v.label}
              </Link>
            ))}
          </div>
          {def.searchColumns.length > 0 && (
            <form className="list-search" role="search">
              <input type="hidden" name="view" value={view.key} />
              <input type="search" name="q" defaultValue={q} placeholder={`Search this list…`} aria-label={`Search ${def.plural}`} />
            </form>
          )}
        </div>
        <p className="list-meta muted">
          {total} {total === 1 ? 'item' : 'items'}
          {q ? ` matching “${q}”` : ''}
        </p>
        {error && <div className="alert alert-error">{error.message}</div>}
        <RecordTable def={def} rows={data ?? []} columns={def.listColumns} sort={{ column: activeSort, ascending, hrefFor }} />
        {pages > 1 && (
          <div className="pager">
            {page > 1 ? (
              <Link className="btn" href={href({ page: String(page - 1) })}>
                Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="muted">
              Page {page} of {pages}
            </span>
            {page < pages ? (
              <Link className="btn" href={href({ page: String(page + 1) })}>
                Next
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
