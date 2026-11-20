// Metadata for every CRM object. List views, record pages, forms, related
// lists and search are all generated from these definitions, much like a
// Salesforce object's fields, page layout and list views.

export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'url'
  | 'number'
  | 'currency'
  | 'percent'
  | 'date'
  | 'datetime'
  | 'picklist'
  | 'boolean'
  | 'lookup'

export type Option = { value: string; label: string }

export type FieldDef = {
  name: string
  label: string
  type: FieldType
  required?: boolean
  readOnly?: boolean
  options?: Option[]
  lookup?: ObjectKey
  section?: string
  wide?: boolean
  /** Default for new records. Supports '$today+N' for dates and '$me' for owner. */
  default?: string
  /** Picklist values that cannot be chosen in the form (set by a process instead). */
  formExclude?: string[]
}

export type ViewFilter = {
  column: string
  op: 'eq' | 'neq' | 'in' | 'not_in' | 'is_true' | 'is_false' | 'gte' | 'lt'
  value?: string | string[]
}

export type ListView = { key: string; label: string; mine?: boolean; filters?: ViewFilter[] }

export type RelatedList = { object: ObjectKey; foreignKey: string; label?: string; columns: string[] }

export type ObjectKey =
  | 'accounts'
  | 'contacts'
  | 'leads'
  | 'opportunities'
  | 'cases'
  | 'campaigns'
  | 'campaign_members'
  | 'products'
  | 'tasks'
  | 'events'
  | 'notes'
  | 'users'

export type ObjectDef = {
  key: ObjectKey
  table: string
  label: string
  plural: string
  abbr: string
  color: string
  nameColumns: string[]
  listColumns: string[]
  searchColumns: string[]
  highlight: string[]
  fields: FieldDef[]
  views: ListView[]
  related: RelatedList[]
  defaultSort: { column: string; ascending: boolean }
  /** Column on tasks/events/notes that links activities to this object. */
  activityKey?: string
  /** Picklist shown as a clickable "path" at the top of the record page. */
  path?: { field: string; exclude?: string[] }
  hasOwner: boolean
  canCreate: boolean
  canDelete: boolean
}

// -----------------------------------------------------------------------------
// Picklist helpers
// -----------------------------------------------------------------------------
export function humanize(value: string): string {
  return value
    .split('_')
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

const opts = (...values: string[]): Option[] => values.map((v) => ({ value: v, label: humanize(v) }))
const plain = (...values: string[]): Option[] => values.map((v) => ({ value: v, label: v }))

export const STAGES = opts(
  'prospecting',
  'qualification',
  'needs_analysis',
  'value_proposition',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
)
const LEAD_SOURCES = opts('web', 'phone_inquiry', 'partner_referral', 'trade_show', 'advertisement', 'word_of_mouth', 'other')
const RATINGS = opts('hot', 'warm', 'cold')
const SALUTATIONS = plain('Mr.', 'Ms.', 'Mrs.', 'Mx.', 'Dr.', 'Prof.')
const INDUSTRIES = plain(
  'Technology',
  'Manufacturing',
  'Healthcare',
  'Financial Services',
  'Retail',
  'Transportation',
  'Energy',
  'Hospitality',
  'Food & Beverage',
  'Education',
  'Government',
  'Media',
  'Other',
)

const owner: FieldDef = { name: 'owner_id', label: 'Owner', type: 'lookup', lookup: 'users', default: '$me' }

const relatedTo = (section = 'Related To'): FieldDef[] => [
  { name: 'account_id', label: 'Account', type: 'lookup', lookup: 'accounts', section },
  { name: 'contact_id', label: 'Contact', type: 'lookup', lookup: 'contacts', section },
  { name: 'lead_id', label: 'Lead', type: 'lookup', lookup: 'leads', section },
  { name: 'opportunity_id', label: 'Opportunity', type: 'lookup', lookup: 'opportunities', section },
  { name: 'case_id', label: 'Case', type: 'lookup', lookup: 'cases', section },
]

// -----------------------------------------------------------------------------
// Objects
// -----------------------------------------------------------------------------
export const OBJECTS: Record<ObjectKey, ObjectDef> = {
  leads: {
    key: 'leads',
    table: 'leads',
    label: 'Lead',
    plural: 'Leads',
    abbr: 'Le',
    color: '#f88962',
    nameColumns: ['first_name', 'last_name', 'company'],
    listColumns: ['__name', 'company', 'status', 'rating', 'lead_source', 'email', 'owner_id'],
    searchColumns: ['first_name', 'last_name', 'company', 'email', 'phone'],
    highlight: ['company', 'title', 'email', 'phone', 'status', 'owner_id'],
    defaultSort: { column: 'created_at', ascending: false },
    activityKey: 'lead_id',
    path: { field: 'status', exclude: ['converted'] },
    hasOwner: true,
    canCreate: true,
    canDelete: true,
    fields: [
      { name: 'salutation', label: 'Salutation', type: 'picklist', options: SALUTATIONS, section: 'Lead Information' },
      { name: 'first_name', label: 'First Name', type: 'text', section: 'Lead Information' },
      { name: 'last_name', label: 'Last Name', type: 'text', required: true, section: 'Lead Information' },
      { name: 'company', label: 'Company', type: 'text', required: true, section: 'Lead Information' },
      { name: 'title', label: 'Title', type: 'text', section: 'Lead Information' },
      { name: 'email', label: 'Email', type: 'email', section: 'Lead Information' },
      { name: 'phone', label: 'Phone', type: 'phone', section: 'Lead Information' },
      { name: 'website', label: 'Website', type: 'url', section: 'Lead Information' },
      {
        name: 'status',
        label: 'Lead Status',
        type: 'picklist',
        required: true,
        default: 'new',
        options: opts('new', 'working', 'nurturing', 'qualified', 'unqualified', 'converted'),
        formExclude: ['converted'],
        section: 'Lead Information',
      },
      { name: 'rating', label: 'Rating', type: 'picklist', options: RATINGS, section: 'Lead Information' },
      { name: 'lead_source', label: 'Lead Source', type: 'picklist', options: LEAD_SOURCES, section: 'Lead Information' },
      { name: 'campaign_id', label: 'Campaign', type: 'lookup', lookup: 'campaigns', section: 'Lead Information' },
      { ...owner, section: 'Lead Information' },
      { name: 'industry', label: 'Industry', type: 'picklist', options: INDUSTRIES, section: 'Company' },
      { name: 'annual_revenue', label: 'Annual Revenue', type: 'currency', section: 'Company' },
      { name: 'employees', label: 'Employees', type: 'number', section: 'Company' },
      { name: 'street', label: 'Street', type: 'text', section: 'Address', wide: true },
      { name: 'city', label: 'City', type: 'text', section: 'Address' },
      { name: 'state', label: 'State/Province', type: 'text', section: 'Address' },
      { name: 'postal_code', label: 'Postal Code', type: 'text', section: 'Address' },
      { name: 'country', label: 'Country', type: 'text', section: 'Address' },
      { name: 'description', label: 'Description', type: 'textarea', section: 'Description', wide: true },
      { name: 'converted_at', label: 'Converted On', type: 'datetime', readOnly: true, section: 'Conversion' },
      { name: 'converted_account_id', label: 'Converted Account', type: 'lookup', lookup: 'accounts', readOnly: true, section: 'Conversion' },
      { name: 'converted_contact_id', label: 'Converted Contact', type: 'lookup', lookup: 'contacts', readOnly: true, section: 'Conversion' },
      { name: 'converted_opportunity_id', label: 'Converted Opportunity', type: 'lookup', lookup: 'opportunities', readOnly: true, section: 'Conversion' },
    ],
    views: [
      { key: 'open', label: 'All Open Leads', filters: [{ column: 'status', op: 'not_in', value: ['converted', 'unqualified'] }] },
      { key: 'mine', label: 'My Leads', mine: true },
      { key: 'all', label: 'All Leads' },
      { key: 'converted', label: 'Converted Leads', filters: [{ column: 'status', op: 'eq', value: 'converted' }] },
    ],
    related: [{ object: 'campaign_members', foreignKey: 'lead_id', label: 'Campaign History', columns: ['campaign_id', 'status'] }],
  },

  accounts: {
    key: 'accounts',
    table: 'accounts',
    label: 'Account',
    plural: 'Accounts',
    abbr: 'Ac',
    color: '#7f8de1',
    nameColumns: ['name'],
    listColumns: ['__name', 'type', 'industry', 'billing_city', 'phone', 'owner_id'],
    searchColumns: ['name', 'website', 'phone', 'billing_city', 'industry'],
    highlight: ['type', 'industry', 'phone', 'website', 'owner_id'],
    defaultSort: { column: 'name', ascending: true },
    activityKey: 'account_id',
    hasOwner: true,
    canCreate: true,
    canDelete: true,
    fields: [
      { name: 'name', label: 'Account Name', type: 'text', required: true, section: 'Account Information' },
      { name: 'account_number', label: 'Account Number', type: 'text', section: 'Account Information' },
      { name: 'type', label: 'Type', type: 'picklist', default: 'prospect', options: opts('prospect', 'customer', 'partner', 'competitor', 'other'), section: 'Account Information' },
      { name: 'industry', label: 'Industry', type: 'picklist', options: INDUSTRIES, section: 'Account Information' },
      { name: 'rating', label: 'Rating', type: 'picklist', options: RATINGS, section: 'Account Information' },
      { name: 'parent_account_id', label: 'Parent Account', type: 'lookup', lookup: 'accounts', section: 'Account Information' },
      { name: 'website', label: 'Website', type: 'url', section: 'Account Information' },
      { name: 'phone', label: 'Phone', type: 'phone', section: 'Account Information' },
      { name: 'annual_revenue', label: 'Annual Revenue', type: 'currency', section: 'Account Information' },
      { name: 'employees', label: 'Employees', type: 'number', section: 'Account Information' },
      { ...owner, section: 'Account Information' },
      { name: 'billing_street', label: 'Billing Street', type: 'text', section: 'Address', wide: true },
      { name: 'billing_city', label: 'Billing City', type: 'text', section: 'Address' },
      { name: 'billing_state', label: 'Billing State/Province', type: 'text', section: 'Address' },
      { name: 'billing_postal_code', label: 'Billing Postal Code', type: 'text', section: 'Address' },
      { name: 'billing_country', label: 'Billing Country', type: 'text', section: 'Address' },
      { name: 'description', label: 'Description', type: 'textarea', section: 'Description', wide: true },
    ],
    views: [
      { key: 'all', label: 'All Accounts' },
      { key: 'mine', label: 'My Accounts', mine: true },
      { key: 'customers', label: 'Customers', filters: [{ column: 'type', op: 'eq', value: 'customer' }] },
      { key: 'prospects', label: 'Prospects', filters: [{ column: 'type', op: 'eq', value: 'prospect' }] },
    ],
    related: [
      { object: 'contacts', foreignKey: 'account_id', columns: ['__name', 'title', 'email', 'phone'] },
      { object: 'opportunities', foreignKey: 'account_id', columns: ['__name', 'stage', 'amount', 'close_date'] },
      { object: 'cases', foreignKey: 'account_id', columns: ['__name', 'status', 'priority', 'created_at'] },
      { object: 'accounts', foreignKey: 'parent_account_id', label: 'Child Accounts', columns: ['__name', 'type', 'industry'] },
    ],
  },

  contacts: {
    key: 'contacts',
    table: 'contacts',
    label: 'Contact',
    plural: 'Contacts',
    abbr: 'Co',
    color: '#a094ed',
    nameColumns: ['first_name', 'last_name'],
    listColumns: ['__name', 'account_id', 'title', 'email', 'phone', 'owner_id'],
    searchColumns: ['first_name', 'last_name', 'email', 'phone', 'title'],
    highlight: ['account_id', 'title', 'email', 'phone', 'owner_id'],
    defaultSort: { column: 'last_name', ascending: true },
    activityKey: 'contact_id',
    hasOwner: true,
    canCreate: true,
    canDelete: true,
    fields: [
      { name: 'salutation', label: 'Salutation', type: 'picklist', options: SALUTATIONS, section: 'Contact Information' },
      { name: 'first_name', label: 'First Name', type: 'text', section: 'Contact Information' },
      { name: 'last_name', label: 'Last Name', type: 'text', required: true, section: 'Contact Information' },
      { name: 'account_id', label: 'Account', type: 'lookup', lookup: 'accounts', section: 'Contact Information' },
      { name: 'title', label: 'Title', type: 'text', section: 'Contact Information' },
      { name: 'department', label: 'Department', type: 'text', section: 'Contact Information' },
      { name: 'email', label: 'Email', type: 'email', section: 'Contact Information' },
      { name: 'phone', label: 'Phone', type: 'phone', section: 'Contact Information' },
      { name: 'mobile_phone', label: 'Mobile', type: 'phone', section: 'Contact Information' },
      { name: 'reports_to_id', label: 'Reports To', type: 'lookup', lookup: 'contacts', section: 'Contact Information' },
      { name: 'lead_source', label: 'Lead Source', type: 'picklist', options: LEAD_SOURCES, section: 'Contact Information' },
      { name: 'birthdate', label: 'Birthdate', type: 'date', section: 'Contact Information' },
      { ...owner, section: 'Contact Information' },
      { name: 'mailing_street', label: 'Mailing Street', type: 'text', section: 'Address', wide: true },
      { name: 'mailing_city', label: 'Mailing City', type: 'text', section: 'Address' },
      { name: 'mailing_state', label: 'Mailing State/Province', type: 'text', section: 'Address' },
      { name: 'mailing_postal_code', label: 'Mailing Postal Code', type: 'text', section: 'Address' },
      { name: 'mailing_country', label: 'Mailing Country', type: 'text', section: 'Address' },
      { name: 'description', label: 'Description', type: 'textarea', section: 'Description', wide: true },
    ],
    views: [
      { key: 'all', label: 'All Contacts' },
      { key: 'mine', label: 'My Contacts', mine: true },
    ],
    related: [
      { object: 'opportunities', foreignKey: 'contact_id', columns: ['__name', 'stage', 'amount', 'close_date'] },
      { object: 'cases', foreignKey: 'contact_id', columns: ['__name', 'status', 'priority'] },
      { object: 'campaign_members', foreignKey: 'contact_id', label: 'Campaign History', columns: ['campaign_id', 'status'] },
      { object: 'contacts', foreignKey: 'reports_to_id', label: 'Direct Reports', columns: ['__name', 'title', 'email'] },
    ],
  },

  opportunities: {
    key: 'opportunities',
    table: 'opportunities',
    label: 'Opportunity',
    plural: 'Opportunities',
    abbr: 'Op',
    color: '#fcb95b',
    nameColumns: ['name'],
    listColumns: ['__name', 'account_id', 'stage', 'amount', 'close_date', 'owner_id'],
    searchColumns: ['name', 'next_step'],
    highlight: ['account_id', 'close_date', 'amount', 'probability', 'owner_id'],
    defaultSort: { column: 'close_date', ascending: true },
    activityKey: 'opportunity_id',
    path: { field: 'stage' },
    hasOwner: true,
    canCreate: true,
    canDelete: true,
    fields: [
      { name: 'name', label: 'Opportunity Name', type: 'text', required: true, section: 'Opportunity Information' },
      { name: 'account_id', label: 'Account', type: 'lookup', lookup: 'accounts', section: 'Opportunity Information' },
      { name: 'contact_id', label: 'Primary Contact', type: 'lookup', lookup: 'contacts', section: 'Opportunity Information' },
      { name: 'type', label: 'Type', type: 'picklist', default: 'new_business', options: opts('new_business', 'existing_upgrade', 'existing_renewal'), section: 'Opportunity Information' },
      { name: 'stage', label: 'Stage', type: 'picklist', required: true, default: 'prospecting', options: STAGES, section: 'Opportunity Information' },
      { name: 'close_date', label: 'Close Date', type: 'date', required: true, default: '$today+30', section: 'Opportunity Information' },
      { name: 'amount', label: 'Amount', type: 'currency', section: 'Opportunity Information' },
      { name: 'probability', label: 'Probability (%)', type: 'percent', section: 'Opportunity Information' },
      { name: 'expected_revenue', label: 'Expected Revenue', type: 'currency', readOnly: true, section: 'Opportunity Information' },
      { name: 'lead_source', label: 'Lead Source', type: 'picklist', options: LEAD_SOURCES, section: 'Opportunity Information' },
      { name: 'campaign_id', label: 'Primary Campaign', type: 'lookup', lookup: 'campaigns', section: 'Opportunity Information' },
      { ...owner, section: 'Opportunity Information' },
      { name: 'next_step', label: 'Next Step', type: 'text', section: 'Additional Information', wide: true },
      { name: 'description', label: 'Description', type: 'textarea', section: 'Additional Information', wide: true },
    ],
    views: [
      { key: 'open', label: 'All Open Opportunities', filters: [{ column: 'is_closed', op: 'is_false' }] },
      { key: 'mine', label: 'My Opportunities', mine: true },
      { key: 'all', label: 'All Opportunities' },
      { key: 'won', label: 'Closed Won', filters: [{ column: 'stage', op: 'eq', value: 'closed_won' }] },
    ],
    related: [],
  },

  cases: {
    key: 'cases',
    table: 'cases',
    label: 'Case',
    plural: 'Cases',
    abbr: 'Ca',
    color: '#f2cf5b',
    nameColumns: ['case_number', 'subject'],
    listColumns: ['__name', 'account_id', 'contact_id', 'status', 'priority', 'origin', 'owner_id'],
    searchColumns: ['subject', 'description'],
    highlight: ['status', 'priority', 'account_id', 'contact_id', 'owner_id'],
    defaultSort: { column: 'case_number', ascending: false },
    activityKey: 'case_id',
    path: { field: 'status' },
    hasOwner: true,
    canCreate: true,
    canDelete: true,
    fields: [
      { name: 'case_number', label: 'Case Number', type: 'number', readOnly: true, section: 'Case Information' },
      { name: 'subject', label: 'Subject', type: 'text', required: true, section: 'Case Information', wide: true },
      { name: 'status', label: 'Status', type: 'picklist', required: true, default: 'new', options: opts('new', 'working', 'escalated', 'closed'), section: 'Case Information' },
      { name: 'priority', label: 'Priority', type: 'picklist', required: true, default: 'medium', options: opts('low', 'medium', 'high', 'critical'), section: 'Case Information' },
      { name: 'origin', label: 'Case Origin', type: 'picklist', options: opts('email', 'phone', 'web', 'chat'), section: 'Case Information' },
      { name: 'type', label: 'Type', type: 'picklist', options: plain('Question', 'Problem', 'Feature Request'), section: 'Case Information' },
      { name: 'account_id', label: 'Account', type: 'lookup', lookup: 'accounts', section: 'Case Information' },
      { name: 'contact_id', label: 'Contact', type: 'lookup', lookup: 'contacts', section: 'Case Information' },
      { ...owner, section: 'Case Information' },
      { name: 'closed_at', label: 'Closed On', type: 'datetime', readOnly: true, section: 'Case Information' },
      { name: 'description', label: 'Description', type: 'textarea', section: 'Details', wide: true },
      { name: 'resolution', label: 'Resolution', type: 'textarea', section: 'Details', wide: true },
    ],
    views: [
      { key: 'open', label: 'All Open Cases', filters: [{ column: 'status', op: 'neq', value: 'closed' }] },
      { key: 'mine', label: 'My Cases', mine: true },
      { key: 'escalated', label: 'Escalated', filters: [{ column: 'status', op: 'eq', value: 'escalated' }] },
      { key: 'all', label: 'All Cases' },
    ],
    related: [],
  },

  campaigns: {
    key: 'campaigns',
    table: 'campaigns',
    label: 'Campaign',
    plural: 'Campaigns',
    abbr: 'Cm',
    color: '#f49756',
    nameColumns: ['name'],
    listColumns: ['__name', 'type', 'status', 'start_date', 'end_date', 'budgeted_cost', 'owner_id'],
    searchColumns: ['name', 'description'],
    highlight: ['type', 'status', 'start_date', 'end_date', 'owner_id'],
    defaultSort: { column: 'start_date', ascending: false },
    path: { field: 'status' },
    hasOwner: true,
    canCreate: true,
    canDelete: true,
    fields: [
      { name: 'name', label: 'Campaign Name', type: 'text', required: true, section: 'Campaign Information' },
      { name: 'type', label: 'Type', type: 'picklist', default: 'email', options: opts('email', 'webinar', 'event', 'advertisement', 'social', 'other'), section: 'Campaign Information' },
      { name: 'status', label: 'Status', type: 'picklist', required: true, default: 'planned', options: opts('planned', 'in_progress', 'completed', 'aborted'), section: 'Campaign Information' },
      { name: 'is_active', label: 'Active', type: 'boolean', default: 'true', section: 'Campaign Information' },
      { name: 'start_date', label: 'Start Date', type: 'date', section: 'Campaign Information' },
      { name: 'end_date', label: 'End Date', type: 'date', section: 'Campaign Information' },
      { ...owner, section: 'Campaign Information' },
      { name: 'budgeted_cost', label: 'Budgeted Cost', type: 'currency', section: 'Financials' },
      { name: 'actual_cost', label: 'Actual Cost', type: 'currency', section: 'Financials' },
      { name: 'expected_revenue', label: 'Expected Revenue', type: 'currency', section: 'Financials' },
      { name: 'description', label: 'Description', type: 'textarea', section: 'Description', wide: true },
    ],
    views: [
      { key: 'active', label: 'Active Campaigns', filters: [{ column: 'is_active', op: 'is_true' }] },
      { key: 'mine', label: 'My Campaigns', mine: true },
      { key: 'all', label: 'All Campaigns' },
    ],
    related: [
      { object: 'campaign_members', foreignKey: 'campaign_id', label: 'Campaign Members', columns: ['__name', 'lead_id', 'contact_id', 'status'] },
      { object: 'leads', foreignKey: 'campaign_id', columns: ['__name', 'company', 'status'] },
      { object: 'opportunities', foreignKey: 'campaign_id', label: 'Influenced Opportunities', columns: ['__name', 'stage', 'amount'] },
    ],
  },

  campaign_members: {
    key: 'campaign_members',
    table: 'campaign_members',
    label: 'Campaign Member',
    plural: 'Campaign Members',
    abbr: 'CM',
    color: '#f49756',
    nameColumns: ['status'],
    listColumns: ['__name', 'campaign_id', 'status', 'owner_id'],
    searchColumns: [],
    highlight: ['campaign_id', 'lead_id', 'contact_id', 'status'],
    defaultSort: { column: 'created_at', ascending: false },
    hasOwner: true,
    canCreate: true,
    canDelete: true,
    fields: [
      { name: 'campaign_id', label: 'Campaign', type: 'lookup', lookup: 'campaigns', required: true, section: 'Member' },
      { name: 'lead_id', label: 'Lead', type: 'lookup', lookup: 'leads', section: 'Member' },
      { name: 'contact_id', label: 'Contact', type: 'lookup', lookup: 'contacts', section: 'Member' },
      { name: 'status', label: 'Status', type: 'picklist', required: true, default: 'sent', options: opts('sent', 'responded', 'attended', 'converted'), section: 'Member' },
      { ...owner, section: 'Member' },
    ],
    views: [{ key: 'all', label: 'All Campaign Members' }],
    related: [],
  },

  products: {
    key: 'products',
    table: 'products',
    label: 'Product',
    plural: 'Products',
    abbr: 'Pr',
    color: '#b781d3',
    nameColumns: ['name'],
    listColumns: ['__name', 'product_code', 'family', 'unit_price', 'is_active'],
    searchColumns: ['name', 'product_code', 'family'],
    highlight: ['product_code', 'family', 'unit_price', 'is_active'],
    defaultSort: { column: 'name', ascending: true },
    hasOwner: false,
    canCreate: true,
    canDelete: true,
    fields: [
      { name: 'name', label: 'Product Name', type: 'text', required: true, section: 'Product Information' },
      { name: 'product_code', label: 'Product Code', type: 'text', section: 'Product Information' },
      { name: 'family', label: 'Product Family', type: 'picklist', options: plain('Platform', 'Seats', 'Services', 'Support', 'Add-ons'), section: 'Product Information' },
      { name: 'unit_price', label: 'List Price', type: 'currency', required: true, section: 'Product Information' },
      { name: 'is_active', label: 'Active', type: 'boolean', default: 'true', section: 'Product Information' },
      { name: 'description', label: 'Description', type: 'textarea', section: 'Product Information', wide: true },
    ],
    views: [
      { key: 'active', label: 'Active Products', filters: [{ column: 'is_active', op: 'is_true' }] },
      { key: 'all', label: 'All Products' },
    ],
    related: [],
  },

  tasks: {
    key: 'tasks',
    table: 'tasks',
    label: 'Task',
    plural: 'Tasks',
    abbr: 'Ta',
    color: '#4bc076',
    nameColumns: ['subject'],
    listColumns: ['__name', 'type', 'status', 'priority', 'due_date', 'owner_id'],
    searchColumns: ['subject', 'description'],
    highlight: ['type', 'status', 'priority', 'due_date', 'owner_id'],
    defaultSort: { column: 'due_date', ascending: true },
    path: { field: 'status' },
    hasOwner: true,
    canCreate: true,
    canDelete: true,
    fields: [
      { name: 'subject', label: 'Subject', type: 'text', required: true, section: 'Task Information', wide: true },
      { name: 'type', label: 'Type', type: 'picklist', required: true, default: 'task', options: opts('task', 'call', 'email', 'meeting'), section: 'Task Information' },
      { name: 'status', label: 'Status', type: 'picklist', required: true, default: 'not_started', options: opts('not_started', 'in_progress', 'completed', 'deferred'), section: 'Task Information' },
      { name: 'priority', label: 'Priority', type: 'picklist', required: true, default: 'normal', options: opts('low', 'normal', 'high'), section: 'Task Information' },
      { name: 'due_date', label: 'Due Date', type: 'date', section: 'Task Information' },
      { ...owner, label: 'Assigned To', section: 'Task Information' },
      { name: 'completed_at', label: 'Completed On', type: 'datetime', readOnly: true, section: 'Task Information' },
      ...relatedTo(),
      { name: 'description', label: 'Comments', type: 'textarea', section: 'Description', wide: true },
    ],
    views: [
      { key: 'my_open', label: 'My Open Tasks', mine: true, filters: [{ column: 'status', op: 'not_in', value: ['completed', 'deferred'] }] },
      { key: 'open', label: 'All Open Tasks', filters: [{ column: 'status', op: 'not_in', value: ['completed', 'deferred'] }] },
      { key: 'completed', label: 'Completed Tasks', filters: [{ column: 'status', op: 'eq', value: 'completed' }] },
      { key: 'all', label: 'All Tasks' },
    ],
    related: [],
  },

  events: {
    key: 'events',
    table: 'events',
    label: 'Event',
    plural: 'Events',
    abbr: 'Ev',
    color: '#eb7092',
    nameColumns: ['subject'],
    listColumns: ['__name', 'start_at', 'end_at', 'location', 'owner_id'],
    searchColumns: ['subject', 'location', 'description'],
    highlight: ['start_at', 'end_at', 'location', 'owner_id'],
    defaultSort: { column: 'start_at', ascending: true },
    hasOwner: true,
    canCreate: true,
    canDelete: true,
    fields: [
      { name: 'subject', label: 'Subject', type: 'text', required: true, section: 'Event Information', wide: true },
      { name: 'start_at', label: 'Start', type: 'datetime', required: true, section: 'Event Information' },
      { name: 'end_at', label: 'End', type: 'datetime', required: true, section: 'Event Information' },
      { name: 'all_day', label: 'All-Day Event', type: 'boolean', section: 'Event Information' },
      { name: 'location', label: 'Location', type: 'text', section: 'Event Information' },
      { ...owner, label: 'Assigned To', section: 'Event Information' },
      ...relatedTo(),
      { name: 'description', label: 'Description', type: 'textarea', section: 'Description', wide: true },
    ],
    views: [
      { key: 'upcoming', label: 'Upcoming Events', filters: [{ column: 'end_at', op: 'gte', value: '$now' }] },
      { key: 'mine', label: 'My Upcoming Events', mine: true, filters: [{ column: 'end_at', op: 'gte', value: '$now' }] },
      { key: 'past', label: 'Past Events', filters: [{ column: 'end_at', op: 'lt', value: '$now' }] },
      { key: 'all', label: 'All Events' },
    ],
    related: [],
  },

  notes: {
    key: 'notes',
    table: 'notes',
    label: 'Note',
    plural: 'Notes',
    abbr: 'No',
    color: '#e6d478',
    nameColumns: ['title', 'body'],
    listColumns: ['__name', 'owner_id', 'created_at'],
    searchColumns: ['title', 'body'],
    highlight: ['owner_id', 'created_at'],
    defaultSort: { column: 'created_at', ascending: false },
    hasOwner: true,
    canCreate: true,
    canDelete: true,
    fields: [
      { name: 'title', label: 'Title', type: 'text', section: 'Note', wide: true },
      { name: 'body', label: 'Body', type: 'textarea', required: true, section: 'Note', wide: true },
      { ...owner, section: 'Note' },
      ...relatedTo(),
    ],
    views: [
      { key: 'mine', label: 'My Notes', mine: true },
      { key: 'all', label: 'All Notes' },
    ],
    related: [],
  },

  users: {
    key: 'users',
    table: 'profiles',
    label: 'User',
    plural: 'Users',
    abbr: 'Us',
    color: '#65cae4',
    nameColumns: ['full_name', 'email'],
    listColumns: ['__name', 'email', 'title', 'role'],
    searchColumns: ['full_name', 'email', 'title'],
    highlight: ['email', 'title', 'role'],
    defaultSort: { column: 'full_name', ascending: true },
    hasOwner: false,
    canCreate: false,
    canDelete: false,
    fields: [
      { name: 'full_name', label: 'Full Name', type: 'text', required: true, section: 'User Information' },
      { name: 'email', label: 'Email', type: 'email', readOnly: true, section: 'User Information' },
      { name: 'title', label: 'Title', type: 'text', section: 'User Information' },
      { name: 'phone', label: 'Phone', type: 'phone', section: 'User Information' },
      { name: 'role', label: 'Role', type: 'picklist', required: true, options: opts('admin', 'manager', 'rep'), section: 'User Information' },
    ],
    views: [{ key: 'all', label: 'All Users' }],
    related: [],
  },
}

export const NAV: ObjectKey[] = ['leads', 'accounts', 'contacts', 'opportunities', 'cases', 'campaigns', 'tasks', 'events', 'products']

export function getObject(key: string): ObjectDef | null {
  return Object.prototype.hasOwnProperty.call(OBJECTS, key) ? OBJECTS[key as ObjectKey] : null
}

export function getField(def: ObjectDef, name: string): FieldDef | undefined {
  return def.fields.find((f) => f.name === name)
}

/** PostgREST select string that embeds the display name of every lookup. */
export function selectWithRefs(def: ObjectDef): string {
  const parts = ['*']
  for (const f of def.fields) {
    if (f.type === 'lookup' && f.lookup) {
      const target = OBJECTS[f.lookup]
      parts.push(`${f.name}_ref:${target.table}!${f.name}(id,${target.nameColumns.join(',')})`)
    }
  }
  return parts.join(',')
}

/** Human-readable name for a record. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function recordName(def: ObjectDef, rec: any): string {
  if (!rec) return ''
  switch (def.key) {
    case 'contacts':
    case 'leads':
      return [rec.first_name, rec.last_name].filter(Boolean).join(' ') || '(no name)'
    case 'cases':
      return rec.case_number ? `${rec.case_number} · ${rec.subject ?? ''}` : rec.subject ?? ''
    case 'users':
      return rec.full_name || rec.email || 'User'
    case 'notes': {
      const text: string = rec.title || rec.body || 'Note'
      return text.length > 60 ? text.slice(0, 60) + '…' : text
    }
    case 'campaign_members': {
      if (rec.lead_id_ref) return recordName(OBJECTS.leads, rec.lead_id_ref) + ' (Lead)'
      if (rec.contact_id_ref) return recordName(OBJECTS.contacts, rec.contact_id_ref) + ' (Contact)'
      return 'Campaign Member'
    }
    default:
      return String(rec[def.nameColumns[0]] ?? '(untitled)')
  }
}

export function optionLabel(field: FieldDef, value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  const v = String(value)
  return field.options?.find((o) => o.value === v)?.label ?? humanize(v)
}

/** Columns a list view may sort by. */
export function sortable(def: ObjectDef, column: string): boolean {
  if (column === 'created_at' || column === 'updated_at') return true
  const f = getField(def, column)
  return !!f && f.type !== 'lookup'
}

/** The column a "__name" list column sorts by. */
export function nameSortColumn(def: ObjectDef): string {
  if (def.key === 'contacts' || def.key === 'leads') return 'last_name'
  if (def.key === 'campaign_members') return 'created_at'
  return def.nameColumns[0]
}
