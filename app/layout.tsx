import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Nimbus CRM', template: '%s | Nimbus CRM' },
  description: 'Leads, accounts, opportunities, cases and campaigns — a Salesforce-style CRM on Supabase.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
