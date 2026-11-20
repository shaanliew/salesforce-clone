import type { Metadata } from 'next'
import { Logo } from '@/components/Logo'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = { title: 'Log in' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return (
    <main className="auth-page">
      <div className="auth-brand">
        <Logo size={44} />
        <h1>Nimbus CRM</h1>
        <p>Pipeline, customers and service in one place.</p>
      </div>
      <LoginForm urlError={error} />
    </main>
  )
}
