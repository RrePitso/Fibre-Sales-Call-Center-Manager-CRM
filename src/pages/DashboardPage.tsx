import React, { Suspense, lazy, useMemo } from 'react';
import { AlertCircle, Calendar } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import {
  buildCommissionOverTimeSeries,
  buildLeadsOverTimeSeries,
  buildSalesByProviderSeries,
  buildStatusDistributionSeries,
  computeAgentPerformance,
  computeDashboardKPIs,
  formatCurrency,
  formatDateTime,
  formatPercent,
  formatShortDate,
  getLatestQAByLeadId
} from '../utils/calculations';
import { LeadStatusBadge, QAOutcomeBadge } from '../components/ui/Badge';
import { DateRangeFilter } from '../components/ui/DateRangeFilter';

const DashboardCharts = lazy(() =>
  import('../components/dashboard/DashboardCharts').then((m) => ({
    default: m.DashboardCharts
  }))
);

export const DashboardPage: React.FC = () => {
  const { state, dateFilter, setDateFilter, setActiveSection } = useCRM();

  const kpis = useMemo(
    () => computeDashboardKPIs(state, dateFilter),
    [state, dateFilter]
  );

  const leadsSeries = useMemo(
    () => buildLeadsOverTimeSeries(state.leads, dateFilter),
    [state.leads, dateFilter]
  );

  const providerSeries = useMemo(
    () => buildSalesByProviderSeries(state, dateFilter),
    [state, dateFilter]
  );

  const agentPerf = useMemo(
    () =>
      computeAgentPerformance(state, dateFilter).sort(
        (a, b) =>
          b.approvedSales - a.approvedSales ||
          b.commissionEarned - a.commissionEarned
      ),
    [state, dateFilter]
  );

  const statusSeries = useMemo(
    () => buildStatusDistributionSeries(state.leads, dateFilter),
    [state.leads, dateFilter]
  );

  const commissionSeries = useMemo(
    () => buildCommissionOverTimeSeries(state.commissions, dateFilter),
    [state.commissions, dateFilter]
  );

  const customerMap = useMemo(
    () => new Map(state.customers.map((c) => [c.id, c])),
    [state.customers]
  );
  const agentMap = useMemo(
    () => new Map(state.agents.map((a) => [a.id, a])),
    [state.agents]
  );
  const latestQAMap = useMemo(
    () => getLatestQAByLeadId(state.qaReviews),
    [state.qaReviews]
  );

  const attentionLeads = useMemo(() => {
    return state.leads
      .filter((lead) => {
        if (lead.status !== 'Approved') return false;
        const qa = latestQAMap.get(lead.id);
        return !qa || qa.outcome === 'Needs Correction';
      })
      .slice(0, 5);
  }, [state.leads, latestQAMap]);

  const pendingFollowUps = useMemo(() => {
    return state.leads
      .filter(
        (l) =>
          Boolean(l.followUpDate) &&
          l.status !== 'Approved' &&
          l.status !== 'Rejected'
      )
      .sort((a, b) => (a.followUpDate || '').localeCompare(b.followUpDate || ''))
      .slice(0, 5);
  }, [state.leads]);

  const latestQAReviews = useMemo(
    () =>
      [...state.qaReviews]
        .sort(
          (a, b) =>
            new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime()
        )
        .slice(0, 5),
    [state.qaReviews]
  );

  const recentActivity = useMemo(
    () =>
      [...state.activityHistory]
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, 6),
    [state.activityHistory]
  );

  const kpiCards = [
    { label: 'Total leads', value: String(kpis.totalLeads) },
    { label: 'Applications submitted', value: String(kpis.applicationsSubmitted) },
    { label: 'Approved sales', value: String(kpis.approvedSales) },
    { label: 'Pending applications', value: String(kpis.pendingApplications) },
    { label: 'QA pass rate', value: formatPercent(kpis.qaPassRate) },
    {
      label: 'Total commission earned',
      value: formatCurrency(kpis.totalCommissionEarned)
    },
    {
      label: 'Commission awaiting payment',
      value: formatCurrency(kpis.commissionAwaitingPayment)
    },
    { label: 'Commission paid', value: formatCurrency(kpis.commissionPaid) }
  ];

  const hasLeadsInPeriod = kpis.totalLeads > 0;
  const hasCommissionsInPeriod = commissionSeries.length > 0;

  return (
    <div className="space-y-6">
      {/* Filter Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Business Performance Overview
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            All figures and charts reflect live LocalStorage CRM records for the selected period.
          </p>
        </div>
        <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
      </div>

      {/* 8 Dynamic KPI Cards */}
      <section
        aria-label="Key Performance Indicators"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="bg-white border border-slate-200 rounded-lg p-4"
          >
            <p className="text-xs font-medium text-slate-500">{card.label}</p>
            <p className="text-2xl font-semibold text-slate-900 font-mono tabular-nums mt-2">
              {card.value}
            </p>
          </div>
        ))}
      </section>

      {/* Lazy-loaded Recharts Visualisations */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" aria-busy="true">
            <div className="bg-white border border-slate-200 rounded-lg p-4 h-64 animate-pulse" />
            <div className="bg-white border border-slate-200 rounded-lg p-4 h-64 animate-pulse" />
          </div>
        }
      >
        <DashboardCharts
          hasLeadsInPeriod={hasLeadsInPeriod}
          hasCommissionsInPeriod={hasCommissionsInPeriod}
          leadsSeries={leadsSeries}
          providerSeries={providerSeries}
          agentPerf={agentPerf}
          statusSeries={statusSeries}
          commissionSeries={commissionSeries}
          onManageCommissions={() => setActiveSection('commissions')}
        />
      </Suspense>

      {/* Operational Lists */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top-performing agents */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Top-Performing Agents</h3>
            <button
              type="button"
              onClick={() => setActiveSection('agents')}
              className="text-xs font-medium text-blue-700 hover:underline"
            >
              View team
            </button>
          </div>
          {agentPerf.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No agent records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 font-medium">Agent</th>
                    <th className="py-2 font-medium text-right">Approved</th>
                    <th className="py-2 font-medium text-right">Conv.</th>
                    <th className="py-2 font-medium text-right">Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agentPerf.slice(0, 5).map((row) => (
                    <tr key={row.agent.id}>
                      <td className="py-2.5 font-medium text-slate-900">
                        {row.agent.fullName}
                        {!row.agent.isActive && (
                          <span className="text-slate-400 font-normal"> (Inactive)</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums text-slate-700">
                        {row.approvedSales}
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                        {formatPercent(row.conversionRate)}
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums font-medium text-slate-900">
                        {formatCurrency(row.commissionEarned)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Applications Requiring Attention */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Applications Requiring Attention
            </h3>
            <button
              type="button"
              onClick={() => setActiveSection('qa')}
              className="text-xs font-medium text-blue-700 hover:underline"
            >
              Open QA queue
            </button>
          </div>
          {attentionLeads.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              All approved applications have completed QA review.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {attentionLeads.map((lead) => {
                const customer = customerMap.get(lead.customerId);
                const qa = latestQAMap.get(lead.id);
                return (
                  <li
                    key={lead.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {customer?.fullName || 'Unknown'}
                      </p>
                      <p className="text-slate-500 font-mono">
                        {lead.id} · {agentMap.get(lead.agentId)?.fullName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                      <QAOutcomeBadge outcome={qa ? qa.outcome : 'Pending Review'} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Pending Follow-ups */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Pending Follow-ups</h3>
            <button
              type="button"
              onClick={() => setActiveSection('pipeline')}
              className="text-xs font-medium text-blue-700 hover:underline"
            >
              Open pipeline
            </button>
          </div>
          {pendingFollowUps.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              No active follow-up dates scheduled.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pendingFollowUps.map((lead) => {
                const customer = customerMap.get(lead.customerId);
                return (
                  <li
                    key={lead.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {customer?.fullName}
                      </p>
                      <p className="text-slate-500 truncate">
                        {lead.followUpNotes || lead.notes}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1 text-slate-600 font-mono tabular-nums">
                        <Calendar className="w-3 h-3 text-slate-400" aria-hidden="true" />
                        {formatShortDate(lead.followUpDate!)}
                      </span>
                      <LeadStatusBadge status={lead.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Latest QA Reviews & Recent Lead Activity */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900">Latest QA Reviews</h3>
              <button
                type="button"
                onClick={() => setActiveSection('qa')}
                className="text-xs font-medium text-blue-700 hover:underline"
              >
                All reviews
              </button>
            </div>
            <ul className="divide-y divide-slate-100">
              {latestQAReviews.map((qa) => (
                <li
                  key={qa.id}
                  className="py-2 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-mono font-medium text-slate-800">{qa.leadId}</span>
                    <span className="text-slate-400 mx-1.5">·</span>
                    <span className="text-slate-600 truncate">
                      {agentMap.get(qa.agentId)?.fullName}
                    </span>
                  </div>
                  <QAOutcomeBadge outcome={qa.outcome} />
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              Recent Lead Activity
            </h3>
            <ul className="divide-y divide-slate-100">
              {recentActivity.map((evt) => (
                <li
                  key={evt.id}
                  className="py-2 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-slate-500 mr-1.5">{evt.leadId}</span>
                    <span className="text-slate-800">{evt.description}</span>
                  </div>
                  <span className="text-slate-400 font-mono tabular-nums whitespace-nowrap shrink-0">
                    {formatDateTime(evt.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};
