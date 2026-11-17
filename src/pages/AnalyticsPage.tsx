import React, { useMemo } from 'react';
import { Download } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useCRM } from '../context/CRMContext';
import {
  buildSalesByProviderSeries,
  computeAgentPerformance,
  formatCurrency,
  formatPercent,
  getDateRangeBounds,
  isWithinDateBounds,
  safePercent
} from '../utils/calculations';
import { downloadCSV } from '../utils/export';
import { DateRangeFilter } from '../components/ui/DateRangeFilter';

export const AnalyticsPage: React.FC = () => {
  const { state, dateFilter, setDateFilter, addToast } = useCRM();

  const businessMetrics = useMemo(() => {
    const bounds = getDateRangeBounds(dateFilter);
    const leads = state.leads.filter((l) => isWithinDateBounds(l.createdAt, bounds));
    const qaReviews = state.qaReviews.filter((q) =>
      isWithinDateBounds(q.reviewedAt, bounds)
    );
    const commissions = state.commissions.filter((c) =>
      isWithinDateBounds(c.eligibleAt, bounds)
    );

    const totalLeads = leads.length;
    const submittedCount = leads.filter((l) =>
      ['Submitted', 'Approved', 'Rejected'].includes(l.status)
    ).length;
    const approvedCount = leads.filter((l) => l.status === 'Approved').length;
    const passedQA = qaReviews.filter((q) => q.outcome === 'Passed').length;
    const totalCommission = commissions.reduce((sum, c) => sum + c.amount, 0);

    return {
      totalLeads,
      submittedCount,
      approvedCount,
      leadToAppRate: safePercent(submittedCount, totalLeads),
      approvalRate: safePercent(approvedCount, submittedCount),
      leadConversionRate: safePercent(approvedCount, totalLeads),
      qaPassRate: safePercent(passedQA, qaReviews.length),
      qaTotal: qaReviews.length,
      totalCommission,
      eligibleSalesCount: commissions.length,
      avgCommission:
        commissions.length > 0 ? totalCommission / commissions.length : null
    };
  }, [state, dateFilter]);

  const agentRows = useMemo(
    () =>
      computeAgentPerformance(state, dateFilter).sort(
        (a, b) =>
          b.approvedSales - a.approvedSales ||
          b.commissionEarned - a.commissionEarned
      ),
    [state, dateFilter]
  );

  const providerRows = useMemo(
    () => buildSalesByProviderSeries(state, dateFilter),
    [state, dateFilter]
  );

  const handleExportAgentCSV = () => {
    const headers = [
      'Agent ID',
      'Agent Name',
      'Status',
      'Leads Assigned',
      'Leads Contacted',
      'Applications Submitted',
      'Approved Sales',
      'Rejected Applications',
      'Conversion Rate (%)',
      'QA Pass Rate (%)',
      'Commission Earned (ZAR)'
    ];
    const rows = agentRows.map((r) => [
      r.agent.id,
      r.agent.fullName,
      r.agent.isActive ? 'Active' : 'Inactive',
      r.leadsAssigned,
      r.leadsContacted,
      r.applicationsSubmitted,
      r.approvedSales,
      r.rejectedApplications,
      r.conversionRate ?? '',
      r.qaPassRate ?? '',
      r.commissionEarned
    ]);
    downloadCSV(
      `fibresales-agent-performance-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
    addToast({ type: 'success', title: 'Agent performance CSV exported' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Operational &amp; Conversion Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Consistent funnel ratios, QA rates, and average earnings calculated across the active period.
          </p>
        </div>
        <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
      </div>

      {/* Business Performance KPI Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-500">Total Leads Generated</p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-slate-900 mt-1.5">
            {businessMetrics.totalLeads}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-500">Lead-to-Application Rate</p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-slate-900 mt-1.5">
            {formatPercent(businessMetrics.leadToAppRate)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {businessMetrics.totalLeads === 0
              ? 'Insufficient lead volume'
              : `${businessMetrics.submittedCount} of ${businessMetrics.totalLeads} leads`}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-500">Application Approval Rate</p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-emerald-700 mt-1.5">
            {formatPercent(businessMetrics.approvalRate)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {businessMetrics.submittedCount === 0
              ? 'Insufficient submissions'
              : `${businessMetrics.approvedCount} of ${businessMetrics.submittedCount} submitted`}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-500">Lead Conversion Rate</p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-slate-900 mt-1.5">
            {formatPercent(businessMetrics.leadConversionRate)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Approved / Total leads</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-500">QA Pass Rate</p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-slate-900 mt-1.5">
            {formatPercent(businessMetrics.qaPassRate)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {businessMetrics.qaTotal === 0
              ? 'No completed reviews'
              : `${businessMetrics.qaTotal} completed reviews`}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-500">Total Commissions</p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-slate-900 mt-1.5">
            {formatCurrency(businessMetrics.totalCommission)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-500">Eligible Sales</p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-slate-900 mt-1.5">
            {businessMetrics.eligibleSalesCount}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-medium text-slate-500">Avg. Commission / Sale</p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-slate-900 mt-1.5">
            {businessMetrics.avgCommission !== null
              ? formatCurrency(businessMetrics.avgCommission)
              : '—'}
          </p>
        </div>
      </section>

      {/* Sales & Commission by Provider */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Commission Earned by Provider
          </h3>
          {businessMetrics.totalCommission === 0 ? (
            <div className="h-52 flex items-center justify-center text-xs text-slate-500">
              No eligible commission earnings in this period.
            </div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={providerRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="providerName" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value ?? 0))}
                    contentStyle={{
                      fontSize: '12px',
                      borderRadius: '6px',
                      borderColor: '#e2e8f0'
                    }}
                  />
                  <Bar
                    dataKey="commissionAmount"
                    name="Commission Earned (R)"
                    fill="#1d4ed8"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Provider Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 font-medium">Provider</th>
                  <th className="py-2 font-medium text-right">Leads</th>
                  <th className="py-2 font-medium text-right">Approved</th>
                  <th className="py-2 font-medium text-right">Approval %</th>
                  <th className="py-2 font-medium text-right">Commissions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {providerRows.map((row) => (
                  <tr key={row.providerName}>
                    <td className="py-2.5 font-medium text-slate-900">{row.providerName}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-700">
                      {row.totalLeads}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-900 font-medium">
                      {row.approvedSales}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                      {formatPercent(safePercent(row.approvedSales, row.totalLeads))}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatCurrency(row.commissionAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Agent Performance Scorecard */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Agent Performance Breakdown
            </h3>
            <p className="text-xs text-slate-500">
              Filtered by the selected date range
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportAgentCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-3 px-4">Agent</th>
                <th className="py-3 px-3 text-right">Assigned</th>
                <th className="py-3 px-3 text-right">Contacted</th>
                <th className="py-3 px-3 text-right">Submitted</th>
                <th className="py-3 px-3 text-right">Approved</th>
                <th className="py-3 px-3 text-right">Rejected</th>
                <th className="py-3 px-3 text-right">Conv. Rate</th>
                <th className="py-3 px-3 text-right">QA Pass Rate</th>
                <th className="py-3 px-4 text-right">Commission Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agentRows.map((row) => (
                <tr key={row.agent.id} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                    {row.agent.fullName}
                    {!row.agent.isActive && (
                      <span className="text-slate-400 font-normal"> (Inactive)</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {row.leadsAssigned}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {row.leadsContacted}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {row.applicationsSubmitted}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-emerald-700">
                    {row.approvedSales}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-rose-700">
                    {row.rejectedApplications}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {formatPercent(row.conversionRate)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {formatPercent(row.qaPassRate)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                    {formatCurrency(row.commissionEarned)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
