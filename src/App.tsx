import React, { Suspense, lazy } from 'react';
import { CRMProvider, useCRM } from './context/CRMContext';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';

const LeadsPage = lazy(() =>
  import('./pages/LeadsPage').then((m) => ({ default: m.LeadsPage }))
);
const PipelinePage = lazy(() =>
  import('./pages/PipelinePage').then((m) => ({ default: m.PipelinePage }))
);
const AgentsPage = lazy(() =>
  import('./pages/AgentsPage').then((m) => ({ default: m.AgentsPage }))
);
const ProductsPage = lazy(() =>
  import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage }))
);
const QAPage = lazy(() =>
  import('./pages/QAPage').then((m) => ({ default: m.QAPage }))
);
const CommissionsPage = lazy(() =>
  import('./pages/CommissionsPage').then((m) => ({ default: m.CommissionsPage }))
);
const AnalyticsPage = lazy(() =>
  import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);

const PageLoadingFallback: React.FC = () => (
  <div
    className="bg-white border border-slate-200 rounded-lg p-6 space-y-3"
    aria-busy="true"
    aria-label="Loading module"
  >
    <div className="h-5 w-48 bg-slate-100 rounded animate-pulse" />
    <div className="h-24 w-full bg-slate-100 rounded animate-pulse" />
  </div>
);

const ActiveModuleRouter: React.FC = () => {
  const { activeSection } = useCRM();

  if (activeSection === 'dashboard') {
    return <DashboardPage />;
  }

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      {activeSection === 'leads' && <LeadsPage />}
      {activeSection === 'pipeline' && <PipelinePage />}
      {activeSection === 'agents' && <AgentsPage />}
      {activeSection === 'products' && <ProductsPage />}
      {activeSection === 'qa' && <QAPage />}
      {activeSection === 'commissions' && <CommissionsPage />}
      {activeSection === 'analytics' && <AnalyticsPage />}
      {activeSection === 'settings' && <SettingsPage />}
    </Suspense>
  );
};

export default function App() {
  return (
    <CRMProvider>
      <AppLayout>
        <ActiveModuleRouter />
      </AppLayout>
    </CRMProvider>
  );
}
