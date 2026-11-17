import React, { useMemo, useState } from 'react';
import { Calendar, Clock, Columns3, Table2 } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { LEAD_STATUSES, Lead, LeadStatus } from '../types/crm';
import {
  calculateDaysInStage,
  formatShortDate,
  getEffectiveQAOutcome,
  getLatestQAByLeadId
} from '../utils/calculations';
import { LeadDetailModal } from '../components/leads/LeadDetailModal';
import { LeadFormModal } from '../components/leads/LeadFormModal';
import { LeadStatusBadge, QAOutcomeBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';

export const PipelinePage: React.FC = () => {
  const { state, updateLeadStatus } = useCRM();

  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [stageFilter, setStageFilter] = useState<LeadStatus | 'all'>('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [followUpOnly, setFollowUpOnly] = useState(false);

  const [transitionTarget, setTransitionTarget] = useState<{
    lead: Lead;
    nextStatus: LeadStatus;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [transitionError, setTransitionError] = useState('');

  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

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
  const latestQAMap = useMemo(
    () => getLatestQAByLeadId(state.qaReviews),
    [state.qaReviews]
  );

  const stageCounts = useMemo(() => {
    const counts: Record<LeadStatus, number> = {
      'New Lead': 0,
      Contacted: 0,
      'Application Pending': 0,
      Submitted: 0,
      Approved: 0,
      Rejected: 0
    };
    for (const lead of state.leads) {
      if (agentFilter !== 'all' && lead.agentId !== agentFilter) continue;
      counts[lead.status] += 1;
    }
    return counts;
  }, [state.leads, agentFilter]);

  const filteredLeads = useMemo(() => {
    return state.leads
      .filter((lead) => {
        if (stageFilter !== 'all' && lead.status !== stageFilter) return false;
        if (agentFilter !== 'all' && lead.agentId !== agentFilter) return false;
        if (followUpOnly && !lead.followUpDate) return false;
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.statusEnteredAt).getTime() - new Date(a.statusEnteredAt).getTime()
      );
  }, [state.leads, stageFilter, agentFilter, followUpOnly]);

  const openTransitionModal = (lead: Lead, nextStatus: LeadStatus) => {
    setTransitionTarget({ lead, nextStatus });
    setRejectionReason(lead.rejectionReason || '');
    setFollowUpDate(lead.followUpDate || '');
    setFollowUpNotes(lead.followUpNotes || '');
    setTransitionError('');
  };

  const handleConfirmTransition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transitionTarget) return;
    if (transitionTarget.nextStatus === 'Rejected' && !rejectionReason.trim()) {
      setTransitionError('Enter a reason for rejecting this application.');
      return;
    }
    updateLeadStatus(transitionTarget.lead.id, transitionTarget.nextStatus, {
      rejectionReason: rejectionReason.trim() || undefined,
      followUpDate: followUpDate || undefined,
      followUpNotes: followUpNotes.trim() || undefined
    });
    setTransitionTarget(null);
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const detailLead = useMemo(
    () => state.leads.find((l) => l.id === detailLeadId) ?? null,
    [state.leads, detailLeadId]
  );

  const editingCustomer = useMemo(
    () => (editingLead ? customerMap.get(editingLead.customerId) ?? null : null),
    [editingLead, customerMap]
  );

  const visibleStages =
    stageFilter === 'all' ? LEAD_STATUSES : LEAD_STATUSES.filter((s) => s === stageFilter);

  return (
    <div className="space-y-5">
      {/* Stage Summary Filter Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <button
          type="button"
          onClick={() => setStageFilter('all')}
          className={`p-3 rounded-lg border text-left transition-colors ${
            stageFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-xs block opacity-80">All Stages</span>
          <span className="text-lg font-semibold font-mono tabular-nums mt-0.5 block">
            {Object.values(stageCounts).reduce((a, b) => a + b, 0)}
          </span>
        </button>

        {LEAD_STATUSES.map((status) => {
          const active = stageFilter === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setStageFilter(status)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                active
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-xs block truncate opacity-85">{status}</span>
              <span className="text-lg font-semibold font-mono tabular-nums mt-0.5 block">
                {stageCounts[status]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pipeline Controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Filter pipeline by agent"
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

          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={followUpOnly}
              onChange={(e) => setFollowUpOnly(e.target.checked)}
              className="rounded border-slate-300 text-blue-700"
            />
            <span>Requires follow-up only</span>
          </label>
        </div>

        <div
          role="group"
          aria-label="Pipeline view mode"
          className="inline-flex items-center p-1 bg-slate-100 border border-slate-200 rounded-lg"
        >
          <button
            type="button"
            onClick={() => setViewMode('board')}
            aria-pressed={viewMode === 'board'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'board'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Columns3 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Board</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'table'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Table</span>
          </button>
        </div>
      </div>

      {filteredLeads.length === 0 ? (
        <EmptyState
          title="No applications match this pipeline filter"
          description="Select All Stages or clear the agent and follow-up filters to see active pipeline records."
        />
      ) : viewMode === 'board' ? (
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-flow-col auto-cols-[minmax(270px,1fr)] gap-4">
            {visibleStages.map((stage) => {
              const stageLeads = filteredLeads.filter((l) => l.status === stage);
              return (
                <section
                  key={stage}
                  aria-label={`${stage} stage`}
                  className="bg-slate-100/80 border border-slate-200 rounded-lg flex flex-col max-h-[680px]"
                >
                  <div className="px-3.5 py-3 border-b border-slate-200 bg-white rounded-t-lg flex items-center justify-between">
                    <h2 className="text-xs font-semibold text-slate-900 truncate">{stage}</h2>
                    <span className="text-xs font-mono tabular-nums text-slate-600">
                      {stageLeads.length}
                    </span>
                  </div>

                  <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
                    {stageLeads.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8">No records</p>
                    ) : (
                      stageLeads.map((lead) => {
                        const customer = customerMap.get(lead.customerId);
                        const agent = agentMap.get(lead.agentId);
                        const provider = providerMap.get(lead.providerId);
                        const days = calculateDaysInStage(lead.statusEnteredAt);
                        const overdueFollowUp =
                          lead.followUpDate && lead.followUpDate <= todayStr;

                        return (
                          <article
                            key={lead.id}
                            className="bg-white border border-slate-200 rounded-md p-3 space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => setDetailLeadId(lead.id)}
                                className="text-xs font-semibold text-slate-900 hover:text-blue-700 text-left"
                              >
                                {customer?.fullName || 'Unknown'}
                              </button>
                              <span className="text-[11px] font-mono tabular-nums text-slate-500 shrink-0">
                                {days}d
                              </span>
                            </div>

                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                              <span className="font-mono">{lead.id}</span>
                              <span aria-hidden="true">·</span>
                              <span>{provider?.name}</span>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{agent?.fullName}</span>
                            </div>

                            {lead.followUpDate && (
                              <div
                                className={`flex items-center gap-1.5 text-[11px] ${
                                  overdueFollowUp ? 'text-amber-700 font-medium' : 'text-slate-600'
                                }`}
                              >
                                <Calendar className="w-3 h-3 shrink-0" aria-hidden="true" />
                                <span className="font-mono tabular-nums">
                                  Follow-up {formatShortDate(lead.followUpDate)}
                                </span>
                              </div>
                            )}

                            {lead.status === 'Rejected' && lead.rejectionReason && (
                              <p className="text-[11px] text-rose-700 line-clamp-2">
                                {lead.rejectionReason}
                              </p>
                            )}

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                              <select
                                aria-label={`Update status for ${lead.id}`}
                                value={lead.status}
                                onChange={(e) => {
                                  const next = e.target.value as LeadStatus;
                                  if (next === 'Rejected') {
                                    openTransitionModal(lead, next);
                                  } else {
                                    updateLeadStatus(lead.id, next);
                                  }
                                }}
                                className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 flex-1 min-w-0"
                              >
                                {LEAD_STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={() => openTransitionModal(lead, lead.status)}
                                className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap shrink-0"
                              >
                                Follow-up
                              </button>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Lead</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Agent</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4 whitespace-nowrap">Time in Stage</th>
                  <th className="py-3 px-4">QA Eligibility</th>
                  <th className="py-3 px-4">Follow-up / Notes</th>
                  <th className="py-3 px-4 text-right">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredLeads.map((lead) => {
                  const customer = customerMap.get(lead.customerId);
                  const provider = providerMap.get(lead.providerId);
                  const agent = agentMap.get(lead.agentId);
                  const days = calculateDaysInStage(lead.statusEnteredAt);
                  const qaOutcome = getEffectiveQAOutcome(lead, latestQAMap.get(lead.id));

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4">
                        <button
                          type="button"
                          onClick={() => setDetailLeadId(lead.id)}
                          className="font-medium text-slate-900 hover:text-blue-700 text-left block"
                        >
                          {customer?.fullName || 'Unknown'}
                        </button>
                        <span className="text-xs font-mono text-slate-500">{lead.id}</span>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-700">
                        {provider?.name}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-700">
                        {agent?.fullName}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <LeadStatusBadge status={lead.status} />
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" aria-hidden="true" />
                          {days}d
                        </span>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <QAOutcomeBadge outcome={qaOutcome} />
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-600 max-w-[240px]">
                        {lead.status === 'Rejected' && lead.rejectionReason ? (
                          <span className="text-rose-700">{lead.rejectionReason}</span>
                        ) : lead.followUpDate ? (
                          <div>
                            <span className="font-mono tabular-nums font-medium text-slate-800">
                              {formatShortDate(lead.followUpDate)}
                            </span>
                            {lead.followUpNotes && (
                              <p className="text-slate-500 truncate">{lead.followUpNotes}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openTransitionModal(lead, lead.status)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
                        >
                          Update Stage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stage & Follow-up Modal */}
      <Modal
        isOpen={Boolean(transitionTarget)}
        onClose={() => setTransitionTarget(null)}
        title={`Update Pipeline — ${transitionTarget?.lead.id ?? ''}`}
        subtitle={
          transitionTarget
            ? customerMap.get(transitionTarget.lead.customerId)?.fullName
            : undefined
        }
        size="md"
      >
        {transitionTarget && (
          <form onSubmit={handleConfirmTransition} className="space-y-4">
            <div>
              <label htmlFor="pipe-status" className="block text-xs font-medium text-slate-700 mb-1">
                Pipeline stage
              </label>
              <select
                id="pipe-status"
                value={transitionTarget.nextStatus}
                onChange={(e) =>
                  setTransitionTarget({
                    ...transitionTarget,
                    nextStatus: e.target.value as LeadStatus
                  })
                }
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {transitionTarget.nextStatus === 'Rejected' && (
              <div>
                <label htmlFor="pipe-reject" className="block text-xs font-medium text-slate-700 mb-1">
                  Reason for rejection *
                </label>
                <textarea
                  id="pipe-reject"
                  rows={2}
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    setTransitionError('');
                  }}
                  placeholder="e.g. Coverage unavailable, customer cancelled, credit declined"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
                />
                {transitionError && (
                  <p className="text-xs text-rose-700 mt-1">{transitionError}</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pipe-fdate" className="block text-xs font-medium text-slate-700 mb-1">
                  Follow-up date
                </label>
                <input
                  id="pipe-fdate"
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label htmlFor="pipe-fnotes" className="block text-xs font-medium text-slate-700 mb-1">
                  Follow-up notes
                </label>
                <input
                  id="pipe-fnotes"
                  type="text"
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="Optional reminder"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setTransitionTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md"
              >
                Save Update
              </button>
            </div>
          </form>
        )}
      </Modal>

      <LeadDetailModal
        lead={detailLead}
        onClose={() => setDetailLeadId(null)}
        onEdit={(lead) => setEditingLead(lead)}
      />

      <LeadFormModal
        isOpen={Boolean(editingLead)}
        onClose={() => setEditingLead(null)}
        editingLead={editingLead}
        editingCustomer={editingCustomer}
      />
    </div>
  );
};
