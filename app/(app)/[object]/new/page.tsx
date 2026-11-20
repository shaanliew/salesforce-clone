import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { getObject } from '@/lib/objects'
import { loadLookupOptions, newRecordValues } from '@/lib/data'
import { RecordForm } from '@/components/RecordForm'
import { ObjectIcon } from '@/components/ObjectIcon'

type Props = {
  params: Promise<{ object: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { object } = await params
  const def = getObject(object)
  return { title: def ? `New ${def.label}` : 'Not found' }
}

export default async function NewRecordPage({ params, searchParams }: Props) {
  const { object } = await params
  const def = getObject(object)
  if (!def || !def.canCreate) notFound()

  const { supabase, user } = await getUser()
  if (!user) redirect('/login')

  const prefill = await searchParams
  const lookupOptions = await loadLookupOptions(supabase, def)
  const values = newRecordValues(def, user.id, prefill)

  // Return to the parent record if we came from a related list.
  const parent = def.fields.find((f) => f.type === 'lookup' && f.lookup && typeof prefill[f.name] === 'string')
  const cancelHref = parent && parent.lookup ? `/${parent.lookup}/${prefill[parent.name]}` : `/${def.key}`

  return (
    <div className="page narrow">
      <div className="page-header">
        <div className="title-with-icon">
          <ObjectIcon def={def} size="lg" />
          <div>
            <p className="eyebrow">{def.plural}</p>
            <h1>New {def.label}</h1>
          </div>
        </div>
      </div>
      <RecordForm objectKey={def.key} objectLabel={def.label} fields={def.fields} values={values} lookupOptions={lookupOptions} cancelHref={cancelHref} />
    </div>
  )
}
