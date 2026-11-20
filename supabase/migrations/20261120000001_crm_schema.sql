-- =============================================================================
-- Nimbus CRM — core schema
-- A Salesforce-style CRM data model: Leads, Accounts, Contacts, Opportunities
-- (with products / line items), Cases, Campaigns, Tasks, Events and Notes.
--
-- Security model (single organisation per Supabase project):
--   * Every signed-in user can read every CRM record (a "public read" org-wide
--     default, like a typical Salesforce org).
--   * Records have an owner. The owner, or any manager/admin, can edit and
--     delete a record.
--   * The first user to sign up becomes an admin; everyone after is a rep.
--     Only admins can change roles.
-- =============================================================================

create schema if not exists private;
grant usage on schema private to authenticated;

-- -----------------------------------------------------------------------------
-- Picklists (enums)
-- -----------------------------------------------------------------------------
create type public.user_role             as enum ('admin', 'manager', 'rep');
create type public.account_type          as enum ('prospect', 'customer', 'partner', 'competitor', 'other');
create type public.rating                as enum ('hot', 'warm', 'cold');
create type public.lead_source           as enum ('web', 'phone_inquiry', 'partner_referral', 'trade_show', 'advertisement', 'word_of_mouth', 'other');
create type public.lead_status           as enum ('new', 'working', 'nurturing', 'qualified', 'unqualified', 'converted');
create type public.opportunity_stage     as enum ('prospecting', 'qualification', 'needs_analysis', 'value_proposition', 'proposal', 'negotiation', 'closed_won', 'closed_lost');
create type public.opportunity_type      as enum ('new_business', 'existing_upgrade', 'existing_renewal');
create type public.case_status           as enum ('new', 'working', 'escalated', 'closed');
create type public.case_priority         as enum ('low', 'medium', 'high', 'critical');
create type public.case_origin           as enum ('email', 'phone', 'web', 'chat');
create type public.campaign_type         as enum ('email', 'webinar', 'event', 'advertisement', 'social', 'other');
create type public.campaign_status       as enum ('planned', 'in_progress', 'completed', 'aborted');
create type public.campaign_member_status as enum ('sent', 'responded', 'attended', 'converted');
create type public.task_type             as enum ('task', 'call', 'email', 'meeting');
create type public.task_status           as enum ('not_started', 'in_progress', 'completed', 'deferred');
create type public.task_priority         as enum ('low', 'normal', 'high');

-- -----------------------------------------------------------------------------
-- Users (profiles mirror auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  title       text,
  phone       text,
  role        public.user_role not null default 'rep',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'CRM users. One row per auth.users row, created by trigger.';

-- -----------------------------------------------------------------------------
-- Accounts
-- -----------------------------------------------------------------------------
create table public.accounts (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (length(trim(name)) > 0),
  account_number      text,
  type                public.account_type default 'prospect',
  industry            text,
  rating              public.rating,
  website             text,
  phone               text,
  annual_revenue      numeric(18, 2) check (annual_revenue >= 0),
  employees           integer check (employees >= 0),
  parent_account_id   uuid references public.accounts (id) on delete set null,
  billing_street      text,
  billing_city        text,
  billing_state       text,
  billing_postal_code text,
  billing_country     text,
  description         text,
  owner_id            uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Contacts
-- -----------------------------------------------------------------------------
create table public.contacts (
  id                  uuid primary key default gen_random_uuid(),
  account_id          uuid references public.accounts (id) on delete set null,
  reports_to_id       uuid references public.contacts (id) on delete set null,
  salutation          text,
  first_name          text,
  last_name           text not null check (length(trim(last_name)) > 0),
  title               text,
  department          text,
  email               text,
  phone               text,
  mobile_phone        text,
  lead_source         public.lead_source,
  birthdate           date,
  mailing_street      text,
  mailing_city        text,
  mailing_state       text,
  mailing_postal_code text,
  mailing_country     text,
  description         text,
  owner_id            uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Campaigns (declared before leads/opportunities, which reference them)
-- -----------------------------------------------------------------------------
create table public.campaigns (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (length(trim(name)) > 0),
  type              public.campaign_type default 'email',
  status            public.campaign_status not null default 'planned',
  start_date        date,
  end_date          date,
  budgeted_cost     numeric(18, 2) check (budgeted_cost >= 0),
  actual_cost       numeric(18, 2) check (actual_cost >= 0),
  expected_revenue  numeric(18, 2) check (expected_revenue >= 0),
  is_active         boolean not null default true,
  description       text,
  owner_id          uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

-- -----------------------------------------------------------------------------
-- Leads
-- -----------------------------------------------------------------------------
create table public.leads (
  id                        uuid primary key default gen_random_uuid(),
  salutation                text,
  first_name                text,
  last_name                 text not null check (length(trim(last_name)) > 0),
  company                   text not null check (length(trim(company)) > 0),
  title                     text,
  email                     text,
  phone                     text,
  website                   text,
  status                    public.lead_status not null default 'new',
  rating                    public.rating,
  lead_source               public.lead_source,
  industry                  text,
  annual_revenue            numeric(18, 2) check (annual_revenue >= 0),
  employees                 integer check (employees >= 0),
  street                    text,
  city                      text,
  state                     text,
  postal_code               text,
  country                   text,
  description               text,
  campaign_id               uuid references public.campaigns (id) on delete set null,
  converted_at              timestamptz,
  converted_account_id      uuid references public.accounts (id) on delete set null,
  converted_contact_id      uuid references public.contacts (id) on delete set null,
  converted_opportunity_id  uuid,  -- FK added after opportunities exists
  owner_id                  uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Opportunities
-- -----------------------------------------------------------------------------
create table public.opportunities (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (length(trim(name)) > 0),
  account_id       uuid references public.accounts (id) on delete set null,
  contact_id       uuid references public.contacts (id) on delete set null,
  campaign_id      uuid references public.campaigns (id) on delete set null,
  type             public.opportunity_type default 'new_business',
  stage            public.opportunity_stage not null default 'prospecting',
  probability      integer check (probability between 0 and 100),
  amount           numeric(18, 2) check (amount >= 0),
  close_date       date not null default (current_date + 30),
  lead_source      public.lead_source,
  next_step        text,
  description      text,
  is_closed        boolean generated always as (stage in ('closed_won', 'closed_lost')) stored,
  is_won           boolean generated always as (stage = 'closed_won') stored,
  expected_revenue numeric(18, 2) generated always as (round(coalesce(amount, 0) * coalesce(probability, 0) / 100.0, 2)) stored,
  owner_id         uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.leads
  add constraint leads_converted_opportunity_id_fkey
  foreign key (converted_opportunity_id) references public.opportunities (id) on delete set null;

-- -----------------------------------------------------------------------------
-- Products & opportunity line items
-- -----------------------------------------------------------------------------
create table public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(trim(name)) > 0),
  product_code text unique,
  family       text,
  description  text,
  unit_price   numeric(18, 2) not null default 0 check (unit_price >= 0),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.opportunity_line_items (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  uuid not null references public.opportunities (id) on delete cascade,
  product_id      uuid not null references public.products (id) on delete restrict,
  quantity        numeric(12, 2) not null default 1 check (quantity > 0),
  unit_price      numeric(18, 2) not null check (unit_price >= 0),
  discount        numeric(5, 2) not null default 0 check (discount between 0 and 100),
  total_price     numeric(18, 2) generated always as (round(quantity * unit_price * (1 - discount / 100.0), 2)) stored,
  description     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Cases (customer support)
-- -----------------------------------------------------------------------------
create table public.cases (
  id           uuid primary key default gen_random_uuid(),
  case_number  bigint generated always as identity (start with 1001) unique,
  subject      text not null check (length(trim(subject)) > 0),
  description  text,
  status       public.case_status not null default 'new',
  priority     public.case_priority not null default 'medium',
  origin       public.case_origin,
  type         text,
  account_id   uuid references public.accounts (id) on delete set null,
  contact_id   uuid references public.contacts (id) on delete set null,
  resolution   text,
  closed_at    timestamptz,
  owner_id     uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Campaign members (a lead OR a contact in a campaign)
-- -----------------------------------------------------------------------------
create table public.campaign_members (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.campaigns (id) on delete cascade,
  lead_id      uuid references public.leads (id) on delete cascade,
  contact_id   uuid references public.contacts (id) on delete cascade,
  status       public.campaign_member_status not null default 'sent',
  owner_id     uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (num_nonnulls(lead_id, contact_id) = 1)
);
create unique index campaign_members_campaign_lead_key    on public.campaign_members (campaign_id, lead_id)    where lead_id is not null;
create unique index campaign_members_campaign_contact_key on public.campaign_members (campaign_id, contact_id) where contact_id is not null;

-- -----------------------------------------------------------------------------
-- Activities: tasks, events, notes. Each can relate to any of the core records.
-- -----------------------------------------------------------------------------
create table public.tasks (
  id              uuid primary key default gen_random_uuid(),
  subject         text not null check (length(trim(subject)) > 0),
  type            public.task_type not null default 'task',
  status          public.task_status not null default 'not_started',
  priority        public.task_priority not null default 'normal',
  due_date        date,
  description     text,
  completed_at    timestamptz,
  account_id      uuid references public.accounts (id) on delete cascade,
  contact_id      uuid references public.contacts (id) on delete cascade,
  lead_id         uuid references public.leads (id) on delete cascade,
  opportunity_id  uuid references public.opportunities (id) on delete cascade,
  case_id         uuid references public.cases (id) on delete cascade,
  owner_id        uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.events (
  id              uuid primary key default gen_random_uuid(),
  subject         text not null check (length(trim(subject)) > 0),
  start_at        timestamptz not null,
  end_at          timestamptz not null,
  all_day         boolean not null default false,
  location        text,
  description     text,
  account_id      uuid references public.accounts (id) on delete cascade,
  contact_id      uuid references public.contacts (id) on delete cascade,
  lead_id         uuid references public.leads (id) on delete cascade,
  opportunity_id  uuid references public.opportunities (id) on delete cascade,
  case_id         uuid references public.cases (id) on delete cascade,
  owner_id        uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (end_at >= start_at)
);

create table public.notes (
  id              uuid primary key default gen_random_uuid(),
  title           text,
  body            text not null check (length(trim(body)) > 0),
  account_id      uuid references public.accounts (id) on delete cascade,
  contact_id      uuid references public.contacts (id) on delete cascade,
  lead_id         uuid references public.leads (id) on delete cascade,
  opportunity_id  uuid references public.opportunities (id) on delete cascade,
  case_id         uuid references public.cases (id) on delete cascade,
  owner_id        uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Indexes on foreign keys and common filters
-- -----------------------------------------------------------------------------
create index on public.accounts (parent_account_id);
create index on public.accounts (lower(name));
create index on public.contacts (account_id);
create index on public.contacts (reports_to_id);
create index on public.leads (status);
create index on public.leads (campaign_id);
create index on public.leads (converted_account_id);
create index on public.leads (converted_contact_id);
create index on public.leads (converted_opportunity_id);
create index on public.opportunities (account_id);
create index on public.opportunities (contact_id);
create index on public.opportunities (campaign_id);
create index on public.opportunities (stage);
create index on public.opportunities (close_date);
create index on public.opportunity_line_items (opportunity_id);
create index on public.opportunity_line_items (product_id);
create index on public.cases (account_id);
create index on public.cases (contact_id);
create index on public.cases (status);
create index on public.campaign_members (lead_id);
create index on public.campaign_members (contact_id);
create index on public.tasks (account_id);
create index on public.tasks (contact_id);
create index on public.tasks (lead_id);
create index on public.tasks (opportunity_id);
create index on public.tasks (case_id);
create index on public.tasks (due_date);
create index on public.events (account_id);
create index on public.events (contact_id);
create index on public.events (lead_id);
create index on public.events (opportunity_id);
create index on public.events (case_id);
create index on public.events (start_at);
create index on public.notes (account_id);
create index on public.notes (contact_id);
create index on public.notes (lead_id);
create index on public.notes (opportunity_id);
create index on public.notes (case_id);

-- =============================================================================
-- Helper functions (private schema: not exposed through the Data API)
-- =============================================================================
create or replace function private.current_user_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create or replace function private.is_manager_or_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select role from public.profiles where id = (select auth.uid())) in ('admin', 'manager'), false)
$$;

create or replace function private.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select role from public.profiles where id = (select auth.uid())) = 'admin', false)
$$;

revoke all on function private.current_user_role()   from public, anon;
revoke all on function private.is_manager_or_admin() from public, anon;
revoke all on function private.is_admin()            from public, anon;
grant execute on function private.current_user_role()   to authenticated;
grant execute on function private.is_manager_or_admin() to authenticated;
grant execute on function private.is_admin()            to authenticated;

-- updated_at maintenance
create or replace function private.set_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- New auth user -> profile. First user becomes admin.
create or replace function private.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    case when exists (select 1 from public.profiles) then 'rep'::public.user_role
         else 'admin'::public.user_role end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Only admins may change a user's role (SQL editor / service role is unrestricted).
create or replace function private.protect_profile_role()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and (select auth.uid()) is not null
     and not private.is_admin() then
    raise exception 'Only admins can change user roles';
  end if;
  return new;
end;
$$;

create trigger protect_profile_role
  before update on public.profiles
  for each row execute function private.protect_profile_role();

-- Opportunity probability follows the stage unless set explicitly.
create or replace function private.opportunity_stage_defaults()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  default_probability integer := case new.stage
    when 'prospecting'       then 10
    when 'qualification'     then 20
    when 'needs_analysis'    then 30
    when 'value_proposition' then 50
    when 'proposal'          then 70
    when 'negotiation'       then 90
    when 'closed_won'        then 100
    when 'closed_lost'       then 0
  end;
begin
  if tg_op = 'INSERT' then
    if new.probability is null then
      new.probability := default_probability;
    end if;
  elsif new.stage is distinct from old.stage
        and new.probability is not distinct from old.probability then
    new.probability := default_probability;
  end if;
  return new;
end;
$$;

create trigger opportunity_stage_defaults
  before insert or update on public.opportunities
  for each row execute function private.opportunity_stage_defaults();

-- Roll up line item totals into the opportunity amount.
create or replace function private.rollup_opportunity_amount()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  opp_id uuid := coalesce(new.opportunity_id, old.opportunity_id);
begin
  update public.opportunities o
     set amount = (select coalesce(sum(li.total_price), 0)
                     from public.opportunity_line_items li
                    where li.opportunity_id = opp_id)
   where o.id = opp_id;
  if tg_op = 'UPDATE' and new.opportunity_id is distinct from old.opportunity_id then
    update public.opportunities o
       set amount = (select coalesce(sum(li.total_price), 0)
                       from public.opportunity_line_items li
                      where li.opportunity_id = old.opportunity_id)
     where o.id = old.opportunity_id;
  end if;
  return null;
end;
$$;

create trigger rollup_opportunity_amount
  after insert or update or delete on public.opportunity_line_items
  for each row execute function private.rollup_opportunity_amount();

-- Cases: stamp closed_at.
create or replace function private.case_closed_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.status = 'closed' and (tg_op = 'INSERT' or old.status is distinct from 'closed') then
    new.closed_at := now();
  elsif new.status <> 'closed' then
    new.closed_at := null;
  end if;
  return new;
end;
$$;

create trigger case_closed_at
  before insert or update on public.cases
  for each row execute function private.case_closed_at();

-- Tasks: stamp completed_at.
create or replace function private.task_completed_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    new.completed_at := now();
  elsif new.status <> 'completed' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger task_completed_at
  before insert or update on public.tasks
  for each row execute function private.task_completed_at();

-- updated_at triggers on every table
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'accounts', 'contacts', 'campaigns', 'leads', 'opportunities',
    'products', 'opportunity_line_items', 'cases', 'campaign_members',
    'tasks', 'events', 'notes'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function private.set_updated_at()', t);
  end loop;
end;
$$;

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- Profiles: everyone signed in can see the user list; you edit yourself,
-- admins edit anyone (role changes are guarded by trigger).
alter table public.profiles enable row level security;
create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));

-- Owned CRM records: read all, write if owner or manager/admin.
do $$
declare
  t text;
begin
  foreach t in array array[
    'accounts', 'contacts', 'campaigns', 'leads', 'opportunities', 'cases',
    'campaign_members', 'tasks', 'events', 'notes'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create index on public.%I (owner_id)', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      t || '_select', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check ((select auth.uid()) is not null)',
      t || '_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using (owner_id = (select auth.uid()) or (select private.is_manager_or_admin()))
         with check ((select auth.uid()) is not null)',
      t || '_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated
         using (owner_id = (select auth.uid()) or (select private.is_manager_or_admin()))',
      t || '_delete', t);
  end loop;
end;
$$;

-- Products (the price book): everyone reads; managers/admins maintain.
alter table public.products enable row level security;
create policy products_select on public.products
  for select to authenticated using (true);
create policy products_insert on public.products
  for insert to authenticated with check ((select private.is_manager_or_admin()));
create policy products_update on public.products
  for update to authenticated
  using ((select private.is_manager_or_admin()))
  with check ((select private.is_manager_or_admin()));
create policy products_delete on public.products
  for delete to authenticated using ((select private.is_admin()));

-- Line items: follow the parent opportunity's edit rights.
alter table public.opportunity_line_items enable row level security;
create policy line_items_select on public.opportunity_line_items
  for select to authenticated using (true);
create policy line_items_insert on public.opportunity_line_items
  for insert to authenticated
  with check (exists (
    select 1 from public.opportunities o
     where o.id = opportunity_id
       and (o.owner_id = (select auth.uid()) or (select private.is_manager_or_admin()))));
create policy line_items_update on public.opportunity_line_items
  for update to authenticated
  using (exists (
    select 1 from public.opportunities o
     where o.id = opportunity_id
       and (o.owner_id = (select auth.uid()) or (select private.is_manager_or_admin()))))
  with check (exists (
    select 1 from public.opportunities o
     where o.id = opportunity_id
       and (o.owner_id = (select auth.uid()) or (select private.is_manager_or_admin()))));
create policy line_items_delete on public.opportunity_line_items
  for delete to authenticated
  using (exists (
    select 1 from public.opportunities o
     where o.id = opportunity_id
       and (o.owner_id = (select auth.uid()) or (select private.is_manager_or_admin()))));

-- Data API privileges: signed-in users only. RLS does the rest.
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
