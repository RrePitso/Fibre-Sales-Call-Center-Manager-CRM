import React from 'react';
import { Check, Clock, AlertTriangle, X, Minus } from 'lucide-react';
import { CommissionPaymentStatus, LeadStatus, QAOutcome } from '../../types/crm';

type Tone = 'slate' | 'blue' | 'amber' | 'emerald' | 'rose' | 'indigo';

const TONE_CLASSES: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  blue: 'bg-sky-50 text-sky-800 border-sky-200',
  indigo: 'bg-blue-50 text-blue-800 border-blue-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rose: 'bg-rose-50 text-rose-800 border-rose-200'
};

export const Badge: React.FC<{
  tone: Tone;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ tone, icon, children }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap ${TONE_CLASSES[tone]}`}
  >
    {icon}
    <span>{children}</span>
  </span>
);

export const LeadStatusBadge: React.FC<{ status: LeadStatus }> = ({ status }) => {
  const toneMap: Record<LeadStatus, Tone> = {
    'New Lead': 'slate',
    Contacted: 'indigo',
    'Application Pending': 'amber',
    Submitted: 'blue',
    Approved: 'emerald',
    Rejected: 'rose'
  };
  const icon =
    status === 'Approved' ? (
      <Check className="w-3 h-3" aria-hidden="true" />
    ) : status === 'Rejected' ? (
      <X className="w-3 h-3" aria-hidden="true" />
    ) : status === 'Application Pending' ? (
      <Clock className="w-3 h-3" aria-hidden="true" />
    ) : undefined;

  return (
    <Badge tone={toneMap[status]} icon={icon}>
      {status}
    </Badge>
  );
};

export const QAOutcomeBadge: React.FC<{ outcome: QAOutcome | 'Not Eligible' }> = ({
  outcome
}) => {
  const toneMap: Record<QAOutcome | 'Not Eligible', Tone> = {
    'Pending Review': 'amber',
    Passed: 'emerald',
    'Needs Correction': 'amber',
    Failed: 'rose',
    'Not Eligible': 'slate'
  };
  const icon =
    outcome === 'Passed' ? (
      <Check className="w-3 h-3" aria-hidden="true" />
    ) : outcome === 'Failed' ? (
      <X className="w-3 h-3" aria-hidden="true" />
    ) : outcome === 'Needs Correction' ? (
      <AlertTriangle className="w-3 h-3" aria-hidden="true" />
    ) : outcome === 'Pending Review' ? (
      <Clock className="w-3 h-3" aria-hidden="true" />
    ) : (
      <Minus className="w-3 h-3" aria-hidden="true" />
    );

  return (
    <Badge tone={toneMap[outcome]} icon={icon}>
      {outcome}
    </Badge>
  );
};

export const CommissionStatusBadge: React.FC<{ status: CommissionPaymentStatus }> = ({
  status
}) => {
  const toneMap: Record<CommissionPaymentStatus, Tone> = {
    'Pending Verification': 'amber',
    'Approved for Payment': 'blue',
    Paid: 'emerald'
  };
  const icon =
    status === 'Paid' ? (
      <Check className="w-3 h-3" aria-hidden="true" />
    ) : status === 'Pending Verification' ? (
      <Clock className="w-3 h-3" aria-hidden="true" />
    ) : undefined;

  return (
    <Badge tone={toneMap[status]} icon={icon}>
      {status}
    </Badge>
  );
};
