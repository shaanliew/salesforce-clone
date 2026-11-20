import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { NAV, OBJECTS, humanize } from '@/lib/objects'
import { signOut } from '@/app/actions'
import { Logo } from '@/components/Logo'
import { NavTabs } from '@/components/NavTabs'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name,email,role').eq('id', user.id).maybeSingle()
  const name: string = profile?.full_name || profile?.email || user.email || 'User'
  const initials = name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase())
    .join('')

  const items = [
    { href: '/', label: 'Home' },
    ...NAV.slice(0, 4).map((k) => ({ href: `/${k}`, label: OBJECTS[k].plural })),
    { href: '/pipeline', label: 'Pipeline' },
    ...NAV.slice(4).map((k) => ({ href: `/${k}`, label: OBJECTS[k].plural })),
  ]

  return (
    <div className="app">
      <header className="topbar">
        <Link href="/" className="brand">
          <Logo />
          <span>Nimbus CRM</span>
        </Link>
        <form action="/search" className="global-search" role="search">
          <input type="search" name="q" placeholder="Search accounts, contacts, leads, opportunities…" aria-label="Search" />
        </form>
        <details className="user-menu">
          <summary aria-label="Account menu">
            <span className="avatar">{initials || 'U'}</span>
          </summary>
          <div className="menu">
            <div className="menu-head">
              <strong>{name}</strong>
              <span>{profile?.email ?? user.email}</span>
              {profile?.role && <span className="badge badge-blue">{humanize(String(profile.role))}</span>}
            </div>
            <Link href={`/users/${user.id}`}>My profile</Link>
            <Link href="/users">Users</Link>
            <form action={signOut}>
              <button type="submit">Log out</button>
            </form>
          </div>
        </details>
      </header>
      <NavTabs items={items} />
      <main className="content">{children}</main>
    </div>
  )
}
