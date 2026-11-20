'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { moveOpportunity } from '@/app/actions'
import type { Option } from '@/lib/objects'
import { formatCurrency, formatDate } from '@/lib/format'

export type BoardCard = {
  id: string
  name: string
  stage: string
  amount: number | null
  close_date: string
  account: string | null
  owner: string | null
}

/** Drag-and-drop kanban of opportunities by stage. */
export function PipelineBoard({ stages, initial }: { stages: Option[]; initial: BoardCard[] }) {
  const router = useRouter()
  const [cards, setCards] = useState(initial)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function move(id: string, stage: string) {
    const card = cards.find((c) => c.id === id)
    if (!card || card.stage === stage) return
    const previous = card.stage
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, stage } : c)))
    setError(null)
    startTransition(async () => {
      const result = await moveOpportunity(id, stage)
      if (result.error) {
        setCards((cs) => cs.map((c) => (c.id === id ? { ...c, stage: previous } : c)))
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <>
      {error && <div className="alert alert-error">{error}</div>}
      <div className={pending ? 'board saving' : 'board'}>
        {stages.map((stage) => {
          const column = cards.filter((c) => c.stage === stage.value)
          const total = column.reduce((t, c) => t + Number(c.amount ?? 0), 0)
          return (
            <section
              key={stage.value}
              className={`board-col ${overStage === stage.value ? 'over' : ''} ${stage.value}`}
              onDragOver={(e) => {
                e.preventDefault()
                setOverStage(stage.value)
              }}
              onDragLeave={() => setOverStage((s) => (s === stage.value ? null : s))}
              onDrop={(e) => {
                e.preventDefault()
                setOverStage(null)
                const id = e.dataTransfer.getData('text/plain') || dragId
                if (id) move(id, stage.value)
              }}
            >
              <header>
                <h2>{stage.label}</h2>
                <span>
                  {formatCurrency(total, true)} · {column.length}
                </span>
              </header>
              <div className="board-cards">
                {column.map((c) => (
                  <article
                    key={c.id}
                    className={dragId === c.id ? 'board-card dragging' : 'board-card'}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', c.id)
                      e.dataTransfer.effectAllowed = 'move'
                      setDragId(c.id)
                    }}
                    onDragEnd={() => setDragId(null)}
                  >
                    <Link href={`/opportunities/${c.id}`}>{c.name}</Link>
                    {c.account && <span className="muted small">{c.account}</span>}
                    <div className="board-card-meta">
                      <strong>{formatCurrency(c.amount)}</strong>
                      <span className="muted small">{formatDate(c.close_date)}</span>
                    </div>
                    <select
                      className="board-move"
                      aria-label={`Move ${c.name} to stage`}
                      value={c.stage}
                      onChange={(e) => move(c.id, e.target.value)}
                    >
                      {stages.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </article>
                ))}
                {column.length === 0 && <p className="board-empty">Drop here</p>}
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}
