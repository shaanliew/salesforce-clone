import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { OBJECTS, STAGES, optionLabel, getField } from '@/lib/objects'
import { formatCurrency, formatDate, isoDate } from '@/lib/format'
import { completeTask } from '@/app/actions'
import { DemoDataButton } from '@/components/DemoDataButton'
import { ObjectIcon } from '@/components/ObjectIcon'
import { LocalTime } from '@/components/LocalTime'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

function quarterStart(): string {
  const d = new Date()
  const q = Math.floor(d.getUTCMonth() / 3) * 3
  return new Date(Date.UTC(d.getUTCFullYear(), q, 1)).toISOString().slice(0, 10)
}

export default async function HomePage() {
  const { supabase, user } = await getUser()
  if (!user) redirect('/login')

  const [opps, leads, cases, tasks, events, accounts, recent] = await Promise.all([
    supabase.from('opportunities').select('id,stage,amount,is_closed,is_won,close_date,owner_id').limit(5000),
    supabase.from('leads').select('id', { count: 'exact', head: true }).not('status', 'in', '(converted,unqualified)'),
    supabase.from('cases').select('id,priority', { count: 'exact' }).neq('status', 'closed').limit(1000),
    supabase
      .from('tasks')
      .select('id,subject,type,due_date,priority')
      .eq('owner_id', user.id)
      .not('status', 'in', '(completed,deferred)')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(8),
    supabase
      .from('events')
      .select('id,subject,start_at,location')
      .eq('owner_id', user.id)
      .gte('end_at', new Date().toISOString())
      .order('start_at', { ascending: true })
      .limit(5),
    supabase.from('accounts').select('id', { count: 'exact', head: true }),
    supabase
      .from('opportunities')
      .select('id,name,stage,amount,close_date,account:accounts!account_id(id,name)')
      .order('updated_at', { ascending: false })
      .limit(6),
  ])

  const oppRows: Row[] = opps.data ?? []
  const open = oppRows.filter((o) => !o.is_closed)
  const qStart = quarterStart()
  const wonThisQuarter = oppRows.filter((o) => o.is_won && o.close_date >= qStart)
  const closedThisQuarter = oppRows.filter((o) => o.is_closed && o.close_date >= qStart)
  const winRate = closedThisQuarter.length ? Math.round((wonThisQuarter.length / closedThisQuarter.length) * 100) : null
  const sum = (rows: Row[]) => rows.reduce((t, o) => t + Number(o.amount ?? 0), 0)

  const openStages = STAGES.filter((s) => s.value !== 'closed_won' && s.value !== 'closed_lost')
  const byStage = openStages.map((s) => {
    const rows = open.filter((o) => o.stage === s.value)
    return { ...s, count: rows.length, total: sum(rows) }
  })
  const maxStage = Math.max(1, ...byStage.map((s) => s.total))

  const caseRows: Row[] = cases.data ?? []
  const urgentCases = caseRows.filter((c) => c.priority === 'critical' || c.priority === 'high').length
  const today = isoDate()
  const isEmpty = (accounts.count ?? 0) === 0
  const taskType = getField(OBJECTS.tasks, 'type')!
  const stageField = getField(OBJECTS.opportunities, 'stage')!

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Home</p>
          <h1>Welcome back</h1>
        </div>
        <div className="actions">
          <Link className="btn" href="/leads/new">
            New Lead
          </Link>
          <Link className="btn btn-brand" href="/opportunities/new">
            New Opportunity
          </Link>
        </div>
      </div>

      {isEmpty && (
        <div className="card empty-hero">
          <div>
            <h2>Your org is empty</h2>
            <p>Load a small sample data set — accounts, contacts, leads, opportunities, cases and campaigns — to explore the app. It will be owned by you and you can delete it at any time.</p>
          </div>
          <DemoDataButton />
        </div>
      )}

      <section className="kpis">
        <div className="card kpi">
          <span>Open pipeline</span>
          <strong>{formatCurrency(sum(open), true)}</strong>
          <small>{open.length} open opportunities</small>
        </div>
        <div className="card kpi">
          <span>Won this quarter</span>
          <strong>{formatCurrency(sum(wonThisQuarter), true)}</strong>
          <small>{winRate === null ? 'No closed deals yet' : `${winRate}% win rate`}</small>
        </div>
        <Link href="/leads" className="card kpi">
          <span>Open leads</span>
          <strong>{leads.count ?? 0}</strong>
          <small>Not converted or disqualified</small>
        </Link>
        <Link href="/cases" className="card kpi">
          <span>Open cases</span>
          <strong>{cases.count ?? 0}</strong>
          <small>{urgentCases} high or critical</small>
        </Link>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-header">
            <h2>Pipeline by stage</h2>
            <Link href="/pipeline">Open board</Link>
          </div>
          <div className="bars">
            {byStage.map((s) => (
              <div className="bar-row" key={s.value}>
                <span className="bar-label">{s.label}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(s.total / maxStage) * 100}%` }} />
                </div>
                <span className="bar-value">
                  {formatCurrency(s.total, true)} <small>({s.count})</small>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>My open tasks</h2>
            <Link href="/tasks">View all</Link>
          </div>
          {(tasks.data ?? []).length === 0 ? (
            <p className="muted pad">Nothing due. Nice.</p>
          ) : (
            <ul className="task-list">
              {(tasks.data as Row[]).map((t) => (
                <li key={t.id}>
                  <form action={completeTask}>
                    <input type="hidden" name="__id" value={t.id} />
                    <input type="hidden" name="__return" value="/" />
                    <button className="check-btn" title="Mark complete" aria-label={`Complete ${t.subject}`} />
                  </form>
                  <div>
                    <Link href={`/tasks/${t.id}`}>{t.subject}</Link>
                    <small className={t.due_date && t.due_date < today ? 'overdue' : 'muted'}>
                      {optionLabel(taskType, t.type)}
                      {t.due_date ? ` · Due ${formatDate(t.due_date)}` : ''}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Recently updated opportunities</h2>
            <Link href="/opportunities">View all</Link>
          </div>
          <table className="table compact">
            <tbody>
              {((recent.data ?? []) as Row[]).map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/opportunities/${o.id}`}>{o.name}</Link>
                    {o.account && <div className="muted small">{o.account.name}</div>}
                  </td>
                  <td>{optionLabel(stageField, o.stage)}</td>
                  <td className="num">{formatCurrency(o.amount)}</td>
                </tr>
              ))}
              {(recent.data ?? []).length === 0 && (
                <tr>
                  <td className="muted">No opportunities yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>
              <ObjectIcon def={OBJECTS.events} size="sm" /> Upcoming events
            </h2>
            <Link href="/events">Calendar</Link>
          </div>
          {(events.data ?? []).length === 0 ? (
            <p className="muted pad">No upcoming events.</p>
          ) : (
            <ul className="event-list">
              {(events.data as Row[]).map((e) => (
                <li key={e.id}>
                  <Link href={`/events/${e.id}`}>{e.subject}</Link>
                  <small className="muted">
                    <LocalTime value={e.start_at} />
                    {e.location ? ` · ${e.location}` : ''}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
