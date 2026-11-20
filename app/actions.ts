'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getField, getObject, STAGES, type FieldDef, type ObjectDef } from '@/lib/objects'
import type { ActionResult, FormState } from '@/lib/types'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function text(formData: FormData, key: string): string {
  const v = formData.get(key)
  return typeof v === 'string' ? v.trim() : ''
}

/** Same-site relative path only (prevents open redirects). */
function safePath(path: string, fallback: string): string {
  return path.startsWith('/') && !path.startsWith('//') ? path : fallback
}

function friendlyError(message: string, code?: string): string {
  if (code === '23503') return 'This record is referenced by other records and cannot be removed, or a related record no longer exists.'
  if (code === '23505') return 'A record with this value already exists.'
  if (code === '23514') return 'One of the values is not allowed. Check required combinations and value ranges.'
  if (code === '42501') return 'You do not have permission to do that.'
  return message
}

type Coerced = { ok: true; value: unknown } | { ok: false; error: string }

function coerce(field: FieldDef, raw: FormDataEntryValue | null): Coerced {
  if (field.type === 'boolean') return { ok: true, value: raw === 'on' || raw === 'true' }
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (s === '') {
    return field.required ? { ok: false, error: `${field.label} is required.` } : { ok: true, value: null }
  }
  switch (field.type) {
    case 'number':
    case 'currency':
    case 'percent': {
      const n = Number(s.replace(/[,\s$]/g, ''))
      if (!Number.isFinite(n)) return { ok: false, error: `${field.label} must be a number.` }
      if (field.type === 'percent' && (n < 0 || n > 100)) return { ok: false, error: `${field.label} must be between 0 and 100.` }
      if (n < 0) return { ok: false, error: `${field.label} cannot be negative.` }
      return { ok: true, value: field.type === 'number' || field.type === 'percent' ? Math.round(n) : n }
    }
    case 'picklist':
      if (field.options && !field.options.some((o) => o.value === s)) {
        return { ok: false, error: `${field.label} has an invalid value.` }
      }
      return { ok: true, value: s }
    case 'lookup':
      if (!UUID.test(s)) return { ok: false, error: `${field.label} is not a valid record.` }
      return { ok: true, value: s }
    case 'date':
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { ok: false, error: `${field.label} must be a date.` }
      return { ok: true, value: s }
    case 'datetime':
      if (Number.isNaN(new Date(s).getTime())) return { ok: false, error: `${field.label} must be a date and time.` }
      return { ok: true, value: new Date(s).toISOString() }
    default:
      return { ok: true, value: s }
  }
}

function editableFields(def: ObjectDef): FieldDef[] {
  return def.fields.filter((f) => !f.readOnly)
}

// -----------------------------------------------------------------------------
// Create / update / delete
// -----------------------------------------------------------------------------
export async function saveRecord(_prev: FormState, formData: FormData): Promise<FormState> {
  const def = getObject(text(formData, '__object'))
  const id = text(formData, '__id')
  if (!def) return { error: 'Unknown object.', values: null }
  if (!id && !def.canCreate) return { error: `${def.plural} cannot be created here.`, values: null }

  const values: Record<string, string> = {}
  for (const [k, v] of formData.entries()) if (typeof v === 'string' && !k.startsWith('__') && !k.startsWith('$')) values[k] = v

  const payload: Record<string, unknown> = {}
  for (const field of editableFields(def)) {
    const result = coerce(field, formData.get(field.name))
    if (!result.ok) return { error: result.error, values }
    // On insert, leave blanks out so database defaults apply.
    if (!id && result.value === null) continue
    payload[field.name] = result.value
  }

  if (def.key === 'events' && payload.start_at && payload.end_at && String(payload.end_at) < String(payload.start_at)) {
    return { error: 'End must be after Start.', values }
  }
  if (def.key === 'campaign_members' && !!payload.lead_id === !!payload.contact_id) {
    return { error: 'Choose either a Lead or a Contact (not both).', values }
  }

  const supabase = await createClient()
  let savedId = id

  if (id) {
    const { data, error } = await supabase.from(def.table).update(payload).eq('id', id).select('id')
    if (error) return { error: friendlyError(error.message, error.code), values }
    if (!data || data.length === 0) return { error: 'You do not have permission to edit this record.', values }
  } else {
    const { data, error } = await supabase.from(def.table).insert(payload).select('id').single()
    if (error) return { error: friendlyError(error.message, error.code), values }
    savedId = (data as { id: string }).id
  }

  revalidatePath(`/${def.key}`)
  redirect(`/${def.key}/${savedId}`)
}

export async function deleteRecord(formData: FormData): Promise<void> {
  const def = getObject(text(formData, '__object'))
  const id = text(formData, '__id')
  if (!def || !def.canDelete || !UUID.test(id)) redirect('/')

  const supabase = await createClient()
  const { data, error } = await supabase.from(def.table).delete().eq('id', id).select('id')
  if (error || !data || data.length === 0) {
    const msg = error ? friendlyError(error.message, error.code) : 'You do not have permission to delete this record.'
    redirect(`/${def.key}/${id}?error=${encodeURIComponent(msg)}`)
  }
  revalidatePath(`/${def.key}`)
  const back = text(formData, '__return')
  redirect(back ? safePath(back, `/${def.key}`) : `/${def.key}`)
}

/** Update a single picklist/boolean field (used by the record "path"). */
export async function setField(formData: FormData): Promise<void> {
  const def = getObject(text(formData, '__object'))
  const id = text(formData, '__id')
  const field = def ? getField(def, text(formData, '__field')) : undefined
  if (!def || !field || field.readOnly || !UUID.test(id) || (field.type !== 'picklist' && field.type !== 'boolean')) redirect('/')

  const result = coerce(field, formData.get('value'))
  const back = `/${def.key}/${id}`
  if (!result.ok) redirect(`${back}?error=${encodeURIComponent(result.error)}`)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from(def.table)
    .update({ [field.name]: result.value })
    .eq('id', id)
    .select('id')
  if (error || !data || data.length === 0) {
    const msg = error ? friendlyError(error.message, error.code) : 'You do not have permission to edit this record.'
    redirect(`${back}?error=${encodeURIComponent(msg)}`)
  }
  revalidatePath(back)
}

// -----------------------------------------------------------------------------
// Activities
// -----------------------------------------------------------------------------
const ACTIVITY_KEYS = ['account_id', 'contact_id', 'lead_id', 'opportunity_id', 'case_id']

export async function quickCreate(formData: FormData): Promise<void> {
  const kind = text(formData, '__kind')
  const back = safePath(text(formData, '__return'), '/')
  const links: Record<string, string> = {}
  for (const k of ACTIVITY_KEYS) {
    const v = text(formData, k)
    if (v && UUID.test(v)) links[k] = v
  }

  const supabase = await createClient()
  let error: { message: string; code?: string } | null = null

  if (kind === 'task') {
    const subject = text(formData, 'subject')
    if (!subject) redirect(`${back}?error=${encodeURIComponent('Task subject is required.')}`)
    const type = text(formData, 'type')
    const due = text(formData, 'due_date')
    ;({ error } = await supabase.from('tasks').insert({
      subject,
      type: ['task', 'call', 'email', 'meeting'].includes(type) ? type : 'task',
      due_date: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null,
      ...links,
    }))
  } else if (kind === 'note') {
    const body = text(formData, 'body')
    if (!body) redirect(`${back}?error=${encodeURIComponent('Note text is required.')}`)
    ;({ error } = await supabase.from('notes').insert({ title: text(formData, 'title') || null, body, ...links }))
  } else if (kind === 'event') {
    const subject = text(formData, 'subject')
    const start = text(formData, 'start_at')
    const minutes = Number(text(formData, 'duration')) || 60
    if (!subject || !start || Number.isNaN(new Date(start).getTime())) {
      redirect(`${back}?error=${encodeURIComponent('Event subject and start are required.')}`)
    }
    const startAt = new Date(start)
    const endAt = new Date(startAt.getTime() + minutes * 60_000)
    ;({ error } = await supabase.from('events').insert({
      subject,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      location: text(formData, 'location') || null,
      ...links,
    }))
  }

  if (error) redirect(`${back}?error=${encodeURIComponent(friendlyError(error.message, error.code))}`)
  revalidatePath(back)
}

export async function completeTask(formData: FormData): Promise<void> {
  const id = text(formData, '__id')
  const back = safePath(text(formData, '__return'), '/')
  if (!UUID.test(id)) redirect(back)
  const supabase = await createClient()
  const { data, error } = await supabase.from('tasks').update({ status: 'completed' }).eq('id', id).select('id')
  if (error || !data || data.length === 0) {
    redirect(`${back}${back.includes('?') ? '&' : '?'}error=${encodeURIComponent('Could not complete that task.')}`)
  }
  revalidatePath(back)
}

// -----------------------------------------------------------------------------
// Opportunity products
// -----------------------------------------------------------------------------
export async function addLineItem(formData: FormData): Promise<void> {
  const opportunityId = text(formData, 'opportunity_id')
  const productId = text(formData, 'product_id')
  const back = `/opportunities/${opportunityId}`
  if (!UUID.test(opportunityId) || !UUID.test(productId)) {
    redirect(`${back}?error=${encodeURIComponent('Choose a product.')}`)
  }

  const quantity = Number(text(formData, 'quantity') || '1')
  const discount = Number(text(formData, 'discount') || '0')
  if (!(quantity > 0)) redirect(`${back}?error=${encodeURIComponent('Quantity must be greater than zero.')}`)
  if (!(discount >= 0 && discount <= 100)) redirect(`${back}?error=${encodeURIComponent('Discount must be between 0 and 100.')}`)

  const supabase = await createClient()
  let unitPrice = Number(text(formData, 'unit_price'))
  if (!text(formData, 'unit_price') || !Number.isFinite(unitPrice)) {
    const { data: product } = await supabase.from('products').select('unit_price').eq('id', productId).single()
    unitPrice = Number((product as { unit_price: number } | null)?.unit_price ?? 0)
  }

  const { error } = await supabase.from('opportunity_line_items').insert({
    opportunity_id: opportunityId,
    product_id: productId,
    quantity,
    unit_price: unitPrice,
    discount,
  })
  if (error) redirect(`${back}?error=${encodeURIComponent(friendlyError(error.message, error.code))}`)
  revalidatePath(back)
}

export async function deleteLineItem(formData: FormData): Promise<void> {
  const id = text(formData, '__id')
  const opportunityId = text(formData, 'opportunity_id')
  const back = `/opportunities/${opportunityId}`
  const supabase = await createClient()
  const { data, error } = await supabase.from('opportunity_line_items').delete().eq('id', id).select('id')
  if (error || !data || data.length === 0) {
    redirect(`${back}?error=${encodeURIComponent('Could not remove that product.')}`)
  }
  revalidatePath(back)
}

// -----------------------------------------------------------------------------
// Pipeline drag and drop
// -----------------------------------------------------------------------------
export async function moveOpportunity(id: string, stage: string): Promise<ActionResult> {
  if (!UUID.test(id) || !STAGES.some((s) => s.value === stage)) return { error: 'Invalid stage.' }
  const supabase = await createClient()
  const { data, error } = await supabase.from('opportunities').update({ stage }).eq('id', id).select('id')
  if (error) return { error: friendlyError(error.message, error.code) }
  if (!data || data.length === 0) return { error: 'You do not have permission to edit this opportunity.' }
  revalidatePath('/pipeline')
  revalidatePath('/')
  return { error: null }
}

// -----------------------------------------------------------------------------
// Lead conversion
// -----------------------------------------------------------------------------
export async function convertLead(_prev: FormState, formData: FormData): Promise<FormState> {
  const leadId = text(formData, 'lead_id')
  const mode = text(formData, 'account_mode')
  const accountId = text(formData, 'account_id')
  const createOpp = formData.get('create_opportunity') === 'on'
  const oppName = text(formData, 'opportunity_name')

  if (!UUID.test(leadId)) return { error: 'Unknown lead.', values: null }
  if (mode === 'existing' && !UUID.test(accountId)) return { error: 'Choose an existing account.', values: null }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('convert_lead', {
    p_lead_id: leadId,
    p_account_id: mode === 'existing' ? accountId : null,
    p_create_opportunity: createOpp,
    p_opportunity_name: oppName || null,
  })
  if (error) return { error: friendlyError(error.message, error.code), values: null }

  const result = data as { account_id: string; contact_id: string; opportunity_id: string | null }
  revalidatePath('/leads')
  redirect(result.opportunity_id ? `/opportunities/${result.opportunity_id}?converted=1` : `/accounts/${result.account_id}?converted=1`)
}

// -----------------------------------------------------------------------------
// Demo data
// -----------------------------------------------------------------------------
export async function loadDemoData(_prev: ActionResult, _formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('seed_demo_data')
  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { error: null }
}

// -----------------------------------------------------------------------------
// Session
// -----------------------------------------------------------------------------
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
