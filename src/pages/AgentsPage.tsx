import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Edit3,
  Eye,
  Plus,
  Search,
  UserCheck,
  UserX
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { Agent } from '../types/crm';
import {
  computeAgentPerformance,
  formatCurrency,
  formatPercent,
  formatShortDate
} from '../utils/calculations';
import { isValidEmail, isValidSAPhone } from '../utils/validators';
import { Badge, CommissionStatusBadge, LeadStatusBadge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';

type RankMetric = 'approved' | 'commission' | 'conversion';

export const AgentsPage: React.FC = () => {
  const { state, createAgent, updateAgent, toggleAgentActive } = useCRM();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [rankBy, setRankBy] = useState<RankMetric>('approved');
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [startDate, setStartDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [profileAgentId, setProfileAgentId] = useState<string | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Agent | null>(null);

  const performanceRows = useMemo(() => computeAgentPerformance(state), [state]);

  const rankedRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return performanceRows
      .filter((row) => {
        if (statusFilter === 'active' && !row.agent.isActive) return false;
        if (statusFilter === 'inactive' && row.agent.isActive) return false;
        if (
          query &&
          !row.agent.fullName.toLowerCase().includes(query) &&
          !row.agent.id.toLowerCase().includes(query) &&
          !row.agent.email.toLowerCase().includes(query)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (rankBy === 'commission') {
          return b.commissionEarned - a.commissionEarned || b.approvedSales - a.approvedSales;
        }
        if (rankBy === 'conversion') {
          return (b.conversionRate ?? -1) - (a.conversionRate ?? -1);
        }
        return b.approvedSales - a.approvedSales || b.commissionEarned - a.commissionEarned;
      });
  }, [performanceRows, search, statusFilter, rankBy]);

  const comparisonRows = useMemo(
    () => performanceRows.filter((row) => compareIds.includes(row.agent.id)),
    [performanceRows, compareIds]
  );

  const profileRow = useMemo(
    () => performanceRows.find((r) => r.agent.id === profileAgentId) ?? null,
    [performanceRows, profileAgentId]
  );

  const customerMap = useMemo(
    () => new Map(state.customers.map((c) => [c.id, c])),
    [state.customers]
  );

  const openCreateModal = () => {
    setEditingAgent(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setStartDate(new Date().toISOString().slice(0, 10));
    setIsActive(true);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEditModal = (agent: Agent) => {
    setEditingAgent(agent);
    setFullName(agent.fullName);
    setEmail(agent.email);
    setPhone(agent.phone);
    setStartDate(agent.startDate);
    setIsActive(agent.isActive);
    setFormErrors({});
    setFormOpen(true);
  };

  const handleSaveAgent = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required.';
    if (!email.trim() || !isValidEmail(email)) {
      errs.email = 'Enter a valid email address.';
    }
    if (!phone.trim() || !isValidSAPhone(phone)) {
      errs.phone = 'Enter a valid 10-digit South African phone number.';
    }
    if (!startDate) errs.startDate = 'Start date is required.';

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    if (editingAgent) {
      updateAgent({
        ...editingAgent,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        startDate,
        isActive
      });
    } else {
      createAgent({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        startDate,
        isActive
      });
    }
    setFormOpen(false);
  };

  const toggleCompare = (agentId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(agentId)) return prev.filter((id) => id !== agentId);
      if (prev.length >= 3) return [...prev.slice(1), agentId];
      return [...prev, agentId];
    });
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search sales agents"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agent name or ID..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600"
            />
          </div>

          <select
            aria-label="Filter agents by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-md"
          >
            <option value="all">All Agents ({state.agents.length})</option>
            <option value="active">
              Active ({state.agents.filter((a) => a.isActive).length})
            </option>
            <option value="inactive">
              Inactive ({state.agents.filter((a) => !a.isActive).length})
            </option>
          </select>

          <div className="inline-flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <select
              aria-label="Rank agents by metric"
              value={rankBy}
              onChange={(e) => setRankBy(e.target.value as RankMetric)}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-md"
            >
              <option value="approved">Rank by Approved Sales</option>
              <option value="commission">Rank by Commission Earned</option>
              <option value="conversion">Rank by Conversion Rate</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Add Agent</span>
        </button>
      </div>

      {/* Side-by-Side Comparison Panel (when 2+ agents selected) */}
      {comparisonRows.length >= 2 && (
        <section
          aria-label="Agent comparison"
          className="bg-white border border-slate-200 rounded-lg p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Agent Performance Comparison
              </h2>
              <p className="text-xs text-slate-500">
                Comparing {comparisonRows.length} selected agents side-by-side
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCompareIds([])}
              className="text-xs font-medium text-blue-700 hover:underline"
            >
              Clear comparison
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-4 font-medium">Metric</th>
                  {comparisonRows.map((r) => (
                    <th key={r.agent.id} className="py-2 px-3 font-semibold text-slate-900">
                      {r.agent.fullName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2 pr-4 text-slate-500">Assigned Leads</td>
                  {comparisonRows.map((r) => (
                    <td key={r.agent.id} className="py-2 px-3 font-mono tabular-nums">
                      {r.leadsAssigned}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-slate-500">Applications Submitted</td>
                  {comparisonRows.map((r) => (
                    <td key={r.agent.id} className="py-2 px-3 font-mono tabular-nums">
                      {r.applicationsSubmitted}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-slate-500">Approved Sales</td>
                  {comparisonRows.map((r) => (
                    <td key={r.agent.id} className="py-2 px-3 font-mono tabular-nums font-semibold">
                      {r.approvedSales}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-slate-500">Conversion Rate</td>
                  {comparisonRows.map((r) => (
                    <td key={r.agent.id} className="py-2 px-3 font-mono tabular-nums">
                      {formatPercent(r.conversionRate)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-slate-500">QA Pass Rate</td>
                  {comparisonRows.map((r) => (
                    <td key={r.agent.id} className="py-2 px-3 font-mono tabular-nums">
                      {formatPercent(r.qaPassRate)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-slate-500">Commission Earned</td>
                  {comparisonRows.map((r) => (
                    <td key={r.agent.id} className="py-2 px-3 font-mono tabular-nums font-semibold text-slate-900">
                      {formatCurrency(r.commissionEarned)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Agent Table */}
      {rankedRows.length === 0 ? (
        <EmptyState
          title="No agents match your filter"
          description="Try clearing your search or status filter, or add a new sales agent."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500">
            <span>Select up to 3 agents using Compare checkboxes to evaluate side-by-side.</span>
            <span className="font-mono tabular-nums">{rankedRows.length} agents</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 w-10">Cmp</th>
                  <th className="py-3 px-3 w-12">Rank</th>
                  <th className="py-3 px-4">Agent</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-3 text-right">Leads</th>
                  <th className="py-3 px-3 text-right">Submitted</th>
                  <th className="py-3 px-3 text-right">Approved</th>
                  <th className="py-3 px-3 text-right">Rejected</th>
                  <th className="py-3 px-3 text-right">Conv. Rate</th>
                  <th className="py-3 px-4 text-right">Commission</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {rankedRows.map((row, index) => {
                  const { agent } = row;
                  const isCompared = compareIds.includes(agent.id);

                  return (
                    <tr key={agent.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4">
                        <input
                          type="checkbox"
                          aria-label={`Compare ${agent.fullName}`}
                          checked={isCompared}
                          onChange={() => toggleCompare(agent.id)}
                          className="rounded border-slate-300 text-blue-700"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-xs text-slate-500">
                        #{index + 1}
                      </td>
                      <td className="py-2.5 px-4 min-w-[200px]">
                        <button
                          type="button"
                          onClick={() => setProfileAgentId(agent.id)}
                          className="font-medium text-slate-900 hover:text-blue-700 text-left block"
                        >
                          {agent.fullName}
                        </button>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">{agent.id}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{agent.phone}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <Badge tone={agent.isActive ? 'emerald' : 'slate'}>
                          {agent.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-xs text-slate-700">
                        {row.leadsAssigned}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-xs text-slate-700">
                        {row.applicationsSubmitted}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-xs font-semibold text-emerald-700">
                        {row.approvedSales}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-xs text-rose-700">
                        {row.rejectedApplications}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-xs text-slate-700">
                        {formatPercent(row.conversionRate)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs font-semibold text-slate-900 whitespace-nowrap">
                        {formatCurrency(row.commissionEarned)}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setProfileAgentId(agent.id)}
                            aria-label={`View profile for ${agent.fullName}`}
                            className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(agent)}
                            aria-label={`Edit ${agent.fullName}`}
                            className="p-1.5 rounded text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setToggleTarget(agent)}
                            aria-label={
                              agent.isActive
                                ? `Deactivate ${agent.fullName}`
                                : `Activate ${agent.fullName}`
                            }
                            title={
                              agent.isActive
                                ? 'Deactivate agent (preserves historical sales)'
                                : 'Activate agent'
                            }
                            className={`p-1.5 rounded ${
                              agent.isActive
                                ? 'text-slate-500 hover:text-amber-700 hover:bg-amber-50'
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {agent.isActive ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
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

      {/* Add/Edit Agent Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingAgent ? `Edit Agent ${editingAgent.id}` : 'Add Sales Agent'}
        subtitle="Agents with sales or commission history can be deactivated rather than deleted."
        size="md"
      >
        <form onSubmit={handleSaveAgent} className="space-y-4" noValidate>
          <div>
            <label htmlFor="agent-name" className="block text-xs font-medium text-slate-700 mb-1">
              Full name *
            </label>
            <input
              id="agent-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Thabo Mokoena"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white"
            />
            {formErrors.fullName && (
              <p className="text-xs text-rose-700 mt-1">{formErrors.fullName}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="agent-email" className="block text-xs font-medium text-slate-700 mb-1">
                Email address *
              </label>
              <input
                id="agent-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@fibresales.demo"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white"
              />
              {formErrors.email && (
                <p className="text-xs text-rose-700 mt-1">{formErrors.email}</p>
              )}
            </div>
            <div>
              <label htmlFor="agent-phone" className="block text-xs font-medium text-slate-700 mb-1">
                Contact number *
              </label>
              <input
                id="agent-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="082 555 0109"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white"
              />
              {formErrors.phone && (
                <p className="text-xs text-rose-700 mt-1">{formErrors.phone}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label htmlFor="agent-start" className="block text-xs font-medium text-slate-700 mb-1">
                Start date *
              </label>
              <input
                id="agent-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white"
              />
              {formErrors.startDate && (
                <p className="text-xs text-rose-700 mt-1">{formErrors.startDate}</p>
              )}
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 pt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-slate-300 text-blue-700"
              />
              <span>Active for new lead assignment</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md"
            >
              {editingAgent ? 'Save Changes' : 'Create Agent'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Individual Agent Profile Modal */}
      <Modal
        isOpen={Boolean(profileRow)}
        onClose={() => setProfileAgentId(null)}
        title={profileRow?.agent.fullName ?? 'Agent Profile'}
        subtitle={
          profileRow
            ? `${profileRow.agent.id} · Started ${formatShortDate(profileRow.agent.startDate)}`
            : undefined
        }
        size="lg"
      >
        {profileRow && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 text-xs">
              <div className="flex flex-wrap items-center gap-2 text-slate-600">
                <Badge tone={profileRow.agent.isActive ? 'emerald' : 'slate'}>
                  {profileRow.agent.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <span>{profileRow.agent.email}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{profileRow.agent.phone}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProfileAgentId(null);
                  openEditModal(profileRow.agent);
                }}
                className="px-3 py-1.5 font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
              >
                Edit Profile
              </button>
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <dt className="text-xs text-slate-500">Assigned Leads</dt>
                <dd className="text-lg font-semibold font-mono tabular-nums mt-0.5">
                  {profileRow.leadsAssigned}
                </dd>
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <dt className="text-xs text-slate-500">Approved Sales</dt>
                <dd className="text-lg font-semibold font-mono tabular-nums text-emerald-700 mt-0.5">
                  {profileRow.approvedSales}
                </dd>
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <dt className="text-xs text-slate-500">QA Pass Rate</dt>
                <dd className="text-lg font-semibold font-mono tabular-nums mt-0.5">
                  {formatPercent(profileRow.qaPassRate)}
                </dd>
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <dt className="text-xs text-slate-500">Commission Earned</dt>
                <dd className="text-lg font-semibold font-mono tabular-nums mt-0.5">
                  {formatCurrency(profileRow.commissionEarned)}
                </dd>
              </div>
            </dl>

            <div>
              <h3 className="text-xs font-semibold text-slate-500 mb-2">
                Recent Assigned Leads
              </h3>
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="py-2 px-3">Lead</th>
                      <th className="py-2 px-3">Customer</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-right">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.leads
                      .filter((l) => l.agentId === profileRow.agent.id)
                      .slice(0, 6)
                      .map((l) => (
                        <tr key={l.id}>
                          <td className="py-2 px-3 font-mono">{l.id}</td>
                          <td className="py-2 px-3">
                            {customerMap.get(l.customerId)?.fullName || 'Unknown'}
                          </td>
                          <td className="py-2 px-3">
                            <LeadStatusBadge status={l.status} />
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-500">
                            {formatShortDate(l.createdAt)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-500 mb-2">
                Commission History
              </h3>
              {state.commissions.filter((c) => c.agentId === profileRow.agent.id).length ===
              0 ? (
                <p className="text-xs text-slate-500">No commissions recorded for this agent yet.</p>
              ) : (
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <th className="py-2 px-3">Commission ID</th>
                        <th className="py-2 px-3">Lead</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                        <th className="py-2 px-3 text-right">Payment Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {state.commissions
                        .filter((c) => c.agentId === profileRow.agent.id)
                        .map((c) => (
                          <tr key={c.id}>
                            <td className="py-2 px-3 font-mono">{c.id}</td>
                            <td className="py-2 px-3 font-mono">{c.leadId}</td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums font-medium">
                              {formatCurrency(c.amount)}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <CommissionStatusBadge status={c.paymentStatus} />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        onConfirm={() => {
          if (toggleTarget) toggleAgentActive(toggleTarget.id);
        }}
        title={
          toggleTarget?.isActive
            ? `Deactivate ${toggleTarget.fullName}?`
            : `Activate ${toggleTarget?.fullName ?? ''}?`
        }
        message={
          toggleTarget?.isActive
            ? 'Deactivated agents cannot be assigned to new leads, but all historical sales, QA reviews, and commissions remain intact.'
            : 'This agent will be available for new lead assignments again.'
        }
        confirmLabel={toggleTarget?.isActive ? 'Deactivate Agent' : 'Activate Agent'}
        variant={toggleTarget?.isActive ? 'danger' : 'primary'}
      />
    </div>
  );
};
