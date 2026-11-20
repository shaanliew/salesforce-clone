import type { createClient } from './supabase/server'
import { OBJECTS, recordName, type ObjectDef, type ObjectKey, type Option } from './objects'
import { isoDate } from './format'

export type Supabase = Awaited<ReturnType<typeof createClient>>

/** Options for every lookup field on an object's form. */
export async function loadLookupOptions(supabase: Supabase, def: ObjectDef): Promise<Record<string, Option[]>> {
  const targets = new Set<ObjectKey>()
  for (const f of def.fields) if (f.type === 'lookup' && f.lookup && !f.readOnly) targets.add(f.lookup)

  const byTarget: Partial<Record<ObjectKey, Option[]>> = {}
  await Promise.all(
    [...targets].map(async (key) => {
      const target = OBJECTS[key]
      const sortColumn = key === 'contacts' || key === 'leads' ? 'last_name' : target.nameColumns[0]
      const { data } = await supabase
        .from(target.table)
        .select(['id', ...target.nameColumns].join(','))
        .order(sortColumn, { ascending: true })
        .limit(1000)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      byTarget[key] = ((data ?? []) as any[]).map((r) => ({
        value: r.id as string,
        label: key === 'leads' ? `${recordName(target, r)} (${r.company ?? ''})` : recordName(target, r),
      }))
    }),
  )

  const out: Record<string, Option[]> = {}
  for (const f of def.fields) if (f.type === 'lookup' && f.lookup) out[f.name] = byTarget[f.lookup] ?? []
  return out
}

/** Record values as strings for form inputs. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toFormValues(def: ObjectDef, rec: any): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of def.fields) {
    const v = rec?.[f.name]
    if (v === null || v === undefined) continue
    out[f.name] = typeof v === 'boolean' ? String(v) : String(v)
  }
  return out
}

/** Default values for a new record, merged with ?field=value prefills. */
export function newRecordValues(
  def: ObjectDef,
  userId: string,
  prefill: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of def.fields) {
    if (!f.default) continue
    if (f.default === '$me') out[f.name] = userId
    else if (f.default.startsWith('$today')) out[f.name] = isoDate(Number(f.default.replace('$today', '') || '0'))
    else out[f.name] = f.default
  }
  for (const f of def.fields) {
    const v = prefill[f.name]
    if (typeof v === 'string' && v) out[f.name] = v
  }
  return out
}
