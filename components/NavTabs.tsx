'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavTabs({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname()
  return (
    <nav className="nav-tabs" aria-label="Main">
      {items.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link key={item.href} href={item.href} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
