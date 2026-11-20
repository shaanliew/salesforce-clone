import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { OBJECTS, getField, getObject, recordName, selectWithRefs, type FieldDef } from '@/lib/objects'
import { str } from '@/lib/format'
import { deleteRecord } from '@/app/actions'
import { ObjectIcon } from '@/components/ObjectIcon'
import { FieldValue } from '@/components/FieldValue'
import { RecordTable } from '@/components/RecordTable'
import { RecordPath } from '@/components/RecordPath'
import { ActivityPanel } from '@/components/ActivityPanel'
import { LineItems } from '@/components/LineItems'
import { ConfirmButton } from '@/components/ConfirmButton'
import { LocalTime } from '@/components/LocalTime'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

type Props = {
  params: Promise<{ object: string; id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { object } = await params
  return { title: getObject(object)?.label ?? 'Record' }
}

export default async function RecordPage({ params, searchParams }: Props) {
  const { object, id } = await params
  const def = getObject(object)
  if (!def || !UUID.test(id)) notFound()

  const sp = await searchParams
  const { supabase, user } = await getUser()
  if (!user) redirect('/login')

  const { data: rec } = await supabase.from(def.table).select(selectWithRefs(def)).eq('id', id).maybeSingle()
  if (!rec) notFound()
  const record = rec as Row
  const name = recordName(def, record)
  const path = `/${def.key}/${id}`

  // Related lists
  const related = await Promise.all(
    def.related.map(async (r) => {
      const rd = OBJECTS[r.object]
      const { data, count } = await supabase
        .from(rd.table)
        .select(selectWithRefs(rd), { count: 'exact' })
        .eq(r.foreignKey, id)
        .order(rd.defaultSort.column, { ascending: rd.defaultSort.ascending, nullsFirst: false })
        .limit(10)
      return { ...r, def: rd, rows: (data ?? []) as Row[], count: count ?? 0 }
    }),
  )

  // Activities
  let activity: { openTasks: Row[]; doneTasks: Row[]; events: Row[]; notes: Row[] } | null = null
  if (def.activityKey) {
    const key = def.activityKey
    const [openTasks, doneTasks, events, notes] = await Promise.all([
      supabase
        .from('tasks')
        .select('id,subject,type,status,due_date,owner_id_ref:profiles!owner_id(id,full_name)')
        .eq(key, id)
        .not('status', 'in', '(completed,deferred)')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(25),
      supabase.from('tasks').select('id,subject,type,completed_at,updated_at').eq(key, id).eq('status', 'completed').order('completed_at', { ascending: false }).limit(25),
      supabase.from('events').select('id,subject,start_at,end_at,location').eq(key, id).order('start_at', { ascending: false }).limit(25),
      supabase.from('notes').select('id,title,body,created_at').eq(key, id).order('created_at', { ascending: false }).limit(25),
    ])
    activity = {
      openTasks: (openTasks.data ?? []) as Row[],
      doneTasks: (doneTasks.data ?? []) as Row[],
      events: (events.data ?? []) as Row[],
      notes: (notes.data ?? []) as Row[],
    }
  }

  // Activity links: the record itself, plus its account when it has one.
  const links: Record<string, string> = {}
  if (def.activityKey) links[def.activityKey] = id
  if (def.key !== 'accounts' && def.key !== 'leads' && record.account_id) links.account_id = record.account_id

  // Opportunity products
  let lineItems: { items: Row[]; products: Row[] } | null = null
  if (def.key === 'opportunities') {
    const [items, products] = await Promise.all([
      supabase.from('opportunity_line_items').select('*, product:products!product_id(id,name)').eq('opportunity_id', id).order('created_at'),
      supabase.from('products').select('id,name,unit_price').eq('is_active', true).order('name'),
    ])
    lineItems = { items: (items.data ?? []) as Row[], products: (products.data ?? []) as Row[] }
  }

  // Detail sections
  const sections: { name: string; fields: FieldDef[] }[] = []
  for (const f of def.fields) {
    const sectionName = f.section ?? 'Details'
    if (sectionName === 'Conversion' && !record.converted_at) continue
    let s = sections.find((x) => x.name === sectionName)
    if (!s) {
      s = { name: sectionName, fields: [] }
      sections.push(s)
    }
    s.fields.push(f)
  }

  const pathField = def.path ? getField(def, def.path.field) : undefined
  const isConvertedLead = def.key === 'leads' && record.status === 'converted'
  const error = str(sp.error)

  return (
    <div className="page">
      <div className="card record-header">
        <div className="title-with-icon">
          <ObjectIcon def={def} size="lg" />
          <div>
            <p className="eyebrow">{def.label}</p>
            <h1>{name}</h1>
          </div>
        </div>
        <div className="actions">
          {def.key === 'leads' && !isConvertedLead && (
            <Link className="btn btn-brand" href={`${path}/convert`}>
              Convert
            </Link>
          )}
          <Link className="btn" href={`${path}/edit`}>
            Edit
          </Link>
          {def.canDelete && (
            <form action={deleteRecord}>
              <input type="hidden" name="__object" value={def.key} />
              <input type="hidden" name="__id" value={id} />
              <ConfirmButton className="btn" message={`Delete this ${def.label.toLowerCase()}? This cannot be undone.`}>
                Delete
              </ConfirmButton>
            </form>
          )}
        </div>
        <dl className="highlights">
          {def.highlight.map((h) => {
            const f = getField(def, h) ?? (h === 'created_at' ? ({ name: 'created_at', label: 'Created', type: 'datetime' } as FieldDef) : undefined)
            if (!f) return null
            return (
              <div key={h}>
                <dt>{f.label}</dt>
                <dd>
                  <FieldValue field={f} record={record} />
                </dd>
              </div>
            )
          })}
        </dl>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {str(sp.converted) && <div className="alert alert-success">Lead converted. The account, contact and opportunity are ready.</div>}
      {isConvertedLead && (
        <div className="alert alert-info">
          This lead was converted
          {record.converted_account_id_ref && (
            <>
              {' '}
              to <Link href={`/accounts/${record.converted_account_id}`}>{record.converted_account_id_ref.name}</Link>
            </>
          )}
          {record.converted_opportunity_id_ref && (
            <>
              {' '}
              with opportunity <Link href={`/opportunities/${record.converted_opportunity_id}`}>{record.converted_opportunity_id_ref.name}</Link>
            </>
          )}
          .
        </div>
      )}

      {pathField && !isConvertedLead && (
        <RecordPath def={def} field={pathField} value={String(record[pathField.name] ?? '')} id={id} exclude={def.path?.exclude} />
      )}

      <div className={activity ? 'record-layout' : 'record-layout single'}>
        <div className="record-main">
          {lineItems && <LineItems opportunityId={id} items={lineItems.items} products={lineItems.products} />}

          {related.map((r) => (
            <section key={`${r.object}-${r.foreignKey}`} className="card related">
              <div className="card-header">
                <h2>
                  <ObjectIcon def={r.def} size="sm" /> {r.label ?? r.def.plural} ({r.count})
                </h2>
                {r.def.canCreate && (
                  <Link className="btn btn-sm" href={`/${r.def.key}/new?${r.foreignKey}=${id}${links.account_id && r.foreignKey !== 'account_id' && getField(r.def, 'account_id') ? `&account_id=${links.account_id}` : ''}`}>
                    New
                  </Link>
                )}
              </div>
              {r.rows.length > 0 ? <RecordTable def={r.def} rows={r.rows} columns={r.columns} /> : <p className="muted pad">None yet.</p>}
            </section>
          ))}

          <section className="card">
            <div className="card-header">
              <h2>Details</h2>
              <Link href={`${path}/edit`} className="btn btn-sm">
                Edit
              </Link>
            </div>
            {sections.map((s) => (
              <div key={s.name} className="detail-section">
                <h3>{s.name}</h3>
                <dl className="detail-grid">
                  {s.fields.map((f) => (
                    <div key={f.name} className={f.wide || f.type === 'textarea' ? 'wide' : undefined}>
                      <dt>{f.label}</dt>
                      <dd>
                        <FieldValue field={f} record={record} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
            <div className="detail-section">
              <h3>System Information</h3>
              <dl className="detail-grid">
                <div>
                  <dt>Created</dt>
                  <dd>
                    <LocalTime value={record.created_at} />
                  </dd>
                </div>
                <div>
                  <dt>Last Modified</dt>
                  <dd>
                    <LocalTime value={record.updated_at} />
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </div>

        {activity && <ActivityPanel links={links} returnPath={path} {...activity} />}
      </div>
    </div>
  )
}
