// Fictional data for a bounded governance lab. This module must stay server-side.
const freeze = (value) => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};

export const ROLES = freeze([
  { id: 'support', label: 'Support analyst', description: 'Customer account and adjustment facts; contact details are masked.' },
  { id: 'marketing', label: 'Marketing analyst', description: 'Aggregate campaign results and public product information.' },
  { id: 'steward', label: 'Data steward', description: 'Catalog metadata and public policies, without automatic access to customer records.' },
]);

export const DOCUMENTS = freeze([
  {
    id: 'atlas-plan', title: 'Atlas Flex · product guide', classification: 'Public', owner: 'Product operations',
    roles: ['support', 'marketing', 'steward'], topics: ['atlas', 'flex', 'plan', 'product', 'coverage'],
    fields: [
      { key: 'plan', label: 'Plan', value: 'Atlas Flex is a fictional monthly membership plan.' },
      { key: 'features', label: 'Includes', value: 'The plan includes priority support, monthly usage reporting, and flexible cancellation.' },
      { key: 'price', label: 'Price', value: 'The monthly list price is $49.' },
    ],
  },
  {
    id: 'avery-account', title: 'Avery Reed · account profile', classification: 'Confidential', owner: 'Customer operations',
    roles: ['support'], topics: ['avery', 'reed', 'customer', 'account', 'contact', 'email', 'phone'],
    fields: [
      { key: 'customer', label: 'Customer', value: 'Avery Reed' },
      { key: 'membership', label: 'Membership', value: 'Avery Reed has an active Atlas Flex membership.' },
      { key: 'balance', label: 'Current balance', value: '$84.50' },
      { key: 'email', label: 'Email', value: 'avery.reed@synthetic.example', restricted: true },
      { key: 'phone', label: 'Phone', value: '+1-202-555-0147', restricted: true },
    ],
  },
  {
    id: 'avery-adjustment', title: 'Avery Reed · adjustment ledger', classification: 'Confidential', owner: 'Billing operations',
    roles: ['support'], topics: ['avery', 'reed', 'adjustment', 'refund', 'billing', 'ledger'],
    fields: [
      { key: 'customer', label: 'Customer', value: 'Avery Reed' },
      { key: 'adjustment', label: 'Recent adjustment', value: 'A $14.50 service credit was applied on September 29, 2026 for a duplicate fee.' },
      { key: 'status', label: 'Status', value: 'The service credit is complete.' },
      { key: 'payment_reference', label: 'Payment reference', value: 'SYNTH-PAY-6M8Q-1942', restricted: true },
    ],
  },
  {
    id: 'campaign-results', title: 'Autumn Atlas · campaign results', classification: 'Internal', owner: 'Marketing analytics',
    roles: ['marketing'], topics: ['marketing', 'campaign', 'autumn', 'conversion', 'results', 'aggregate'],
    fields: [
      { key: 'campaign', label: 'Campaign', value: 'Autumn Atlas is a fictional September 2026 campaign.' },
      { key: 'audience', label: 'Aggregate audience', value: '12,000 impressions and 600 clicks.' },
      { key: 'conversions', label: 'Aggregate conversions', value: '48 sign-ups; click-through rate is 5%; click-to-sign-up rate is 8%.' },
      { key: 'restriction', label: 'Audience scope', value: 'The campaign report contains aggregate counts only, with no customer-level audience list.' },
    ],
  },
  {
    id: 'governance-policy', title: 'Access policy · stewardship register', classification: 'Internal', owner: 'Data governance',
    roles: ['steward'], topics: ['governance', 'policy', 'policies', 'steward', 'metadata', 'catalog', 'ownership', 'classification'],
    fields: [
      { key: 'ownership', label: 'Customer data owner', value: 'Customer operations owns the account profile; Billing operations owns the adjustment ledger.' },
      { key: 'classification', label: 'Classification', value: 'Account and adjustment records are classified Confidential; campaign aggregates are Internal.' },
      { key: 'permissions', label: 'Access principle', value: 'Data stewardship grants catalog and policy visibility, not automatic access to customer business data.' },
      { key: 'revocation', label: 'Revocation', value: 'Revoking a source invalidates the session cache and conversation; every answer checks the current policy again before delivery.' },
    ],
  },
  {
    id: 'private-settlement', title: 'Settlement vault · restricted record', classification: 'Restricted', owner: 'Treasury operations',
    roles: [], topics: ['settlement', 'private', 'token', 'secret', 'vault', 'credential'],
    fields: [
      { key: 'settlement_token', label: 'Private settlement token', value: 'SYNTH-SETTLEMENT-9VX2-Q7KM' },
      { key: 'settlement_amount', label: 'Private settlement amount', value: '$73,219.63' },
    ],
  },
]);

export function getDocument(id) { return DOCUMENTS.find((document) => document.id === id); }
