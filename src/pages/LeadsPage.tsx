import React, { useEffect, useMemo, useState } from 'react';
import { Edit3, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { LEAD_STATUSES, Lead } from '../types/crm';
import {
  formatShortDate,
  getEffectiveQAOutcome,
  getLatestQAByLeadId
} from '../utils/calculations';
import { normalizePhone } from '../utils/validators';
import { LeadDetailModal } from '../components/leads/LeadDetailModal';
import { LeadFormModal } from '../components/leads/LeadFormModal';
import { LeadStatusBadge, QAOutcomeBadge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';

type SortOption = 'newest' | 'oldest' | 'name_asc' | 'name_desc';

export const LeadsPage: React.FC = () => {
  const { state, deleteLead, assignLeadAgent } = useCRM();

  const [searchRaw, setSearchRaw] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);

  // Debounce search input for smooth typing performance
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchRaw.trim().toLowerCase());
    }, 180);
    return () => window.clearTimeout(timer);
  }, [searchRaw]);

  const customerMap = useMemo(
    () => new Map(state.customers.map((c) => [c.id, c])),
    [state.customers]
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
  const commissionLeadIds = useMemo(
    () => new Set(state.commissions.map((c) => c.leadId)),
    [state.commissions]
  );

  const filteredLeads = useMemo(() => {
    const normQuery = normalizePhone(searchQuery);

    const list = state.leads.filter((lead) => {
      if (providerFilter !== 'all' && lead.providerId !== providerFilter) return false;
      if (agentFilter !== 'all' && lead.agentId !== agentFilter) return false;
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false;

      if (searchQuery) {
        const customer = customerMap.get(lead.customerId);
        const nameMatch = customer?.fullName.toLowerCase().includes(searchQuery) ?? false;
        const idMatch = lead.id.toLowerCase().includes(searchQuery);
        const phoneMatch =
          (customer?.phone.toLowerCase().includes(searchQuery) ?? false) ||
          (normQuery.length >= 3 &&
            customer !== undefined &&
            normalizePhone(customer.phone).includes(normQuery));
        if (!nameMatch && !idMatch && !phoneMatch) return false;
      }

      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      const nameA = customerMap.get(a.customerId)?.fullName || '';
      const nameB = customerMap.get(b.customerId)?.fullName || '';
      return sortBy === 'name_asc'
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });
  }, [
    state.leads,
    providerFilter,
    agentFilter,
    statusFilter,
    searchQuery,
    sortBy,
    customerMap
  ]);

  const detailLead = useMemo(
    () => state.leads.find((l) => l.id === detailLeadId) ?? null,
    [state.leads, detailLeadId]
  );

  const editingCustomer = useMemo(
    () => (editingLead ? customerMap.get(editingLead.customerId) ?? null : null),
    [editingLead, customerMap]
  );

  const hasActiveFilters =
    searchRaw !== '' ||
    providerFilter !== 'all' ||
    agentFilter !== 'all' ||
    statusFilter !== 'all';

  const resetFilters = () => {
    setSearchRaw('');
    setSearchQuery('');
    setProviderFilter('all');
    setAgentFilter('all');
    setStatusFilter('all');
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search leads by customer name, phone number, or lead ID"
              value={searchRaw}
              onChange={(e) => setSearchRaw(e.target.value)}
              placeholder="Search name, phone, or Lead ID..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingLead(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md whitespace-nowrap shrink-0 transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>New Lead</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <select
            aria-label="Filter by provider"
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-md"
          >
            <option value="all">All Providers</option>
            {state.providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by agent"
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-md"
          >
            <option value="all">All Agents</option>
            {state.agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName} {!a.isActive ? '(Inactive)' : ''}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-md"
          >
            <option value="all">All Statuses</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort leads"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-md"
          >
            <option value="newest">Sort: Newest first</option>
            <option value="oldest">Sort: Oldest first</option>
            <option value="name_asc">Sort: Customer A–Z</option>
            <option value="name_desc">Sort: Customer Z–A</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Showing <strong className="font-mono tabular-nums text-slate-700">{filteredLeads.length}</strong> of{' '}
            <strong className="font-mono tabular-nums text-slate-700">{state.leads.length}</strong> leads
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-blue-700 hover:underline font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {filteredLeads.length === 0 ? (
        <EmptyState
          title="No matching leads found"
          description={
            hasActiveFilters
              ? 'Adjust your search query or filters to view leads.'
              : 'Create your first customer lead to start tracking your fibre sales pipeline.'
          }
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Reset Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingLead(null);
                  setFormOpen(true);
                }}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md"
              >
                Create First Lead
              </button>
            )
          }
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 whitespace-nowrap">Lead ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Provider &amp; Package</th>
                  <th className="py-3 px-4">Assigned Agent</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 whitespace-nowrap">QA</th>
                  <th className="py-3 px-4 whitespace-nowrap">Created</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredLeads.map((lead) => {
                  const customer = customerMap.get(lead.customerId);
                  const provider = providerMap.get(lead.providerId);
                  const product = productMap.get(lead.productId);
                  const qaOutcome = getEffectiveQAOutcome(lead, latestQAMap.get(lead.id));
                  const hasComm = commissionLeadIds.has(lead.id);

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono text-xs font-medium text-slate-700 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setDetailLeadId(lead.id)}
                          className="hover:text-blue-700 hover:underline text-left"
                        >
                          {lead.id}
                        </button>
                      </td>

                      <td className="py-2.5 px-4 min-w-[180px]">
                        <button
                          type="button"
                          onClick={() => setDetailLeadId(lead.id)}
                          className="font-medium text-slate-900 hover:text-blue-700 text-left block"
                        >
                          {customer?.fullName || 'Unknown'}
                        </button>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span className="font-mono tabular-nums">{customer?.phone}</span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate max-w-[140px]">{customer?.suburb}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-4 min-w-[180px]">
                        <p className="text-xs font-medium text-slate-900">
                          {provider?.name || '—'}
                        </p>
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">
                          {product?.name || '—'}
                        </p>
                      </td>

                      <td className="py-2.5 px-4">
                        <select
                          aria-label={`Assign agent for ${lead.id}`}
                          value={lead.agentId}
                          onChange={(e) => assignLeadAgent(lead.id, e.target.value)}
                          className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 hover:border-slate-300"
                        >
                          {state.agents
                            .filter((a) => a.isActive || a.id === lead.agentId)
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.fullName} {!a.isActive ? '(Inactive)' : ''}
                              </option>
                            ))}
                        </select>
                      </td>

                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <LeadStatusBadge status={lead.status} />
                      </td>

                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <QAOutcomeBadge outcome={qaOutcome} />
                      </td>

                      <td className="py-2.5 px-4 text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
                        {formatShortDate(lead.createdAt)}
                      </td>

                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailLeadId(lead.id)}
                            aria-label={`View details for ${lead.id}`}
                            className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLead(lead);
                              setFormOpen(true);
                            }}
                            aria-label={`Edit ${lead.id}`}
                            className="p-1.5 rounded text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={hasComm}
                            title={
                              hasComm
                                ? 'Cannot delete lead with locked commission record'
                                : `Delete ${lead.id}`
                            }
                            onClick={() => setDeleteTarget(lead)}
                            aria-label={`Delete ${lead.id}`}
                            className={`p-1.5 rounded ${
                              hasComm
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-500 hover:text-rose-700 hover:bg-rose-50'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <LeadFormModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingLead(null);
        }}
        editingLead={editingLead}
        editingCustomer={editingCustomer}
      />

      <LeadDetailModal
        lead={detailLead}
        onClose={() => setDetailLeadId(null)}
        onEdit={(lead) => {
          setEditingLead(lead);
          setFormOpen(true);
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteLead(deleteTarget.id);
        }}
        title={`Delete lead ${deleteTarget?.id ?? ''}?`}
        message="Are you sure you want to permanently remove this lead and its activity log? This cannot be undone."
        confirmLabel="Delete Lead"
        variant="danger"
      />
    </div>
  );
};
