import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { OBJECTS, STAGES } from '@/lib/objects'
import { formatCurrency, isoDate, str } from '@/lib/format'
import { ObjectIcon } from '@/components/ObjectIcon'
import { PipelineBoard, type BoardCard } from '@/components/PipelineBoard'

export const metadata: Metadata = { title: 'Pipeline' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

export default async function PipelinePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const mine = str(sp.scope) === 'mine'
  const { supabase, user } = await getUser()
  if (!user) redirect('/login')

  let query = supabase
    .from('opportunities')
    .select('id,name,stage,amount,close_date,is_closed,account:accounts!account_id(name),owner:profiles!owner_id(full_name)')
    .or(`is_closed.eq.false,close_date.gte.${isoDate(-30)}`)
    .order('close_date', { ascending: true })
    .limit(500)
  if (mine) query = query.eq('owner_id', user.id)
  const { data, error } = await query

  const cards: BoardCard[] = ((data ?? []) as Row[]).map((o) => ({
    id: o.id,
    name: o.name,
    stage: o.stage,
    amount: o.amount,
    close_date: o.close_date,
    account: o.account?.name ?? null,
    owner: o.owner?.full_name ?? null,
  }))
  const openTotal = cards.filter((c) => c.stage !== 'closed_won' && c.stage !== 'closed_lost').reduce((t, c) => t + Number(c.amount ?? 0), 0)

  return (
    <div className="page wide">
      <div className="page-header">
        <div className="title-with-icon">
          <ObjectIcon def={OBJECTS.opportunities} size="lg" />
          <div>
            <p className="eyebrow">Opportunities</p>
            <h1>Pipeline · {formatCurrency(openTotal, true)} open</h1>
          </div>
        </div>
        <div className="actions">
          <div className="pills">
            <Link href="/pipeline" className={mine ? 'pill' : 'pill active'}>
              All
            </Link>
            <Link href="/pipeline?scope=mine" className={mine ? 'pill active' : 'pill'}>
              Mine
            </Link>
          </div>
          <Link className="btn btn-brand" href="/opportunities/new">
            New Opportunity
          </Link>
        </div>
      </div>
      <p className="muted small">Drag cards between stages, or use the stage menu on a card. Closed deals from the last 30 days are shown.</p>
      {error && <div className="alert alert-error">{error.message}</div>}
      <PipelineBoard key={`${mine}-${cards.length}`} stages={STAGES} initial={cards} />
    </div>
  )
}
