import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { ArrowRight } from 'lucide-react';
import {
  AgentPerformanceRow,
  CommissionTimePoint,
  formatCurrency,
  ProviderSalesPoint,
  StatusDistributionPoint,
  TimeSeriesPoint
} from '../../utils/calculations';

interface DashboardChartsProps {
  hasLeadsInPeriod: boolean;
  hasCommissionsInPeriod: boolean;
  leadsSeries: TimeSeriesPoint[];
  providerSeries: ProviderSalesPoint[];
  agentPerf: AgentPerformanceRow[];
  statusSeries: StatusDistributionPoint[];
  commissionSeries: CommissionTimePoint[];
  onManageCommissions: () => void;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  hasLeadsInPeriod,
  hasCommissionsInPeriod,
  leadsSeries,
  providerSeries,
  agentPerf,
  statusSeries,
  commissionSeries,
  onManageCommissions
}) => {
  return (
    <>
      <section aria-label="Sales Visualisations" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Leads Generated Over Time */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Leads Generated Over Time
            </h3>
            <span className="text-xs text-slate-500">Total vs Approved</span>
          </div>
          {!hasLeadsInPeriod ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-500">
              No lead activity recorded in this date range.
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={leadsSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      fontSize: '12px',
                      borderRadius: '6px',
                      borderColor: '#e2e8f0'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    name="Leads"
                    stroke="#1d4ed8"
                    fill="#dbeafe"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="approved"
                    name="Approved"
                    stroke="#059669"
                    fill="#d1fae5"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* 2. Sales by Fibre Provider */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Sales by Fibre Provider
            </h3>
            <span className="text-xs text-slate-500">Leads vs Approved Sales</span>
          </div>
          {!hasLeadsInPeriod ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-500">
              No provider sales in this date range.
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={providerSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="providerName" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      fontSize: '12px',
                      borderRadius: '6px',
                      borderColor: '#e2e8f0'
                    }}
                  />
                  <Bar dataKey="totalLeads" name="Total Leads" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="approvedSales" name="Approved Sales" fill="#1d4ed8" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* 3. Sales Performance by Agent */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Sales Performance by Agent
            </h3>
            <span className="text-xs text-slate-500">Approved Sales</span>
          </div>
          {!hasLeadsInPeriod ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-500">
              No agent sales recorded in this date range.
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={agentPerf.map((row) => ({
                    name: row.agent.fullName.split(' ')[0],
                    approvedSales: row.approvedSales,
                    leadsAssigned: row.leadsAssigned
                  }))}
                  margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      fontSize: '12px',
                      borderRadius: '6px',
                      borderColor: '#e2e8f0'
                    }}
                  />
                  <Bar dataKey="leadsAssigned" name="Leads" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="approvedSales" name="Approved Sales" fill="#0f766e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* 4. Application Status Distribution */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Application Status Distribution
            </h3>
            <span className="text-xs text-slate-500">Pipeline Breakdown</span>
          </div>
          {!hasLeadsInPeriod ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-500">
              No pipeline records in this date range.
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="status"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={44}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      fontSize: '12px',
                      borderRadius: '6px',
                      borderColor: '#e2e8f0'
                    }}
                  />
                  <Bar dataKey="count" name="Applications" fill="#334155" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* 5. Commission Performance Over Time */}
      <section className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Commission Performance Over Time
            </h3>
            <p className="text-xs text-slate-500">
              Eligible commissions generated vs paid out (ZAR)
            </p>
          </div>
          <button
            type="button"
            onClick={onManageCommissions}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
          >
            <span>Manage commissions</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
        {!hasCommissionsInPeriod ? (
          <div className="h-52 flex items-center justify-center text-xs text-slate-500">
            No eligible commissions recorded in this date range.
          </div>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={commissionSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                  contentStyle={{
                    fontSize: '12px',
                    borderRadius: '6px',
                    borderColor: '#e2e8f0'
                  }}
                />
                <Bar dataKey="earned" name="Earned (R)" fill="#1d4ed8" radius={[3, 3, 0, 0]} />
                <Bar dataKey="paid" name="Paid (R)" fill="#059669" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </>
  );
};
