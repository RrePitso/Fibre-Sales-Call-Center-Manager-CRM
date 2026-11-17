export const CRM_SCHEMA_VERSION = 1;

export type NavSection =
  | 'dashboard'
  | 'leads'
  | 'pipeline'
  | 'agents'
  | 'products'
  | 'qa'
  | 'commissions'
  | 'analytics'
  | 'settings';

export type LeadStatus =
  | 'New Lead'
  | 'Contacted'
  | 'Application Pending'
  | 'Submitted'
  | 'Approved'
  | 'Rejected';

export const LEAD_STATUSES: LeadStatus[] = [
  'New Lead',
  'Contacted',
  'Application Pending',
  'Submitted',
  'Approved',
  'Rejected'
];

export type QAOutcome = 'Pending Review' | 'Passed' | 'Needs Correction' | 'Failed';

export type ChecklistValue = 'pass' | 'fail' | 'na';

export interface QAChecklistItem {
  key:
    | 'identityVerified'
    | 'consentRecorded'
    | 'correctProvider'
    | 'correctPackage'
    | 'addressConfirmed'
    | 'contactValidated'
    | 'pricingCommunicated'
    | 'applicationComplete';
  label: string;
  status: ChecklistValue;
  note?: string;
}

export type CommissionPaymentStatus =
  | 'Pending Verification'
  | 'Approved for Payment'
  | 'Paid';

export type DateRangePreset = 'today' | '7d' | '30d' | 'this_month' | 'custom';

export interface DateFilterState {
  preset: DateRangePreset;
  customStart?: string;
  customEnd?: string;
}

export interface Agent {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  startDate: string; // YYYY-MM-DD
  isActive: boolean;
}

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  suburb: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  customerId: string;
  providerId: string;
  productId: string;
  agentId: string;
  status: LeadStatus;
  notes: string;
  followUpDate?: string; // YYYY-MM-DD
  followUpNotes?: string;
  rejectionReason?: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  statusEnteredAt: string; // ISO timestamp
}

export interface Provider {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  providerId: string;
  name: string;
  speedLabel: string;
  monthlyPrice: number;
  commissionAmount: number;
  isActive: boolean;
}

export interface QAReview {
  id: string;
  leadId: string;
  agentId: string;
  reviewerName: string;
  reviewedAt: string; // ISO timestamp
  outcome: Exclude<QAOutcome, 'Pending Review'>;
  checklist: QAChecklistItem[];
  comments: string;
}

export interface Commission {
  id: string;
  leadId: string;
  customerId: string;
  agentId: string;
  providerId: string;
  productId: string;
  /** Locked at eligibility time so future rate edits never mutate historical earnings */
  amount: number;
  eligibleAt: string; // ISO timestamp
  paymentStatus: CommissionPaymentStatus;
  paymentDate?: string; // YYYY-MM-DD
}

export interface ActivityEvent {
  id: string;
  leadId: string;
  type:
    | 'created'
    | 'status_change'
    | 'agent_assigned'
    | 'qa_review'
    | 'commission_created'
    | 'commission_paid'
    | 'updated';
  description: string;
  fromStatus?: LeadStatus;
  toStatus?: LeadStatus;
  actor: string;
  timestamp: string;
}

export interface CRMState {
  schemaVersion: number;
  agents: Agent[];
  customers: Customer[];
  leads: Lead[];
  providers: Provider[];
  products: Product[];
  qaReviews: QAReview[];
  commissions: Commission[];
  activityHistory: ActivityEvent[];
  lastUpdatedAt: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}
