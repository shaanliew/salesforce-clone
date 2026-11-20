import type { ObjectDef } from '@/lib/objects'

export function ObjectIcon({ def, size = 'md' }: { def: Pick<ObjectDef, 'abbr' | 'color'>; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`obj-icon obj-icon-${size}`} style={{ background: def.color }} aria-hidden>
      {def.abbr}
    </span>
  )
}
