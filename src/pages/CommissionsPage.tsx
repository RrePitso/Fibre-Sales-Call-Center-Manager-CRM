import React, { useMemo, useState } from 'react';
import { Check, Download, Info, Search } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { Commission, CommissionPaymentStatus } from '../types/crm';
import { formatCurrency, formatShortDate } from '../utils/calculations';
import { downloadCSV } from '../utils/export';
import { CommissionStatusBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';

export const CommissionsPage: React.FC = () => {
  const { state, updateCommissionStatus, addToast } = useCRM();

  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | CommissionPaymentStatus>('all');

  const [payingTarget, setPayingTarget] = useState<Commission | null>(null);
  const [paymentDate, setPaymentDate] = useState('');

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

  const filteredCommissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...state.commissions]
      .filter((comm) => {
        if (agentFilter !== 'all' && comm.agentId !== agentFilter) return false;
        if (providerFilter !== 'all' && comm.providerId !== providerFilter) return false;
        if (statusFilter !== 'all' && comm.paymentStatus !== statusFilter) return false;
        if (q) {
          const customerName = customerMap.get(comm.customerId)?.fullName.toLowerCase() ?? '';
          if (
            !comm.id.toLowerCase().includes(q) &&
            !comm.leadId.toLowerCase().includes(q) &&
            !customerName.includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.eligibleAt).getTime() - new Date(a.eligibleAt).getTime()
      );
  }, [
    state.commissions,
    agentFilter,
    providerFilter,
    statusFilter,
    search,
    customerMap
  ]);

  const totals = useMemo(() => {
    const totalEarned = filteredCommissions.reduce((sum, c) => sum + c.amount, 0);
    const paid = filteredCommissions
      .filter((c) => c.paymentStatus === 'Paid')
      .reduce((sum, c) => sum + c.amount, 0);
    const approvedForPayment = filteredCommissions
      .filter((c) => c.paymentStatus === 'Approved for Payment')
      .reduce((sum, c) => sum + c.amount, 0);
    const pendingVerification = filteredCommissions
      .filter((c) => c.paymentStatus === 'Pending Verification')
      .reduce((sum, c) => sum + c.amount, 0);

    return {
      totalEarned,
      paid,
      outstanding: totalEarned - paid,
      approvedForPayment,
      pendingVerification
    };
  }, [filteredCommissions]);

  const handleExportCSV = () => {
    const headers = [
      'Commission ID',
      'Application ID',
      'Customer',
      'Sales Agent',
      'Provider',
      'Package',
      'Amount (ZAR)',
      'Eligibility Date',
      'Payment Status',
      'Payment Date'
    ];
    const rows = filteredCommissions.map((c) => [
      c.id,
      c.leadId,
      customerMap.get(c.customerId)?.fullName ?? '',
      agentMap.get(c.agentId)?.fullName ?? '',
      providerMap.get(c.providerId)?.name ?? '',
      productMap.get(c.productId)?.name ?? '',
      c.amount,
      c.eligibleAt.slice(0, 10),
      c.paymentStatus,
      c.paymentDate ?? ''
    ]);
    downloadCSV(
      `fibresales-commissions-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
    addToast({ type: 'success', title: 'Commission CSV exported' });
  };

  const openMarkPaidModal = (comm: Commission) => {
    setPayingTarget(comm);
    setPaymentDate(new Date().toISOString().slice(0, 10));
  };

  const handleConfirmPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingTarget) return;
    updateCommissionStatus(payingTarget.id, 'Paid', paymentDate);
    setPayingTarget(null);
  };

  return (
    <div className="space-y-5">
      {/* Rule Notice */}
      <div className="bg-sky-50 border border-sky-200 rounded-lg p-3.5 flex items-start gap-2.5 text-xs text-sky-900">
        <Info className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          <strong>Commission Eligibility Rules:</strong> Records are automatically generated only when an application is <strong>Approved</strong> and has <strong>Passed QA</strong>. Amounts are locked at eligibility time; paying a commission never modifies sales or QA statuses.
        </p>
      </div>

      {/* KPI Totals */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-500">Total Earned (Filtered)</p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-slate-900 mt-1.5">
            {formatCurrency(totals.totalEarned)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-500">Outstanding Balance</p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-amber-700 mt-1.5">
            {formatCurrency(totals.outstanding)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-500">Paid Out</p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-emerald-700 mt-1.5">
            {formatCurrency(totals.paid)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-500">Eligible Sales Count</p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-slate-900 mt-1.5">
            {filteredCommissions.length}
          </p>
        </div>
      </section>

      {/* Filters & Export */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search commissions"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Commission ID, Lead, customer..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white"
            />
          </div>

          <select
            aria-label="Filter commissions by agent"
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-md"
          >
            <option value="all">All Agents</option>
            {state.agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter commissions by provider"
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
            aria-label="Filter commissions by payment status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'all' | CommissionPaymentStatus)
            }
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-md"
          >
            <option value="all">All Payment Statuses</option>
            <option value="Pending Verification">Pending Verification</option>
            <option value="Approved for Payment">Approved for Payment</option>
            <option value="Paid">Paid</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={filteredCommissions.length === 0}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Commissions Table */}
      {filteredCommissions.length === 0 ? (
        <EmptyState
          title="No commission records match"
          description="Only Approved applications with a Passed QA review generate commissions."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Commission ID</th>
                  <th className="py-3 px-4">Application</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Sales Agent</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Eligible Date</th>
                  <th className="py-3 px-4">Payment Status</th>
                  <th className="py-3 px-4">Paid Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCommissions.map((comm) => {
                  const customer = customerMap.get(comm.customerId);
                  const agent = agentMap.get(comm.agentId);
                  const provider = providerMap.get(comm.providerId);

                  return (
                    <tr key={comm.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                        {comm.id}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                        {comm.leadId}
                      </td>
                      <td className="py-2.5 px-4 text-slate-800 whitespace-nowrap">
                        {customer?.fullName || 'Unknown'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                        {agent?.fullName || 'Unknown'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                        {provider?.name || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                        {formatCurrency(comm.amount)}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        {formatShortDate(comm.eligibleAt)}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <CommissionStatusBadge status={comm.paymentStatus} />
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        {comm.paymentDate ? formatShortDate(comm.paymentDate) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        {comm.paymentStatus === 'Pending Verification' && (
                          <button
                            type="button"
                            onClick={() =>
                              updateCommissionStatus(comm.id, 'Approved for Payment')
                            }
                            className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                          >
                            Approve Payout
                          </button>
                        )}
                        {comm.paymentStatus === 'Approved for Payment' && (
                          <button
                            type="button"
                            onClick={() => openMarkPaidModal(comm)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded"
                          >
                            <Check className="w-3 h-3" aria-hidden="true" />
                            <span>Mark Paid</span>
                          </button>
                        )}
                        {comm.paymentStatus === 'Paid' && (
                          <span className="text-slate-400">Settled</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mark Paid Modal */}
      <Modal
        isOpen={Boolean(payingTarget)}
        onClose={() => setPayingTarget(null)}
        title={`Record Commission Payment — ${payingTarget?.id ?? ''}`}
        subtitle={
          payingTarget
            ? `${agentMap.get(payingTarget.agentId)?.fullName} · ${formatCurrency(
                payingTarget.amount
              )}`
            : undefined
        }
        size="sm"
      >
        <form onSubmit={handleConfirmPay} className="space-y-4">
          <div>
            <label htmlFor="pay-date" className="block text-xs font-medium text-slate-700 mb-1">
              Payment date *
            </label>
            <input
              id="pay-date"
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setPayingTarget(null)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md"
            >
              Confirm Payment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
