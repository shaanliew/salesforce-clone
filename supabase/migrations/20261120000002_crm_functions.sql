-- =============================================================================
-- Nimbus CRM — RPC functions and starter data
-- All RPCs are SECURITY INVOKER, so row level security applies to the caller.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- convert_lead: turn a lead into an account (new or existing), a contact and,
-- optionally, an opportunity. Open activities move over to the new contact.
-- -----------------------------------------------------------------------------
create or replace function public.convert_lead(
  p_lead_id            uuid,
  p_account_id         uuid    default null,
  p_create_opportunity boolean default true,
  p_opportunity_name   text    default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  l              public.leads;
  v_account_id   uuid;
  v_contact_id   uuid;
  v_opp_id       uuid;
begin
  select * into l from public.leads where id = p_lead_id;
  if not found then
    raise exception 'Lead not found';
  end if;
  if l.status = 'converted' then
    raise exception 'This lead has already been converted';
  end if;
  if not (l.owner_id = (select auth.uid()) or private.is_manager_or_admin()) then
    raise exception 'Only the lead owner or a manager can convert this lead';
  end if;

  if p_account_id is null then
    insert into public.accounts (
      name, industry, rating, website, phone, annual_revenue, employees,
      billing_street, billing_city, billing_state, billing_postal_code, billing_country,
      type, owner_id
    ) values (
      l.company, l.industry, l.rating, l.website, l.phone, l.annual_revenue, l.employees,
      l.street, l.city, l.state, l.postal_code, l.country,
      'prospect', coalesce(l.owner_id, (select auth.uid()))
    )
    returning id into v_account_id;
  else
    v_account_id := p_account_id;
  end if;

  insert into public.contacts (
    account_id, salutation, first_name, last_name, title, email, phone, lead_source,
    mailing_street, mailing_city, mailing_state, mailing_postal_code, mailing_country,
    description, owner_id
  ) values (
    v_account_id, l.salutation, l.first_name, l.last_name, l.title, l.email, l.phone, l.lead_source,
    l.street, l.city, l.state, l.postal_code, l.country,
    l.description, coalesce(l.owner_id, (select auth.uid()))
  )
  returning id into v_contact_id;

  if p_create_opportunity then
    insert into public.opportunities (
      name, account_id, contact_id, campaign_id, lead_source, stage, owner_id
    ) values (
      coalesce(nullif(trim(p_opportunity_name), ''), l.company || ' - New Business'),
      v_account_id, v_contact_id, l.campaign_id, l.lead_source, 'qualification',
      coalesce(l.owner_id, (select auth.uid()))
    )
    returning id into v_opp_id;
  end if;

  update public.leads
     set status = 'converted',
         converted_at = now(),
         converted_account_id = v_account_id,
         converted_contact_id = v_contact_id,
         converted_opportunity_id = v_opp_id
   where id = p_lead_id;

  update public.tasks  set contact_id = v_contact_id, account_id = v_account_id where lead_id = p_lead_id;
  update public.events set contact_id = v_contact_id, account_id = v_account_id where lead_id = p_lead_id;
  update public.notes  set contact_id = v_contact_id, account_id = v_account_id where lead_id = p_lead_id;

  return jsonb_build_object(
    'account_id', v_account_id,
    'contact_id', v_contact_id,
    'opportunity_id', v_opp_id
  );
end;
$$;

revoke all on function public.convert_lead(uuid, uuid, boolean, text) from public, anon;
grant execute on function public.convert_lead(uuid, uuid, boolean, text) to authenticated;

-- -----------------------------------------------------------------------------
-- seed_demo_data: load a small, realistic data set owned by the caller.
-- -----------------------------------------------------------------------------
create or replace function public.seed_demo_data()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  a1 uuid; a2 uuid; a3 uuid; a4 uuid; a5 uuid;
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid; c6 uuid;
  o1 uuid; o2 uuid; o3 uuid; o4 uuid; o5 uuid; o6 uuid; o7 uuid;
  k1 uuid; k2 uuid;
  l1 uuid; l2 uuid;
  p_platform uuid; p_seats uuid; p_onboard uuid; p_support uuid;
begin
  if uid is null then
    raise exception 'You must be signed in';
  end if;
  if exists (select 1 from public.accounts where owner_id = uid and description like '[Demo]%') then
    raise exception 'Demo data is already loaded for your user';
  end if;

  select id into p_platform from public.products where product_code = 'PLAT-ENT';
  select id into p_seats    from public.products where product_code = 'SEAT-PRO';
  select id into p_onboard  from public.products where product_code = 'SVC-ONB';
  select id into p_support  from public.products where product_code = 'SUP-PREM';

  -- Accounts
  insert into public.accounts (name, type, industry, rating, website, phone, annual_revenue, employees, billing_city, billing_country, description, owner_id)
  values ('Acme Robotics', 'customer', 'Manufacturing', 'hot', 'https://acme-robotics.example', '+1 415 555 0100', 48000000, 320, 'San Francisco', 'United States', '[Demo] Long-standing customer; expanding to APAC.', uid)
  returning id into a1;
  insert into public.accounts (name, type, industry, rating, website, phone, annual_revenue, employees, billing_city, billing_country, description, owner_id)
  values ('Lumen Health Group', 'prospect', 'Healthcare', 'warm', 'https://lumenhealth.example', '+65 6555 0142', 125000000, 1400, 'Singapore', 'Singapore', '[Demo] Evaluating a patient-engagement rollout.', uid)
  returning id into a2;
  insert into public.accounts (name, type, industry, rating, website, phone, annual_revenue, employees, billing_city, billing_country, description, owner_id)
  values ('Northwind Logistics', 'customer', 'Transportation', 'warm', 'https://northwind.example', '+44 20 7946 0958', 72000000, 860, 'London', 'United Kingdom', '[Demo] Renewal due next quarter.', uid)
  returning id into a3;
  insert into public.accounts (name, type, industry, rating, website, phone, annual_revenue, employees, billing_city, billing_country, description, owner_id)
  values ('Bluepeak Financial', 'prospect', 'Financial Services', 'cold', 'https://bluepeak.example', '+61 2 5550 1234', 310000000, 2100, 'Sydney', 'Australia', '[Demo] Early conversations with the CIO office.', uid)
  returning id into a4;
  insert into public.accounts (name, type, industry, rating, website, phone, annual_revenue, employees, billing_city, billing_country, description, owner_id)
  values ('Tandem Software', 'partner', 'Technology', 'hot', 'https://tandem.example', '+1 512 555 0177', 18000000, 140, 'Austin', 'United States', '[Demo] Implementation partner.', uid)
  returning id into a5;

  -- Contacts
  insert into public.contacts (account_id, first_name, last_name, title, email, phone, lead_source, owner_id)
  values (a1, 'Maria', 'Chen', 'VP Operations', 'maria.chen@acme-robotics.example', '+1 415 555 0101', 'trade_show', uid) returning id into c1;
  insert into public.contacts (account_id, first_name, last_name, title, email, phone, lead_source, owner_id)
  values (a1, 'Daniel', 'Okafor', 'IT Director', 'd.okafor@acme-robotics.example', '+1 415 555 0102', 'trade_show', uid) returning id into c2;
  insert into public.contacts (account_id, first_name, last_name, title, email, phone, lead_source, owner_id)
  values (a2, 'Priya', 'Raman', 'Chief Digital Officer', 'priya.raman@lumenhealth.example', '+65 6555 0143', 'web', uid) returning id into c3;
  insert into public.contacts (account_id, first_name, last_name, title, email, phone, lead_source, owner_id)
  values (a3, 'Oliver', 'Grant', 'Head of Procurement', 'o.grant@northwind.example', '+44 20 7946 0959', 'partner_referral', uid) returning id into c4;
  insert into public.contacts (account_id, first_name, last_name, title, email, phone, lead_source, owner_id)
  values (a4, 'Sophie', 'Martin', 'CIO', 's.martin@bluepeak.example', '+61 2 5550 1235', 'advertisement', uid) returning id into c5;
  insert into public.contacts (account_id, first_name, last_name, title, email, phone, lead_source, owner_id)
  values (a5, 'Kenji', 'Watanabe', 'Partner Manager', 'kenji@tandem.example', '+1 512 555 0178', 'word_of_mouth', uid) returning id into c6;

  -- Campaigns
  insert into public.campaigns (name, type, status, start_date, end_date, budgeted_cost, actual_cost, expected_revenue, description, owner_id)
  values ('APAC Digital Summit', 'event', 'in_progress', current_date - 20, current_date + 10, 40000, 26500, 400000, '[Demo] Flagship regional event.', uid)
  returning id into k1;
  insert into public.campaigns (name, type, status, start_date, end_date, budgeted_cost, actual_cost, expected_revenue, description, owner_id)
  values ('Q4 Product Webinar Series', 'webinar', 'planned', current_date + 5, current_date + 60, 8000, 0, 150000, '[Demo] Three-part webinar series.', uid)
  returning id into k2;

  -- Opportunities
  insert into public.opportunities (name, account_id, contact_id, campaign_id, type, stage, amount, close_date, lead_source, next_step, owner_id)
  values ('Acme Robotics - APAC Expansion', a1, c1, k1, 'existing_upgrade', 'proposal', null, current_date + 21, 'trade_show', 'Send revised pricing', uid) returning id into o1;
  insert into public.opportunities (name, account_id, contact_id, type, stage, amount, close_date, lead_source, next_step, owner_id)
  values ('Lumen Health - Patient Engagement', a2, c3, 'new_business', 'needs_analysis', 260000, current_date + 45, 'web', 'Discovery workshop', uid) returning id into o2;
  insert into public.opportunities (name, account_id, contact_id, type, stage, amount, close_date, lead_source, next_step, owner_id)
  values ('Northwind - 2027 Renewal', a3, c4, 'existing_renewal', 'negotiation', 145000, current_date + 12, 'partner_referral', 'Legal review of MSA', uid) returning id into o3;
  insert into public.opportunities (name, account_id, contact_id, type, stage, amount, close_date, lead_source, owner_id)
  values ('Bluepeak - Core Platform', a4, c5, 'new_business', 'prospecting', 520000, current_date + 90, 'advertisement', uid) returning id into o4;
  insert into public.opportunities (name, account_id, contact_id, type, stage, amount, close_date, lead_source, owner_id)
  values ('Acme Robotics - Premium Support', a1, c2, 'existing_upgrade', 'closed_won', 38000, current_date - 15, 'trade_show', uid) returning id into o5;
  insert into public.opportunities (name, account_id, contact_id, type, stage, amount, close_date, lead_source, owner_id)
  values ('Tandem - Reseller Bundle', a5, c6, 'new_business', 'value_proposition', 92000, current_date + 30, 'word_of_mouth', uid) returning id into o6;
  insert into public.opportunities (name, account_id, type, stage, amount, close_date, owner_id)
  values ('Northwind - Fleet Analytics Pilot', a3, 'new_business', 'closed_lost', 60000, current_date - 40, uid) returning id into o7;

  if p_platform is not null then
    insert into public.opportunity_line_items (opportunity_id, product_id, quantity, unit_price, discount) values
      (o1, p_platform, 1, 120000, 10),
      (o1, p_seats, 150, 600, 0),
      (o1, p_onboard, 1, 25000, 0);
  end if;

  -- Leads
  insert into public.leads (first_name, last_name, company, title, email, phone, status, rating, lead_source, industry, employees, city, country, campaign_id, owner_id)
  values ('Aisha', 'Bello', 'Coral Bay Resorts', 'Director of Guest Experience', 'aisha@coralbay.example', '+60 3 5550 2020', 'working', 'hot', 'trade_show', 'Hospitality', 900, 'Kuala Lumpur', 'Malaysia', k1, uid)
  returning id into l1;
  insert into public.leads (first_name, last_name, company, title, email, status, rating, lead_source, industry, employees, city, country, campaign_id, owner_id)
  values ('Tom', 'Lindqvist', 'Fjord Energy', 'Head of IT', 'tom.l@fjord.example', 'new', 'warm', 'web', 'Energy', 2400, 'Oslo', 'Norway', k2, uid)
  returning id into l2;
  insert into public.leads (first_name, last_name, company, title, email, status, rating, lead_source, industry, city, country, owner_id) values
    ('Grace', 'Ng', 'Peakline Retail', 'COO', 'grace@peakline.example', 'nurturing', 'warm', 'advertisement', 'Retail', 'Hong Kong', 'Hong Kong', uid),
    ('Marco', 'Rossi', 'Verde Foods', 'CEO', 'marco@verdefoods.example', 'qualified', 'hot', 'partner_referral', 'Food & Beverage', 'Milan', 'Italy', uid),
    ('Hannah', 'Schmidt', 'Kraftwerk Tools', 'Purchasing Lead', 'h.schmidt@kraftwerk.example', 'unqualified', 'cold', 'phone_inquiry', 'Manufacturing', 'Munich', 'Germany', uid);

  insert into public.campaign_members (campaign_id, lead_id, status, owner_id) values (k1, l1, 'attended', uid), (k2, l2, 'sent', uid);
  insert into public.campaign_members (campaign_id, contact_id, status, owner_id) values (k1, c1, 'responded', uid), (k1, c3, 'attended', uid);

  -- Cases
  insert into public.cases (subject, description, status, priority, origin, type, account_id, contact_id, owner_id) values
    ('Robot arm firmware update failing', 'Update stalls at 80% on line 3 units.', 'working', 'high', 'phone', 'Problem', a1, c2, uid),
    ('Request for SSO configuration help', 'Customer wants SAML set up for their IdP.', 'new', 'medium', 'email', 'Question', a3, c4, uid),
    ('Dashboard export times out', 'CSV exports over 50k rows time out.', 'escalated', 'critical', 'web', 'Problem', a1, c1, uid),
    ('Invoice address change', 'Update billing address for next invoice.', 'closed', 'low', 'email', 'Question', a3, c4, uid);

  -- Tasks & events
  insert into public.tasks (subject, type, status, priority, due_date, opportunity_id, account_id, owner_id) values
    ('Send revised APAC pricing', 'email', 'not_started', 'high', current_date + 1, o1, a1, uid),
    ('Prepare MSA redlines', 'task', 'in_progress', 'high', current_date + 3, o3, a3, uid),
    ('Follow-up call with Priya', 'call', 'not_started', 'normal', current_date + 5, o2, a2, uid),
    ('Book discovery workshop room', 'task', 'completed', 'low', current_date - 2, o2, a2, uid);
  insert into public.tasks (subject, type, status, priority, due_date, lead_id, owner_id) values
    ('Qualify budget with Aisha', 'call', 'not_started', 'normal', current_date + 2, l1, uid);
  insert into public.events (subject, start_at, end_at, location, opportunity_id, account_id, owner_id) values
    ('Lumen discovery workshop', date_trunc('hour', now()) + interval '6 days', date_trunc('hour', now()) + interval '6 days 2 hours', 'Lumen HQ, Singapore', o2, a2, uid),
    ('Northwind negotiation call', date_trunc('hour', now()) + interval '2 days', date_trunc('hour', now()) + interval '2 days 1 hour', 'Video call', o3, a3, uid);

  insert into public.notes (title, body, account_id, opportunity_id, owner_id) values
    ('Pricing feedback', 'Maria flagged that seat pricing needs to be competitive with their incumbent. Room for a 10% platform discount.', a1, o1, uid),
    ('Procurement process', 'Northwind requires two quotes and a security questionnaire before signature.', a3, o3, uid);

  return jsonb_build_object('accounts', 5, 'contacts', 6, 'opportunities', 7, 'leads', 5, 'cases', 4, 'campaigns', 2);
end;
$$;

revoke all on function public.seed_demo_data() from public, anon;
grant execute on function public.seed_demo_data() to authenticated;

-- -----------------------------------------------------------------------------
-- Starter price book
-- -----------------------------------------------------------------------------
insert into public.products (name, product_code, family, description, unit_price) values
  ('Platform - Enterprise Edition', 'PLAT-ENT',  'Platform', 'Annual enterprise platform licence.', 120000),
  ('Platform - Growth Edition',     'PLAT-GRW',  'Platform', 'Annual licence for growing teams.',     45000),
  ('Pro Seat (annual)',             'SEAT-PRO',  'Seats',    'Per-user annual seat.',                   600),
  ('Onboarding Package',            'SVC-ONB',   'Services', 'Guided onboarding and data migration.', 25000),
  ('Premium Support',               'SUP-PREM',  'Support',  '24/7 support with a named engineer.',   38000),
  ('Analytics Add-on',              'ADD-ANLY',  'Add-ons',  'Advanced reporting and dashboards.',    18000)
on conflict (product_code) do nothing;
