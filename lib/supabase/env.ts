// Public Supabase settings. The URL and publishable key are safe to ship to the
// browser (row level security protects the data). The defaults point at the
// project this repo was built against; override them with environment
// variables to use your own project.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zfwivtpbpbfsmvhrzgfw.supabase.co'

export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_dwjWRAXBTyvbozxFO4fgEA_QZWiApnw'
