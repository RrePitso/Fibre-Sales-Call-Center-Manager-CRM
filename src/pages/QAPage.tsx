import React, { useMemo, useState } from 'react';
import { ClipboardCheck, Search } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { Lead, QAOutcome } from '../types/crm';
import {
  formatDateTime,
  formatPercent,
  formatShortDate,
  getEffectiveQAOutcome,
  getLatestQAByLeadId,
  safePercent
} from '../utils/calculations';
import { QAReviewModal } from '../components/qa/QAReviewModal';
import { QAOutcomeBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

type QATab = 'queue' | 'all_approved' | 'history';

export const QAPage: React.FC = () => {
  const { state } = useCRM();

  const [tab, setTab] = useState<QATab>('queue');
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | QAOutcome>('all');
  const [reviewingLead, setReviewingLead] = useState<Lead | null>(null);

  const customerMap = useMemo(
    () => new Map(state.customers.map((c) => [c.id, c])),
    [state.customers]
  );
  const agentMap = useMemo(
    () => new Map(state.agents.map((a) => [a.id, a])),
    [state.agents]
  );
  const providerMap = useMemo(
    () => new Map(state.providers.map((p) => [p.id, p])),
    [state.providers]
  );
  const productMap = useMemo(
    () => new Map(state.products.map((p) => [p.id, p])),
    [state.products]
  );
  const latestQAMap = useMemo(
    () => getLatestQAByLeadId(state.qaReviews),
    [state.qaReviews]
  );

  const approvedLeads = useMemo(
    () => state.leads.filter((l) => l.status === 'Approved'),
    [state.leads]
  );

  const qaStats = useMemo(() => {
    let pending = 0;
    let needsCorrection = 0;
    let passed = 0;
    let failed = 0;

    for (const lead of approvedLeads) {
      const outcome = getEffectiveQAOutcome(lead, latestQAMap.get(lead.id));
      if (outcome === 'Pending Review') pending += 1;
      else if (outcome === 'Needs Correction') needsCorrection += 1;
      else if (outcome === 'Passed') passed += 1;
      else if (outcome === 'Failed') failed += 1;
    }

    const totalPassedReviews = state.qaReviews.filter((r) => r.outcome === 'Passed').length;
    const passRate = safePercent(totalPassedReviews, state.qaReviews.length);

    return { pending, needsCorrection, passed, failed, passRate };
  }, [approvedLeads, latestQAMap, state.qaReviews]);

  const filteredApprovedLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return approvedLeads
      .filter((lead) => {
        const outcome = getEffectiveQAOutcome(lead, latestQAMap.get(lead.id));
        if (tab === 'queue' && outcome !== 'Pending Review' && outcome !== 'Needs Correction') {
          return false;
        }
        if (agentFilter !== 'all' && lead.agentId !== agentFilter) return false;
        if (outcomeFilter !== 'all' && outcome !== outcomeFilter) return false;
        if (q) {
          const customerName = customerMap.get(lead.customerId)?.fullName.toLowerCase() ?? '';
          if (!lead.id.toLowerCase().includes(q) && !customerName.includes(q)) {
            return false;
          }
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.statusEnteredAt).getTime() - new Date(a.statusEnteredAt).getTime()
      );
  }, [
    approvedLeads,
    tab,
    agentFilter,
    outcomeFilter,
    search,
    latestQAMap,
    customerMap
  ]);

  const sortedHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...state.qaReviews]
      .filter((rev) => {
        if (agentFilter !== 'all' && rev.agentId !== agentFilter) return false;
        if (outcomeFilter !== 'all' && rev.outcome !== outcomeFilter) return false;
        if (q) {
          const lead = state.leads.find((l) => l.id === rev.leadId);
          const customerName = lead
            ? customerMap.get(lead.customerId)?.fullName.toLowerCase() ?? ''
            : '';
          if (
            !rev.id.toLowerCase().includes(q) &&
            !rev.leadId.toLowerCase().includes(q) &&
            !customerName.includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime()
      );
  }, [state.qaReviews, state.leads, agentFilter, outcomeFilter, search, customerMap]);

  return (
    <div className="space-y-5">
      {/* QA KPI Summary */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-500">Awaiting QA Review</p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-amber-700 mt-1.5">
            {qaStats.pending}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-500">Needs Correction</p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-slate-900 mt-1.5">
            {qaStats.needsCorrection}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-500">QA Passed</p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-emerald-700 mt-1.5">
            {qaStats.passed}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-500">QA Failed</p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-rose-700 mt-1.5">
            {qaStats.failed}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 col-span-2 lg:col-span-1">
          <p className="text-xs font-medium text-slate-500">Overall Review Pass Rate</p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-slate-900 mt-1.5">
            {formatPercent(qaStats.passRate)}
          </p>
        </div>
      </section>

      {/* Tabs & Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="QA sections"
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'queue'}
              onClick={() => setTab('queue')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === 'queue'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Awaiting Action ({qaStats.pending + qaStats.needsCorrection})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'all_approved'}
              onClick={() => setTab('all_approved')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === 'all_approved'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Approved ({approvedLeads.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'history'}
              onClick={() => setTab('history')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === 'history'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Review Audit Log ({state.qaReviews.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Search QA records"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Lead ID or customer..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white"
              />
            </div>

            <select
              aria-label="Filter QA by agent"
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-md"
            >
              <option value="all">All Agents</option>
              {state.agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by QA outcome"
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value as 'all' | QAOutcome)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-md"
            >
              <option value="all">All Outcomes</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Needs Correction">Needs Correction</option>
              <option value="Passed">Passed</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {tab !== 'history' ? (
        filteredApprovedLeads.length === 0 ? (
          <EmptyState
            title="No applications in this QA view"
            description={
              tab === 'queue'
                ? 'All approved sales have been reviewed and finalised.'
                : 'No approved applications match your current filter.'
            }
          />
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Lead ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Provider &amp; Package</th>
                    <th className="py-3 px-4">Agent</th>
                    <th className="py-3 px-4">QA Status</th>
                    <th className="py-3 px-4 text-right">Reviews</th>
                    <th className="py-3 px-4">Approved Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredApprovedLeads.map((lead) => {
                    const customer = customerMap.get(lead.customerId);
                    const provider = providerMap.get(lead.providerId);
                    const product = productMap.get(lead.productId);
                    const agent = agentMap.get(lead.agentId);
                    const latest = latestQAMap.get(lead.id);
                    const outcome = getEffectiveQAOutcome(lead, latest);
                    const reviewCount = state.qaReviews.filter(
                      (r) => r.leadId === lead.id
                    ).length;

                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                          {lead.id}
                        </td>
                        <td className="py-2.5 px-4">
                          <p className="font-medium text-slate-900">{customer?.fullName}</p>
                          <p className="text-xs font-mono text-slate-500">{customer?.phone}</p>
                        </td>
                        <td className="py-2.5 px-4 text-xs">
                          <p className="font-medium text-slate-900">{provider?.name}</p>
                          <p className="text-slate-500">{product?.name}</p>
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-700">
                          {agent?.fullName}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <QAOutcomeBadge outcome={outcome} />
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-600">
                          {reviewCount}
                        </td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-xs text-slate-500 whitespace-nowrap">
                          {formatShortDate(lead.statusEnteredAt)}
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setReviewingLead(lead)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md"
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{reviewCount > 0 ? 'Re-review' : 'Conduct QA'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : sortedHistory.length === 0 ? (
        <EmptyState
          title="No QA review history matches"
          description="Adjust your search or filter settings to view recorded QA audits."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Review ID</th>
                  <th className="py-3 px-4">Lead</th>
                  <th className="py-3 px-4">Agent</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4">Checks Passed</th>
                  <th className="py-3 px-4">Comments</th>
                  <th className="py-3 px-4">Reviewer</th>
                  <th className="py-3 px-4 text-right">Reviewed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {sortedHistory.map((rev) => {
                  const passedChecks = rev.checklist.filter((c) => c.status === 'pass').length;
                  return (
                    <tr key={rev.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                        {rev.id}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                        {rev.leadId}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                        {agentMap.get(rev.agentId)?.fullName || '—'}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <QAOutcomeBadge outcome={rev.outcome} />
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700">
                        {passedChecks}/{rev.checklist.length}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate">
                        {rev.comments}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                        {rev.reviewerName}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        {formatDateTime(rev.reviewedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <QAReviewModal
        lead={reviewingLead}
        onClose={() => setReviewingLead(null)}
      />
    </div>
  );
};
