import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { OBJECTS, recordName } from '@/lib/objects'
import { ObjectIcon } from '@/components/ObjectIcon'
import { ConvertForm } from './ConvertForm'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const metadata: Metadata = { title: 'Convert Lead' }

export default async function ConvertLeadPage({ params }: { params: Promise<{ object: string; id: string }> }) {
  const { object, id } = await params
  if (object !== 'leads' || !UUID.test(id)) notFound()

  const { supabase, user } = await getUser()
  if (!user) redirect('/login')

  const { data: lead } = await supabase.from('leads').select('*').eq('id', id).maybeSingle()
  if (!lead) notFound()
  if (lead.status === 'converted') redirect(`/leads/${id}`)

  const { data: accounts } = await supabase.from('accounts').select('id,name').order('name').limit(1000)
  const options = (accounts ?? []).map((a: { id: string; name: string }) => ({ value: a.id, label: a.name }))
  const match = options.find((a) => a.label.trim().toLowerCase() === String(lead.company).trim().toLowerCase())

  return (
    <div className="page narrow">
      <div className="page-header">
        <div className="title-with-icon">
          <ObjectIcon def={OBJECTS.leads} size="lg" />
          <div>
            <p className="eyebrow">Convert Lead</p>
            <h1>{recordName(OBJECTS.leads, lead)}</h1>
          </div>
        </div>
      </div>
      <ConvertForm
        leadId={id}
        company={String(lead.company)}
        personName={recordName(OBJECTS.leads, lead)}
        accounts={options}
        suggestedAccountId={match?.value ?? null}
      />
    </div>
  )
}
