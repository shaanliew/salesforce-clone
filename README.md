# Nimbus CRM — a Salesforce-style CRM on Supabase

A working clone of the core Salesforce Sales & Service Cloud experience, built with **Next.js 15 (App Router)** and **Supabase** (Postgres, Auth, Row Level Security). Deploys to **Vercel** with zero configuration.

## Features

| Area | What you get |
| --- | --- |
| **Leads** | List views (open / mine / converted), status path, rating & source, **Lead Conversion** into Account + Contact + Opportunity (activities move to the new contact) |
| **Accounts** | Hierarchy (parent account), related Contacts, Opportunities, Cases, Child Accounts |
| **Contacts** | Linked to accounts, reports-to hierarchy, campaign history |
| **Opportunities** | Stage path with auto-probability, **drag-and-drop Pipeline board**, products / line items with discounts that roll up into the amount, expected revenue |
| **Cases** | Auto-numbered (from 1001), status path, priority & origin, closed-on stamping |
| **Campaigns** | Budget & ROI fields, campaign members (leads or contacts), influenced opportunities |
| **Activities** | Tasks, Events and Notes on any record, with a timeline, quick composer, and one-click task completion |
| **Products** | Price book maintained by managers/admins |
| **Home** | KPIs (open pipeline, won this quarter + win rate, open leads, open cases), pipeline-by-stage chart, my tasks, upcoming events |
| **Search** | Global search across all core objects plus per-list search, sorting and paging |
| **Users & roles** | Email/password auth. First sign-up becomes **admin**; others are **reps**. Admins can promote users to **manager** |

Every object is described once in [`lib/objects.ts`](lib/objects.ts) (fields, picklists, list views, related lists, highlights). List, detail, create and edit pages are generated from that metadata — add a column to the database and a field to the metadata to extend an object.

## Data model

```
profiles (users) ──┐ owner_id on every record
                   │
campaigns ──< campaign_members >── leads ──(convert)──► accounts / contacts / opportunities
    │                                │
    └──< opportunities >── accounts ─┴──< contacts
            │      │         │
            │      └─< opportunity_line_items >── products
            │
cases >── accounts, contacts

tasks / events / notes ──► account | contact | lead | opportunity | case
```

* Picklists are Postgres enums (`opportunity_stage`, `lead_status`, `case_priority`, …).
* Generated columns: `opportunities.is_closed`, `is_won`, `expected_revenue`; `opportunity_line_items.total_price`.
* Triggers: `updated_at`, stage → probability defaults, line-item → amount rollup, case `closed_at`, task `completed_at`, new auth user → profile.
* RPCs: `convert_lead(...)` and `seed_demo_data()` (both `SECURITY INVOKER`, so RLS applies).

### Security (RLS)

* Signed-in users can **read** all CRM records (a "public read only" org-wide default).
* A record's **owner**, or any **manager/admin**, can edit or delete it.
* Products: managers/admins maintain; only admins delete.
* Line items follow their opportunity's edit rights.
* Only admins can change roles (enforced by trigger). The `anon` role has no access to any table.

Migrations live in [`supabase/migrations`](supabase/migrations) and have already been applied to the Supabase project `salesforce-clone` (ref `zfwivtpbpbfsmvhrzgfw`, region `ap-southeast-1`).

## Run locally

```bash
npm install
cp .env.example .env.local   # optional — the defaults already point at the project
npm run dev
```

Open http://localhost:3000, sign up (the first user becomes admin) and click **Load sample data** on the Home page.

## Deploy to Vercel

1. In Vercel, **Add New → Project** and import this GitHub repository. The framework preset is detected as **Next.js**; no build settings need changing.
2. *(Recommended)* Add environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from `.env.example` (or from your own Supabase project). Without them the app falls back to the values in `lib/supabase/env.ts`.
3. Deploy.
4. In Supabase → **Authentication → URL Configuration**, set **Site URL** to your Vercel URL (e.g. `https://salesforce-clone.vercel.app`) and add `https://*.vercel.app/**` to **Redirect URLs**, so confirmation emails link back to the app. For quick testing you can instead turn off **Confirm email** under Authentication → Providers → Email.

## Use your own Supabase project

1. Create a project, then run the SQL files in `supabase/migrations` in order (SQL editor, or `supabase db push` with the Supabase CLI).
2. Set the two environment variables above to the new project's URL and publishable key.
3. Regenerate types if you want them: `npx supabase gen types typescript --project-id <ref> > lib/database.types.ts`.

## Project structure

```
app/
  (app)/                 authenticated app shell (top bar, tabs)
    page.tsx             Home dashboard
    [object]/            generic list view
    [object]/new         generic create form
    [object]/[id]        record page: highlights, path, related lists, activity
    [object]/[id]/edit   generic edit form
    [object]/[id]/convert  lead conversion
    pipeline/            drag-and-drop opportunity board
    search/              global search
  login/                 sign in / sign up
  auth/callback/         email-confirmation handler
  actions.ts             server actions (CRUD, path, activities, products, convert)
components/              UI building blocks
lib/objects.ts           object & field metadata
lib/supabase/            server & middleware clients
supabase/migrations/     schema, RLS, functions, seed price book
```

---

Not affiliated with or endorsed by Salesforce, Inc. "Salesforce" is a trademark of Salesforce, Inc.; this project uses its own name and design.
