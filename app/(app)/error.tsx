'use client'

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page narrow">
      <div className="card pad">
        <h1>Something went wrong</h1>
        <p className="muted">{error.message || 'An unexpected error occurred.'}</p>
        <button className="btn btn-brand" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </div>
  )
}
