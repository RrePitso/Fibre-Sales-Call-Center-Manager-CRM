import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Minus, X } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import {
  ChecklistValue,
  Lead,
  QAChecklistItem,
  QAOutcome
} from '../../types/crm';
import {
  formatCurrency,
  formatDateTime,
  QA_CHECKLIST_TEMPLATE
} from '../../utils/calculations';
import { QAOutcomeBadge } from '../ui/Badge';
import { Modal } from '../ui/Modal';

interface QAReviewModalProps {
  lead: Lead | null;
  onClose: () => void;
}

export const QAReviewModal: React.FC<QAReviewModalProps> = ({ lead, onClose }) => {
  const { state, submitQAReview } = useCRM();

  const [reviewerName, setReviewerName] = useState('Naledi Khanye (Sales Manager)');
  const [checklist, setChecklist] = useState<QAChecklistItem[]>([]);
  const [outcome, setOutcome] = useState<Exclude<QAOutcome, 'Pending Review'>>('Passed');
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');

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
  const agent = useMemo(
    () => (lead ? state.agents.find((a) => a.id === lead.agentId) : undefined),
    [state.agents, lead]
  );

  const priorReviews = useMemo(
    () =>
      lead
        ? state.qaReviews
            .filter((r) => r.leadId === lead.id)
            .sort(
              (a, b) =>
                new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime()
            )
        : [],
    [state.qaReviews, lead]
  );

  useEffect(() => {
    if (!lead) return;
    setChecklist(
      QA_CHECKLIST_TEMPLATE.map((item) => ({
        key: item.key,
        label: item.label,
        status: 'pass'
      }))
    );
    setOutcome('Passed');
    setComments('');
    setError('');
  }, [lead]);

  if (!lead || !customer) return null;

  const hasFailedItem = checklist.some((item) => item.status === 'fail');

  const updateItemStatus = (key: QAChecklistItem['key'], status: ChecklistValue) => {
    setChecklist((prev) =>
      prev.map((item) => (item.key === key ? { ...item, status } : item))
    );
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!reviewerName.trim()) {
      setError('Reviewer name is required.');
      return;
    }

    if (outcome === 'Passed' && hasFailedItem) {
      setError(
        'Cannot mark QA as Passed while one or more checklist items are marked Fail. Choose Needs Correction or Failed.'
      );
      return;
    }

    if (
      (outcome === 'Needs Correction' || outcome === 'Failed') &&
      !comments.trim()
    ) {
      setError('Provide reviewer comments explaining why this application requires correction or failed.');
      return;
    }

    submitQAReview({
      leadId: lead.id,
      reviewerName: reviewerName.trim(),
      outcome,
      checklist,
      comments: comments.trim() || 'All QA checklist items verified.'
    });
    onClose();
  };

  return (
    <Modal
      isOpen={Boolean(lead)}
      onClose={onClose}
      title={`QA Audit — ${lead.id}`}
      subtitle={`${customer.fullName} · ${provider?.name ?? ''} ${product?.name ?? ''}`}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Application Summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block">Customer &amp; Phone</span>
            <span className="font-medium text-slate-900">{customer.fullName}</span>
            <span className="block font-mono text-slate-600">{customer.phone}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Installation Address</span>
            <span className="font-medium text-slate-900">{customer.address}</span>
            <span className="block text-slate-600">{customer.suburb}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Package &amp; Commission</span>
            <span className="font-medium text-slate-900">{product?.name}</span>
            <span className="block font-mono text-slate-600">
              {product ? `${formatCurrency(product.monthlyPrice)}/pm · Comm ${formatCurrency(product.commissionAmount)}` : '—'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Sales Agent</span>
            <span className="font-medium text-slate-900">{agent?.fullName}</span>
            <span className="block text-slate-600">
              Prior reviews: <strong className="font-mono">{priorReviews.length}</strong>
            </span>
          </div>
        </div>

        {/* 8-Point Checklist */}
        <div>
          <h3 className="text-xs font-semibold text-slate-700 mb-2">
            Verification Checklist (8 Checks)
          </h3>
          <div className="border border-slate-200 rounded-md divide-y divide-slate-100">
            {checklist.map((item, idx) => (
              <div
                key={item.key}
                className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <span className="text-xs font-medium text-slate-800">
                  {idx + 1}. {item.label}
                </span>

                <div
                  role="group"
                  aria-label={item.label}
                  className="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-md self-start sm:self-auto"
                >
                  <button
                    type="button"
                    onClick={() => updateItemStatus(item.key, 'pass')}
                    aria-pressed={item.status === 'pass'}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      item.status === 'pass'
                        ? 'bg-emerald-700 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Check className="w-3 h-3" aria-hidden="true" />
                    <span>Pass</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateItemStatus(item.key, 'fail')}
                    aria-pressed={item.status === 'fail'}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      item.status === 'fail'
                        ? 'bg-rose-700 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                    <span>Fail</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateItemStatus(item.key, 'na')}
                    aria-pressed={item.status === 'na'}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      item.status === 'na'
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Minus className="w-3 h-3" aria-hidden="true" />
                    <span>N/A</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Outcome & Reviewer Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="qa-outcome" className="block text-xs font-medium text-slate-700 mb-1">
              Review outcome *
            </label>
            <select
              id="qa-outcome"
              value={outcome}
              onChange={(e) => {
                setOutcome(e.target.value as Exclude<QAOutcome, 'Pending Review'>);
                setError('');
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
            >
              <option value="Passed">Passed (Unlocks Commission Eligibility)</option>
              <option value="Needs Correction">Needs Correction (Return to Agent)</option>
              <option value="Failed">Failed (Blocks Commission)</option>
            </select>
          </div>

          <div>
            <label htmlFor="qa-reviewer" className="block text-xs font-medium text-slate-700 mb-1">
              Reviewer *
            </label>
            <input
              id="qa-reviewer"
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
            />
          </div>
        </div>

        <div>
          <label htmlFor="qa-comments" className="block text-xs font-medium text-slate-700 mb-1">
            Reviewer comments {outcome !== 'Passed' ? '*' : '(optional)'}
          </label>
          <textarea
            id="qa-comments"
            rows={2}
            value={comments}
            onChange={(e) => {
              setComments(e.target.value);
              setError('');
            }}
            placeholder="Record consent timestamp verification, pricing confirmation, or required corrections..."
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Immutable Prior Review History */}
        {priorReviews.length > 0 && (
          <div className="pt-3 border-t border-slate-200">
            <h3 className="text-xs font-semibold text-slate-500 mb-2">
              Previous QA Reviews for {lead.id} (Preserved History)
            </h3>
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-md max-h-40 overflow-y-auto">
              {priorReviews.map((rev) => (
                <li key={rev.id} className="p-2.5 text-xs flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-600">{rev.id}</span>
                      <QAOutcomeBadge outcome={rev.outcome} />
                      <span className="text-slate-500">{rev.reviewerName}</span>
                    </div>
                    <p className="text-slate-700">{rev.comments}</p>
                  </div>
                  <span className="font-mono tabular-nums text-slate-400 whitespace-nowrap shrink-0">
                    {formatDateTime(rev.reviewedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md"
          >
            Submit QA Review
          </button>
        </div>
      </form>
    </Modal>
  );
};
