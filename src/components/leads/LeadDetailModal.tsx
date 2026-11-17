import React, { useMemo, useState } from 'react';
import { Calendar, Edit3, Trash2 } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { Lead } from '../../types/crm';
import {
  calculateDaysInStage,
  formatCurrency,
  formatDateTime,
  formatShortDate,
  getEffectiveQAOutcome,
  getLatestQAByLeadId
} from '../../utils/calculations';
import {
  CommissionStatusBadge,
  LeadStatusBadge,
  QAOutcomeBadge
} from '../ui/Badge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Modal } from '../ui/Modal';

interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
  onEdit: (lead: Lead) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  onClose,
  onEdit
}) => {
  const { state, assignLeadAgent, deleteLead, setActiveSection } = useCRM();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const customer = useMemo(
    () => (lead ? state.customers.find((c) => c.id === lead.customerId) : undefined),
    [state.customers, lead]
  );
  const provider = useMemo(
    () => (lead ? state.providers.find((p) => p.id === lead.providerId) : undefined),
    [state.providers, lead]
  );
  const product = useMemo(
    () => (lead ? state.products.find((p) => p.id === lead.productId) : undefined),
    [state.products, lead]
  );
  const latestQA = useMemo(() => {
    if (!lead) return undefined;
    return getLatestQAByLeadId(state.qaReviews).get(lead.id);
  }, [state.qaReviews, lead]);

  const commission = useMemo(
    () => (lead ? state.commissions.find((c) => c.leadId === lead.id) : undefined),
    [state.commissions, lead]
  );

  const leadHistory = useMemo(
    () =>
      lead
        ? state.activityHistory
            .filter((a) => a.leadId === lead.id)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        : [],
    [state.activityHistory, lead]
  );

  if (!lead || !customer) return null;

  const qaOutcome = getEffectiveQAOutcome(lead, latestQA);
  const daysInStage = calculateDaysInStage(lead.statusEnteredAt);

  return (
    <>
      <Modal
        isOpen={Boolean(lead)}
        onClose={onClose}
        title={`${customer.fullName}`}
        subtitle={`${lead.id} · Created ${formatShortDate(lead.createdAt)}`}
        size="lg"
      >
        <div className="space-y-6">
          {/* Status & Quick Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <LeadStatusBadge status={lead.status} />
              <QAOutcomeBadge outcome={qaOutcome} />
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {daysInStage}d in stage
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(lead);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Edit Lead</span>
              </button>

              {lead.status === 'Approved' && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setActiveSection('qa');
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md"
                >
                  Open in QA
                </button>
              )}

              <button
                type="button"
                disabled={Boolean(commission)}
                title={
                  commission
                    ? 'Leads with an existing commission record cannot be deleted.'
                    : 'Delete lead'
                }
                onClick={() => setConfirmDelete(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border ${
                  commission
                    ? 'text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed'
                    : 'text-rose-700 bg-white border-rose-200 hover:bg-rose-50'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Delete</span>
              </button>
            </div>
          </div>

          {/* Core Customer & Package Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-500">Customer Information</h3>
              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Phone</dt>
                  <dd className="font-mono tabular-nums text-slate-900">{customer.phone}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Email</dt>
                  <dd className="text-slate-900 truncate">{customer.email || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Address</dt>
                  <dd className="text-slate-900 text-right">{customer.address}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Suburb</dt>
                  <dd className="text-slate-900">{customer.suburb}</dd>
                </div>
              </dl>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-500">Package &amp; Assignment</h3>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Provider</dt>
                  <dd className="font-medium text-slate-900">{provider?.name || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Package</dt>
                  <dd className="text-slate-900 text-right">
                    {product ? `${product.name} (${formatCurrency(product.monthlyPrice)}/pm)` : '—'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Assigned Agent</dt>
                  <dd>
                    <select
                      aria-label="Reassign sales agent"
                      value={lead.agentId}
                      onChange={(e) => assignLeadAgent(lead.id, e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900"
                    >
                      {state.agents
                        .filter((a) => a.isActive || a.id === lead.agentId)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.fullName} {!a.isActive ? '(Inactive)' : ''}
                          </option>
                        ))}
                    </select>
                  </dd>
                </div>
                {commission && (
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <dt className="text-slate-500">Commission</dt>
                    <dd className="flex items-center gap-2">
                      <span className="font-mono tabular-nums font-semibold text-slate-900">
                        {formatCurrency(commission.amount)}
                      </span>
                      <CommissionStatusBadge status={commission.paymentStatus} />
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Notes, Follow-up & Rejection */}
          {(lead.notes || lead.followUpDate || lead.rejectionReason) && (
            <div className="space-y-2.5 pt-4 border-t border-slate-200 text-xs">
              {lead.followUpDate && (
                <div className="flex items-start gap-2 text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <span className="font-medium">Follow-up scheduled: </span>
                    <span className="font-mono tabular-nums">{formatShortDate(lead.followUpDate)}</span>
                    {lead.followUpNotes && <span className="text-slate-500"> — {lead.followUpNotes}</span>}
                  </div>
                </div>
              )}
              {lead.rejectionReason && (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800">
                  <span className="font-medium">Rejection reason: </span>
                  {lead.rejectionReason}
                </div>
              )}
              {lead.notes && (
                <div className="text-slate-600">
                  <span className="font-medium text-slate-700">Notes: </span>
                  {lead.notes}
                </div>
              )}
            </div>
          )}

          {/* Status & Activity History */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-semibold text-slate-500 mb-3">
              Status &amp; Activity History
            </h3>
            {leadHistory.length === 0 ? (
              <p className="text-xs text-slate-500">No recorded history events for this lead yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-md">
                {leadHistory.map((evt) => (
                  <li key={evt.id} className="px-3 py-2.5 flex items-start justify-between gap-4 text-xs">
                    <div>
                      <p className="font-medium text-slate-800">{evt.description}</p>
                      <p className="text-slate-500 mt-0.5">{evt.actor}</p>
                    </div>
                    <span className="text-slate-500 font-mono tabular-nums whitespace-nowrap shrink-0">
                      {formatDateTime(evt.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteLead(lead.id);
          onClose();
        }}
        title={`Delete lead ${lead.id}?`}
        message={`This will permanently remove ${customer.fullName}'s lead record and associated activity history.`}
        confirmLabel="Delete Lead"
        variant="danger"
      />
    </>
  );
};
