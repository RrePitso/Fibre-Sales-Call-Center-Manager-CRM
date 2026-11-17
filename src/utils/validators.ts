import { CRM_SCHEMA_VERSION, CRMState, Customer, Lead } from '../types/crm';

/**
 * Strips formatting characters and normalises +27 prefix to leading 0
 * for accurate duplicate lead phone comparisons.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+27')) {
    return '0' + digits.slice(3);
  }
  if (digits.startsWith('27') && digits.length === 11) {
    return '0' + digits.slice(2);
  }
  return digits;
}

export function isValidSAPhone(raw: string): boolean {
  const normalized = normalizePhone(raw);
  return /^0[1-9]\d{8}$/.test(normalized);
}

export function isValidEmail(email: string): boolean {
  if (!email.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function findDuplicatePhoneLeads(
  phone: string,
  leads: Lead[],
  customers: Customer[],
  excludeLeadId?: string
): Array<{ lead: Lead; customer: Customer }> {
  const target = normalizePhone(phone);
  if (!target || target.length < 9) return [];

  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const matches: Array<{ lead: Lead; customer: Customer }> = [];

  for (const lead of leads) {
    if (excludeLeadId && lead.id === excludeLeadId) continue;
    const customer = customerMap.get(lead.customerId);
    if (customer && normalizePhone(customer.phone) === target) {
      matches.push({ lead, customer });
    }
  }
  return matches;
}

export interface LeadFormInput {
  customerName: string;
  phone: string;
  email: string;
  address: string;
  suburb: string;
  providerId: string;
  productId: string;
  agentId: string;
}

export function validateLeadInput(
  input: LeadFormInput,
  validAgentIds: Set<string>,
  validProviderIds: Set<string>,
  validProductIds: Set<string>
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.customerName.trim()) {
    errors.customerName = 'Customer full name is required.';
  }
  if (!input.phone.trim()) {
    errors.phone = 'Phone number is required.';
  } else if (!isValidSAPhone(input.phone)) {
    errors.phone = 'Enter a valid 10-digit South African phone number (e.g. 082 555 0140).';
  }
  if (input.email.trim() && !isValidEmail(input.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!input.address.trim()) {
    errors.address = 'Installation address is required.';
  }
  if (!input.suburb.trim()) {
    errors.suburb = 'Suburb is required.';
  }
  if (!input.providerId || !validProviderIds.has(input.providerId)) {
    errors.providerId = 'Select a valid fibre provider.';
  }
  if (!input.productId || !validProductIds.has(input.productId)) {
    errors.productId = 'Select a valid fibre package.';
  }
  if (!input.agentId || !validAgentIds.has(input.agentId)) {
    errors.agentId = 'Select an assigned sales agent.';
  }

  return errors;
}

export function validateCRMBackup(raw: unknown): {
  valid: boolean;
  error?: string;
  data?: CRMState;
} {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Backup file does not contain a valid JSON object.' };
  }

  const obj = raw as Record<string, unknown>;
  if (typeof obj.schemaVersion !== 'number' || obj.schemaVersion > CRM_SCHEMA_VERSION) {
    return { valid: false, error: 'Unsupported or missing CRM schema version.' };
  }

  const requiredArrays = [
    'agents',
    'customers',
    'leads',
    'providers',
    'products',
    'qaReviews',
    'commissions',
    'activityHistory'
  ] as const;

  for (const key of requiredArrays) {
    if (!Array.isArray(obj[key])) {
      return { valid: false, error: `Missing or invalid "${key}" array in backup.` };
    }
  }

  const state = obj as unknown as CRMState;

  const agentIds = new Set(state.agents.map((a) => a.id));
  const customerIds = new Set(state.customers.map((c) => c.id));
  const providerIds = new Set(state.providers.map((p) => p.id));
  const productIds = new Set(state.products.map((p) => p.id));

  for (const lead of state.leads) {
    if (
      !lead.id ||
      !customerIds.has(lead.customerId) ||
      !agentIds.has(lead.agentId) ||
      !providerIds.has(lead.providerId) ||
      !productIds.has(lead.productId)
    ) {
      return {
        valid: false,
        error: `Data integrity check failed for lead "${lead.id || 'unknown'}".`
      };
    }
  }

  const commissionLeads = new Set<string>();
  for (const comm of state.commissions) {
    if (commissionLeads.has(comm.leadId)) {
      return {
        valid: false,
        error: `Duplicate commission record detected for lead "${comm.leadId}".`
      };
    }
    commissionLeads.add(comm.leadId);
  }

  return { valid: true, data: state };
}
