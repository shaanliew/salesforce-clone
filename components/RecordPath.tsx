import { setField } from '@/app/actions'
import type { FieldDef, ObjectDef } from '@/lib/objects'

/** Clickable status/stage "path" across the top of a record. */
export function RecordPath({ def, field, value, id, exclude = [] }: { def: ObjectDef; field: FieldDef; value: string; id: string; exclude?: string[] }) {
  const steps = (field.options ?? []).filter((o) => !exclude.includes(o.value) || o.value === value)
  const currentIndex = steps.findIndex((s) => s.value === value)
  const lost = value === 'closed_lost' || value === 'aborted' || value === 'unqualified'

  return (
    <div className="card path-card">
      <ol className="path">
        {steps.map((s, i) => {
          const state = i < currentIndex ? 'done' : i === currentIndex ? (lost ? 'current lost' : 'current') : 'todo'
          return (
            <li key={s.value} className={state}>
              <form action={setField}>
                <input type="hidden" name="__object" value={def.key} />
                <input type="hidden" name="__id" value={id} />
                <input type="hidden" name="__field" value={field.name} />
                <input type="hidden" name="value" value={s.value} />
                <button type="submit" disabled={i === currentIndex} title={i === currentIndex ? `Current ${field.label.toLowerCase()}` : `Mark as ${s.label}`}>
                  {i < currentIndex ? '✓ ' : ''}
                  {s.label}
                </button>
              </form>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
