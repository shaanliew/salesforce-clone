import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { getObject, recordName } from '@/lib/objects'
import { loadLookupOptions, toFormValues } from '@/lib/data'
import { RecordForm } from '@/components/RecordForm'
import { ObjectIcon } from '@/components/ObjectIcon'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Props = { params: Promise<{ object: string; id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { object } = await params
  const def = getObject(object)
  return { title: def ? `Edit ${def.label}` : 'Not found' }
}

export default async function EditRecordPage({ params }: Props) {
  const { object, id } = await params
  const def = getObject(object)
  if (!def || !UUID.test(id)) notFound()

  const { supabase, user } = await getUser()
  if (!user) redirect('/login')

  const [{ data: record }, lookupOptions] = await Promise.all([
    supabase.from(def.table).select('*').eq('id', id).maybeSingle(),
    loadLookupOptions(supabase, def),
  ])
  if (!record) notFound()

  return (
    <div className="page narrow">
      <div className="page-header">
        <div className="title-with-icon">
          <ObjectIcon def={def} size="lg" />
          <div>
            <p className="eyebrow">Edit {def.label}</p>
            <h1>{recordName(def, record)}</h1>
          </div>
        </div>
      </div>
      <RecordForm
        objectKey={def.key}
        objectLabel={def.label}
        id={id}
        fields={def.fields}
        values={toFormValues(def, record)}
        lookupOptions={lookupOptions}
        cancelHref={`/${def.key}/${id}`}
      />
    </div>
  )
}
