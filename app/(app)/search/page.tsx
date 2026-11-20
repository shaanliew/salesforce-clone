import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { OBJECTS, selectWithRefs, type ObjectKey } from '@/lib/objects'
import { safeSearch, str } from '@/lib/format'
import { searchFilter } from '@/lib/query'
import { RecordTable } from '@/components/RecordTable'
import { ObjectIcon } from '@/components/ObjectIcon'

export const metadata: Metadata = { title: 'Search' }

const SEARCHED: ObjectKey[] = ['accounts', 'contacts', 'leads', 'opportunities', 'cases', 'campaigns', 'products']

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const q = safeSearch(str(sp.q))
  const { supabase, user } = await getUser()
  if (!user) redirect('/login')

  const results = q
    ? await Promise.all(
        SEARCHED.map(async (key) => {
          const def = OBJECTS[key]
          const { data } = await supabase.from(def.table).select(selectWithRefs(def)).or(searchFilter(def.searchColumns, q)).limit(10)
          return { def, rows: data ?? [] }
        }),
      )
    : []
  const hits = results.filter((r) => r.rows.length > 0)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Search</p>
          <h1>{q ? `Results for “${q}”` : 'Search'}</h1>
        </div>
      </div>
      <form className="card search-big" role="search">
        <input type="search" name="q" defaultValue={q} placeholder="Search across your CRM…" autoFocus aria-label="Search" />
        <button className="btn btn-brand" type="submit">
          Search
        </button>
      </form>
      {q && hits.length === 0 && <p className="muted">No records match “{q}”.</p>}
      {hits.map(({ def, rows }) => (
        <section key={def.key} className="card related">
          <div className="card-header">
            <h2>
              <ObjectIcon def={def} size="sm" /> {def.plural} ({rows.length}
              {rows.length === 10 ? '+' : ''})
            </h2>
            <Link href={`/${def.key}?view=${def.views.find((v) => !v.filters && !v.mine)?.key ?? def.views[0].key}&q=${encodeURIComponent(q)}`}>See all</Link>
          </div>
          <RecordTable def={def} rows={rows} columns={def.listColumns} />
        </section>
      ))}
    </div>
  )
}
