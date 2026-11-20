import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="auth-page">
      <div className="auth-card center">
        <h1>Not found</h1>
        <p className="muted">That page or record doesn’t exist, or you don’t have access to it.</p>
        <Link href="/" className="btn btn-brand">
          Go home
        </Link>
      </div>
    </main>
  )
}
