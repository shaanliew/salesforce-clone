import Link from 'next/link'
import { completeTask, quickCreate } from '@/app/actions'
import { OBJECTS, getField, optionLabel } from '@/lib/objects'
import { formatDate, isoDate } from '@/lib/format'
import { DateTimeInput } from './DateTimeInput'
import { LocalTime } from './LocalTime'
import { SubmitButton } from './ConfirmButton'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

type Props = {
  links: Record<string, string>
  returnPath: string
  openTasks: Row[]
  doneTasks: Row[]
  events: Row[]
  notes: Row[]
}

function Hidden({ links, returnPath, kind }: { links: Record<string, string>; returnPath: string; kind: string }) {
  return (
    <>
      <input type="hidden" name="__kind" value={kind} />
      <input type="hidden" name="__return" value={returnPath} />
      {Object.entries(links).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
    </>
  )
}

/** Activity composer and timeline shown beside a record. */
export function ActivityPanel({ links, returnPath, openTasks, doneTasks, events, notes }: Props) {
  const taskType = getField(OBJECTS.tasks, 'type')!
  const today = isoDate()
  const nowIso = new Date().toISOString()
  const upcomingEvents = events.filter((e) => e.end_at >= nowIso)
  const pastEvents = events.filter((e) => e.end_at < nowIso)

  type Item = { key: string; when: string; node: React.ReactNode }
  const history: Item[] = [
    ...doneTasks.map((t) => ({
      key: `t${t.id}`,
      when: t.completed_at ?? t.updated_at,
      node: (
        <>
          <span className="tl-dot tl-task" />
          <div>
            <Link href={`/tasks/${t.id}`}>{t.subject}</Link>
            <small className="muted">
              {optionLabel(taskType, t.type)} completed · <LocalTime value={t.completed_at ?? t.updated_at} />
            </small>
          </div>
        </>
      ),
    })),
    ...pastEvents.map((e) => ({
      key: `e${e.id}`,
      when: e.start_at,
      node: (
        <>
          <span className="tl-dot tl-event" />
          <div>
            <Link href={`/events/${e.id}`}>{e.subject}</Link>
            <small className="muted">
              Event · <LocalTime value={e.start_at} />
            </small>
          </div>
        </>
      ),
    })),
    ...notes.map((n) => ({
      key: `n${n.id}`,
      when: n.created_at,
      node: (
        <>
          <span className="tl-dot tl-note" />
          <div>
            <Link href={`/notes/${n.id}`}>{n.title || 'Note'}</Link>
            <p className="note-body">{n.body}</p>
            <small className="muted">
              <LocalTime value={n.created_at} />
            </small>
          </div>
        </>
      ),
    })),
  ].sort((a, b) => (a.when < b.when ? 1 : -1))

  return (
    <aside className="card activity">
      <div className="card-header">
        <h2>Activity</h2>
      </div>

      <div className="composer">
        <details open>
          <summary>New Task</summary>
          <form action={quickCreate} className="stack">
            <Hidden links={links} returnPath={returnPath} kind="task" />
            <input name="subject" placeholder="Subject (e.g. Call to follow up)" required />
            <div className="row">
              <select name="type" defaultValue="task" aria-label="Type">
                <option value="task">Task</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
              </select>
              <input name="due_date" type="date" aria-label="Due date" defaultValue={isoDate(1)} />
            </div>
            <SubmitButton className="btn btn-brand btn-sm">Save task</SubmitButton>
          </form>
        </details>
        <details>
          <summary>Log a Note</summary>
          <form action={quickCreate} className="stack">
            <Hidden links={links} returnPath={returnPath} kind="note" />
            <input name="title" placeholder="Title (optional)" />
            <textarea name="body" rows={3} placeholder="What happened?" required />
            <SubmitButton className="btn btn-brand btn-sm">Save note</SubmitButton>
          </form>
        </details>
        <details>
          <summary>New Event</summary>
          <form action={quickCreate} className="stack">
            <Hidden links={links} returnPath={returnPath} kind="event" />
            <input name="subject" placeholder="Subject (e.g. Demo meeting)" required />
            <DateTimeInput name="start_at" required />
            <div className="row">
              <select name="duration" defaultValue="60" aria-label="Duration">
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="480">All day</option>
              </select>
              <input name="location" placeholder="Location" />
            </div>
            <SubmitButton className="btn btn-brand btn-sm">Save event</SubmitButton>
          </form>
        </details>
      </div>

      <h3 className="tl-heading">Upcoming &amp; Overdue</h3>
      {openTasks.length === 0 && upcomingEvents.length === 0 && <p className="muted small pad-x">No next steps. Add a task to keep things moving.</p>}
      <ul className="timeline">
        {openTasks.map((t) => (
          <li key={t.id}>
            <form action={completeTask}>
              <input type="hidden" name="__id" value={t.id} />
              <input type="hidden" name="__return" value={returnPath} />
              <button className="check-btn" title="Mark complete" aria-label={`Complete ${t.subject}`} />
            </form>
            <div>
              <Link href={`/tasks/${t.id}`}>{t.subject}</Link>
              <small className={t.due_date && t.due_date < today ? 'overdue' : 'muted'}>
                {optionLabel(taskType, t.type)}
                {t.due_date ? ` · Due ${formatDate(t.due_date)}` : ''}
                {t.owner_id_ref ? ` · ${t.owner_id_ref.full_name ?? ''}` : ''}
              </small>
            </div>
          </li>
        ))}
        {upcomingEvents.map((e) => (
          <li key={e.id}>
            <span className="tl-dot tl-event" />
            <div>
              <Link href={`/events/${e.id}`}>{e.subject}</Link>
              <small className="muted">
                <LocalTime value={e.start_at} />
                {e.location ? ` · ${e.location}` : ''}
              </small>
            </div>
          </li>
        ))}
      </ul>

      <h3 className="tl-heading">Past Activity</h3>
      {history.length === 0 && <p className="muted small pad-x">No past activity.</p>}
      <ul className="timeline">
        {history.map((h) => (
          <li key={h.key}>{h.node}</li>
        ))}
      </ul>
    </aside>
  )
}
