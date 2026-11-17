import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Info,
  RotateCcw,
  Trash2,
  Upload
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { CRMState } from '../types/crm';
import {
  computeAgentPerformance,
  formatDateTime,
  getEffectiveQAOutcome,
  getLatestQAByLeadId
} from '../utils/calculations';
import { downloadCSV, downloadJSON } from '../utils/export';
import { validateCRMBackup } from '../utils/validators';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const SettingsPage: React.FC = () => {
  const { state, importCRMState, resetDemoData, clearAllRecords, addToast } = useCRM();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importError, setImportError] = useState('');
  const [pendingImport, setPendingImport] = useState<{
    fileName: string;
    data: CRMState;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

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

  const handleExportJSON = () => {
    downloadJSON(
      `fibresales-crm-backup-${new Date().toISOString().slice(0, 10)}.json`,
      state
    );
    addToast({ type: 'success', title: 'JSON backup exported' });
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setImportError('');
    if (!file) return;

    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const validation = validateCRMBackup(parsed);
      if (!validation.valid || !validation.data) {
        setImportError(validation.error || 'Backup validation failed.');
        return;
      }
      setPendingImport({ fileName: file.name, data: validation.data });
    } catch {
      setImportError('Unable to parse JSON file. Ensure the file is a valid FibreSales CRM backup.');
    }
  };

  const handleExportLeadsCSV = () => {
    const headers = [
      'Lead ID',
      'Customer Name',
      'Phone',
      'Email',
      'Address',
      'Suburb',
      'Provider',
      'Package',
      'Assigned Agent',
      'Pipeline Status',
      'QA Status',
      'Follow-up Date',
      'Rejection Reason',
      'Created Date'
    ];
    const rows = state.leads.map((l) => {
      const c = customerMap.get(l.customerId);
      const p = providerMap.get(l.providerId);
      const prod = productMap.get(l.productId);
      const a = agentMap.get(l.agentId);
      const qa = getEffectiveQAOutcome(l, latestQAMap.get(l.id));
      return [
        l.id,
        c?.fullName ?? '',
        c?.phone ?? '',
        c?.email ?? '',
        c?.address ?? '',
        c?.suburb ?? '',
        p?.name ?? '',
        prod?.name ?? '',
        a?.fullName ?? '',
        l.status,
        qa,
        l.followUpDate ?? '',
        l.rejectionReason ?? '',
        l.createdAt.slice(0, 10)
      ];
    });
    downloadCSV(
      `fibresales-leads-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
    addToast({ type: 'success', title: 'Leads CSV exported' });
  };

  const handleExportAgentsCSV = () => {
    const agentPerf = computeAgentPerformance(state);
    const headers = [
      'Agent ID',
      'Full Name',
      'Email',
      'Phone',
      'Start Date',
      'Employment Status',
      'Leads Assigned',
      'Leads Contacted',
      'Applications Submitted',
      'Approved Sales',
      'Rejected Applications',
      'Conversion Rate (%)',
      'QA Pass Rate (%)',
      'Commission Earned (ZAR)'
    ];
    const rows = agentPerf.map((r) => [
      r.agent.id,
      r.agent.fullName,
      r.agent.isActive ? 'Active' : 'Inactive',
      r.agent.phone,
      r.agent.startDate,
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
      `fibresales-agents-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
    addToast({ type: 'success', title: 'Agent performance CSV exported' });
  };

  const handleExportCommissionsCSV = () => {
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
    const rows = state.commissions.map((c) => [
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
    addToast({ type: 'success', title: 'Commissions CSV exported' });
  };

  return (
    <div className="space-y-6">
      {/* Prototype Storage Notice */}
      <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 flex items-start gap-3 text-xs text-sky-900">
        <Info className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-semibold">Browser LocalStorage Demonstration Mode</p>
          <p>
            All CRM data persists automatically in this browser&apos;s LocalStorage (schema v{state.schemaVersion}). Export JSON backups regularly before clearing browser data or switching devices. Production multi-user deployments require a server-side database and authentication.
          </p>
        </div>
      </div>

      {/* Store Inventory */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Current Workspace Dataset
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Last saved: <span className="font-mono">{formatDateTime(state.lastUpdatedAt)}</span>
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Schema v{state.schemaVersion}
          </span>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
            <dt className="text-xs text-slate-500">Leads</dt>
            <dd className="text-xl font-semibold font-mono tabular-nums mt-0.5">
              {state.leads.length}
            </dd>
          </div>
          <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
            <dt className="text-xs text-slate-500">Sales Agents</dt>
            <dd className="text-xl font-semibold font-mono tabular-nums mt-0.5">
              {state.agents.length}
            </dd>
          </div>
          <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
            <dt className="text-xs text-slate-500">QA Reviews</dt>
            <dd className="text-xl font-semibold font-mono tabular-nums mt-0.5">
              {state.qaReviews.length}
            </dd>
          </div>
          <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
            <dt className="text-xs text-slate-500">Commissions</dt>
            <dd className="text-xl font-semibold font-mono tabular-nums mt-0.5">
              {state.commissions.length}
            </dd>
          </div>
        </dl>
      </section>

      {/* JSON Backup & Restore */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              JSON Backup &amp; Restore
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Export the full CRM database as a portable JSON file or restore from a validated backup.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportJSON}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Export JSON Backup</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelected}
              className="hidden"
              aria-label="Select JSON backup file"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Import JSON Backup</span>
            </button>
          </div>

          {importError && (
            <div
              role="alert"
              className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{importError}</span>
            </div>
          )}
        </div>

        {/* CSV Reports */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              CSV Operational Exports
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Download structured spreadsheet reports for leads, agent scorecards, and commissions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleExportLeadsCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              <span>Leads CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportAgentsCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              <span>Agent Performance CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportCommissionsCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              <span>Commissions CSV</span>
            </button>
          </div>
        </div>
      </section>

      {/* Reset & Empty State Controls */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Demonstration Data Controls
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Restore the reproducible fictional seed dataset or clear operational records to inspect empty states.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-rose-700 bg-white border border-rose-200 rounded-md hover:bg-rose-50"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Clear Operational Records</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </section>

      <ConfirmDialog
        isOpen={Boolean(pendingImport)}
        onClose={() => setPendingImport(null)}
        onConfirm={() => {
          if (pendingImport) importCRMState(pendingImport.data);
        }}
        title="Replace current CRM data with backup?"
        message={
          pendingImport
            ? `Validated "${pendingImport.fileName}" (${pendingImport.data.leads.length} leads, ${pendingImport.data.commissions.length} commissions). Existing browser records will be replaced.`
            : ''
        }
        confirmLabel="Import Backup"
        variant="primary"
      />

      <ConfirmDialog
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={resetDemoData}
        title="Reset demonstration dataset?"
        message="This will overwrite all current browser edits and restore the original seeded fictional dataset."
        confirmLabel="Reset Demo Data"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={clearAllRecords}
        title="Clear all leads, QA reviews, and commissions?"
        message="This removes all operational records so you can test empty states or enter fresh leads. Agents, providers, and packages are preserved. You can restore the seed dataset anytime."
        confirmLabel="Clear Records"
        variant="danger"
      />
    </div>
  );
};
