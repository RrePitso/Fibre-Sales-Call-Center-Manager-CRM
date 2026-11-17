import {
  Agent,
  Commission,
  CRMState,
  DateFilterState,
  Lead,
  LEAD_STATUSES,
  Product,
  QAChecklistItem,
  QAOutcome,
  QAReview
} from '../types/crm';

export const QA_CHECKLIST_TEMPLATE: Array<{
  key: QAChecklistItem['key'];
  label: string;
}> = [
  { key: 'identityVerified', label: 'Customer identity verified' },
  { key: 'consentRecorded', label: 'Customer consent recorded' },
  { key: 'correctProvider', label: 'Correct provider selected' },
  { key: 'correctPackage', label: 'Correct fibre package selected' },
  { key: 'addressConfirmed', label: 'Installation address confirmed' },
  { key: 'contactValidated', label: 'Customer contact details validated' },
  { key: 'pricingCommunicated', label: 'Package pricing communicated' },
  { key: 'applicationComplete', label: 'Application information complete' }
];

export function formatCurrency(amount: number): string {
  return `R${Math.round(amount).toLocaleString('en-ZA')}`;
}

export function safePercent(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}%`;
}

export function generateId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  const time = Date.now().toString(36).slice(-4).toUpperCase();
  return `${prefix}-${time}${rand}`;
}

export function calculateDaysInStage(statusEnteredAt: string, now = new Date()): number {
  const start = new Date(statusEnteredAt).getTime();
  if (Number.isNaN(start)) return 0;
  const diff = Math.max(0, now.getTime() - start);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Returns the latest QA review per lead without overwriting historical reviews.
 */
export function getLatestQAByLeadId(qaReviews: QAReview[]): Map<string, QAReview> {
  const map = new Map<string, QAReview>();
  const sorted = [...qaReviews].sort(
    (a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime()
  );
  for (const review of sorted) {
    if (!map.has(review.leadId)) {
      map.set(review.leadId, review);
    }
  }
  return map;
}

export function getEffectiveQAOutcome(
  lead: Lead,
  latestReview?: QAReview
): QAOutcome | 'Not Eligible' {
  if (lead.status !== 'Approved') {
    return latestReview ? latestReview.outcome : 'Not Eligible';
  }
  return latestReview ? latestReview.outcome : 'Pending Review';
}

/**
 * Core Business Rule:
 * Commission is eligible ONLY when the application is Approved AND its latest QA review Passed.
 */
export function isLeadCommissionEligible(lead: Lead, latestReview?: QAReview): boolean {
  return lead.status === 'Approved' && latestReview?.outcome === 'Passed';
}

/**
 * Creates a commission record only if:
 * 1. Lead is Approved AND latest QA review Passed.
 * 2. No commission record already exists for this lead (prevents duplicates).
 * 3. Locks the product's commission amount at generation time.
 */
export function createEligibleCommissionIfNeeded(
  lead: Lead,
  latestReview: QAReview | undefined,
  existingCommissions: Commission[],
  products: Product[],
  eligibleAt: string
): Commission | null {
  if (!isLeadCommissionEligible(lead, latestReview)) return null;
  if (existingCommissions.some((c) => c.leadId === lead.id)) return null;

  const product = products.find((p) => p.id === lead.productId);
  if (!product) return null;

  return {
    id: generateId('COM'),
    leadId: lead.id,
    customerId: lead.customerId,
    agentId: lead.agentId,
    providerId: lead.providerId,
    productId: lead.productId,
    amount: product.commissionAmount,
    eligibleAt,
    paymentStatus: 'Pending Verification'
  };
}

export interface DateBounds {
  start: Date;
  end: Date;
}

export function getDateRangeBounds(filter: DateFilterState): DateBounds {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (filter.preset) {
    case 'today':
      return { start, end };
    case '7d':
      start.setDate(start.getDate() - 6);
      return { start, end };
    case '30d':
      start.setDate(start.getDate() - 29);
      return { start, end };
    case 'this_month':
      start.setDate(1);
      return { start, end };
    case 'custom': {
      const s = filter.customStart ? new Date(filter.customStart + 'T00:00:00') : start;
      const e = filter.customEnd ? new Date(filter.customEnd + 'T23:59:59.999') : end;
      return {
        start: Number.isNaN(s.getTime()) ? start : s,
        end: Number.isNaN(e.getTime()) ? end : e
      };
    }
  }
}

export function isWithinDateBounds(isoDate: string, bounds: DateBounds): boolean {
  const ts = new Date(isoDate).getTime();
  if (Number.isNaN(ts)) return false;
  return ts >= bounds.start.getTime() && ts <= bounds.end.getTime();
}

export interface DashboardKPIs {
  totalLeads: number;
  applicationsSubmitted: number;
  approvedSales: number;
  pendingApplications: number;
  qaPassRate: number | null;
  totalCommissionEarned: number;
  commissionAwaitingPayment: number;
  commissionPaid: number;
}

export function computeDashboardKPIs(
  state: CRMState,
  dateFilter: DateFilterState
): DashboardKPIs {
  const bounds = getDateRangeBounds(dateFilter);
  const filteredLeads = state.leads.filter((l) => isWithinDateBounds(l.createdAt, bounds));
  const filteredQA = state.qaReviews.filter((q) => isWithinDateBounds(q.reviewedAt, bounds));
  const filteredCommissions = state.commissions.filter((c) =>
    isWithinDateBounds(c.eligibleAt, bounds)
  );

  const applicationsSubmitted = filteredLeads.filter((l) =>
    ['Submitted', 'Approved', 'Rejected'].includes(l.status)
  ).length;
  const approvedSales = filteredLeads.filter((l) => l.status === 'Approved').length;
  const pendingApplications = filteredLeads.filter((l) =>
    ['Application Pending', 'Submitted'].includes(l.status)
  ).length;

  const passedQA = filteredQA.filter((q) => q.outcome === 'Passed').length;
  const qaPassRate = safePercent(passedQA, filteredQA.length);

  const totalCommissionEarned = filteredCommissions.reduce((sum, c) => sum + c.amount, 0);
  const commissionPaid = filteredCommissions
    .filter((c) => c.paymentStatus === 'Paid')
    .reduce((sum, c) => sum + c.amount, 0);
  const commissionAwaitingPayment = totalCommissionEarned - commissionPaid;

  return {
    totalLeads: filteredLeads.length,
    applicationsSubmitted,
    approvedSales,
    pendingApplications,
    qaPassRate,
    totalCommissionEarned,
    commissionAwaitingPayment,
    commissionPaid
  };
}

export interface AgentPerformanceRow {
  agent: Agent;
  leadsAssigned: number;
  leadsContacted: number;
  applicationsSubmitted: number;
  approvedSales: number;
  rejectedApplications: number;
  conversionRate: number | null;
  qaPassedCount: number;
  qaTotalCount: number;
  qaPassRate: number | null;
  commissionEarned: number;
}

export function computeAgentPerformance(
  state: CRMState,
  dateFilter?: DateFilterState
): AgentPerformanceRow[] {
  const bounds = dateFilter ? getDateRangeBounds(dateFilter) : null;
  const leads = bounds
    ? state.leads.filter((l) => isWithinDateBounds(l.createdAt, bounds))
    : state.leads;
  const qaReviews = bounds
    ? state.qaReviews.filter((q) => isWithinDateBounds(q.reviewedAt, bounds))
    : state.qaReviews;
  const commissions = bounds
    ? state.commissions.filter((c) => isWithinDateBounds(c.eligibleAt, bounds))
    : state.commissions;

  return state.agents.map((agent) => {
    const agentLeads = leads.filter((l) => l.agentId === agent.id);
    const leadsContacted = agentLeads.filter((l) => l.status !== 'New Lead').length;
    const applicationsSubmitted = agentLeads.filter((l) =>
      ['Submitted', 'Approved', 'Rejected'].includes(l.status)
    ).length;
    const approvedSales = agentLeads.filter((l) => l.status === 'Approved').length;
    const rejectedApplications = agentLeads.filter((l) => l.status === 'Rejected').length;

    const agentQA = qaReviews.filter((q) => q.agentId === agent.id);
    const qaPassedCount = agentQA.filter((q) => q.outcome === 'Passed').length;
    const agentComms = commissions.filter((c) => c.agentId === agent.id);
    const commissionEarned = agentComms.reduce((sum, c) => sum + c.amount, 0);

    return {
      agent,
      leadsAssigned: agentLeads.length,
      leadsContacted,
      applicationsSubmitted,
      approvedSales,
      rejectedApplications,
      conversionRate: safePercent(approvedSales, agentLeads.length),
      qaPassedCount,
      qaTotalCount: agentQA.length,
      qaPassRate: safePercent(qaPassedCount, agentQA.length),
      commissionEarned
    };
  });
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export interface TimeSeriesPoint {
  dateKey: string;
  label: string;
  leads: number;
  approved: number;
}

export function buildLeadsOverTimeSeries(
  leads: Lead[],
  dateFilter: DateFilterState
): TimeSeriesPoint[] {
  const bounds = getDateRangeBounds(dateFilter);
  const filtered = leads.filter((l) => isWithinDateBounds(l.createdAt, bounds));
  const byDay = new Map<string, { leads: number; approved: number }>();

  const cursor = new Date(bounds.start);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(bounds.end);
  endDay.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= endDay.getTime() && byDay.size < 90) {
    const key = cursor.toISOString().slice(0, 10);
    byDay.set(key, { leads: 0, approved: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const lead of filtered) {
    const key = lead.createdAt.slice(0, 10);
    const entry = byDay.get(key) ?? { leads: 0, approved: 0 };
    entry.leads += 1;
    if (lead.status === 'Approved') entry.approved += 1;
    byDay.set(key, entry);
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, counts]) => ({
      dateKey,
      label: new Date(dateKey + 'T00:00:00').toLocaleDateString('en-ZA', {
        day: '2-digit',
        month: 'short'
      }),
      leads: counts.leads,
      approved: counts.approved
    }));
}

export interface ProviderSalesPoint {
  providerName: string;
  approvedSales: number;
  totalLeads: number;
  commissionAmount: number;
}

export function buildSalesByProviderSeries(
  state: CRMState,
  dateFilter: DateFilterState
): ProviderSalesPoint[] {
  const bounds = getDateRangeBounds(dateFilter);
  const filteredLeads = state.leads.filter((l) => isWithinDateBounds(l.createdAt, bounds));
  const filteredComms = state.commissions.filter((c) =>
    isWithinDateBounds(c.eligibleAt, bounds)
  );

  return state.providers.map((provider) => {
    const pLeads = filteredLeads.filter((l) => l.providerId === provider.id);
    const approvedSales = pLeads.filter((l) => l.status === 'Approved').length;
    const commissionAmount = filteredComms
      .filter((c) => c.providerId === provider.id)
      .reduce((sum, c) => sum + c.amount, 0);
    return {
      providerName: provider.name,
      approvedSales,
      totalLeads: pLeads.length,
      commissionAmount
    };
  });
}

export interface StatusDistributionPoint {
  status: string;
  count: number;
}

export function buildStatusDistributionSeries(
  leads: Lead[],
  dateFilter: DateFilterState
): StatusDistributionPoint[] {
  const bounds = getDateRangeBounds(dateFilter);
  const filtered = leads.filter((l) => isWithinDateBounds(l.createdAt, bounds));
  return LEAD_STATUSES.map((status) => ({
    status,
    count: filtered.filter((l) => l.status === status).length
  }));
}

export interface CommissionTimePoint {
  dateKey: string;
  label: string;
  earned: number;
  paid: number;
}

export function buildCommissionOverTimeSeries(
  commissions: Commission[],
  dateFilter: DateFilterState
): CommissionTimePoint[] {
  const bounds = getDateRangeBounds(dateFilter);
  const filtered = commissions.filter((c) => isWithinDateBounds(c.eligibleAt, bounds));
  const byDay = new Map<string, { earned: number; paid: number }>();

  for (const comm of filtered) {
    const key = comm.eligibleAt.slice(0, 10);
    const entry = byDay.get(key) ?? { earned: 0, paid: 0 };
    entry.earned += comm.amount;
    if (comm.paymentStatus === 'Paid') {
      entry.paid += comm.amount;
    }
    byDay.set(key, entry);
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, vals]) => ({
      dateKey,
      label: new Date(dateKey + 'T00:00:00').toLocaleDateString('en-ZA', {
        day: '2-digit',
        month: 'short'
      }),
      earned: vals.earned,
      paid: vals.paid
    }));
}

