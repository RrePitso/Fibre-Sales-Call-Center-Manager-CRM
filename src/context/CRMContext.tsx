import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import {
  ActivityEvent,
  Agent,
  CommissionPaymentStatus,
  CRMState,
  DateFilterState,
  Lead,
  LeadStatus,
  NavSection,
  Product,
  Provider,
  QAChecklistItem,
  QAOutcome,
  QAReview,
  ToastMessage
} from '../types/crm';
import { loadCRMState, resetCRMState, saveCRMState } from '../services/storage';
import {
  createEligibleCommissionIfNeeded,
  generateId,
  getLatestQAByLeadId
} from '../utils/calculations';
import { LeadFormInput } from '../utils/validators';

interface CRMContextValue {
  state: CRMState;
  activeSection: NavSection;
  setActiveSection: (section: NavSection) => void;
  dateFilter: DateFilterState;
  setDateFilter: (filter: DateFilterState) => void;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;

  createLead: (input: LeadFormInput & { notes?: string }) => Lead;
  updateLead: (
    leadId: string,
    input: LeadFormInput & {
      notes?: string;
      followUpDate?: string;
      followUpNotes?: string;
    }
  ) => void;
  deleteLead: (leadId: string) => void;
  updateLeadStatus: (
    leadId: string,
    newStatus: LeadStatus,
    options?: {
      rejectionReason?: string;
      followUpDate?: string;
      followUpNotes?: string;
    }
  ) => void;
  assignLeadAgent: (leadId: string, agentId: string) => void;

  createAgent: (input: Omit<Agent, 'id'>) => void;
  updateAgent: (agent: Agent) => void;
  toggleAgentActive: (agentId: string) => void;

  createProvider: (input: Omit<Provider, 'id'>) => void;
  updateProvider: (provider: Provider) => void;
  createProduct: (input: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;

  submitQAReview: (input: {
    leadId: string;
    reviewerName: string;
    outcome: Exclude<QAOutcome, 'Pending Review'>;
    checklist: QAChecklistItem[];
    comments: string;
  }) => void;
  updateCommissionStatus: (
    commissionId: string,
    paymentStatus: CommissionPaymentStatus,
    paymentDate?: string
  ) => void;

  importCRMState: (newState: CRMState) => void;
  resetDemoData: () => void;
  clearAllRecords: () => void;
}

const CRMContext = createContext<CRMContextValue | undefined>(undefined);

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [{ state: initialState, recoveredFromError }] = useState(() => loadCRMState());
  const [state, setState] = useState<CRMState>(initialState);
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [dateFilter, setDateFilter] = useState<DateFilterState>({ preset: '30d' });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = generateId('TST');
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (recoveredFromError) {
      addToast({
        type: 'warning',
        title: 'Demo data restored',
        message: 'Stored browser data was invalid or outdated and has been reset cleanly.'
      });
    }
  }, [recoveredFromError, addToast]);

  const commitState = useCallback(
    (updater: (prev: CRMState) => CRMState) => {
      setState((prev) => {
        const next = {
          ...updater(prev),
          lastUpdatedAt: new Date().toISOString()
        };
        const saved = saveCRMState(next);
        if (!saved) {
          addToast({
            type: 'error',
            title: 'Storage warning',
            message: 'Unable to persist changes to LocalStorage.'
          });
        }
        return next;
      });
    },
    [addToast]
  );

  const createLead = useCallback(
    (input: LeadFormInput & { notes?: string }): Lead => {
      const now = new Date().toISOString();
      const customerId = generateId('CUST');
      const leadId = generateId('LD');

      const newLead: Lead = {
        id: leadId,
        customerId,
        providerId: input.providerId,
        productId: input.productId,
        agentId: input.agentId,
        status: 'New Lead',
        notes: input.notes?.trim() || '',
        createdAt: now,
        updatedAt: now,
        statusEnteredAt: now
      };

      commitState((prev) => ({
        ...prev,
        customers: [
          ...prev.customers,
          {
            id: customerId,
            fullName: input.customerName.trim(),
            phone: input.phone.trim(),
            email: input.email.trim(),
            address: input.address.trim(),
            suburb: input.suburb.trim(),
            createdAt: now
          }
        ],
        leads: [newLead, ...prev.leads],
        activityHistory: [
          {
            id: generateId('ACT'),
            leadId,
            type: 'created',
            description: `Lead created for ${input.customerName.trim()}`,
            toStatus: 'New Lead',
            actor: 'Sales Manager',
            timestamp: now
          },
          ...prev.activityHistory
        ]
      }));

      addToast({ type: 'success', title: 'Lead created', message: `${leadId} added to pipeline.` });
      return newLead;
    },
    [commitState, addToast]
  );

  const updateLead = useCallback(
    (
      leadId: string,
      input: LeadFormInput & {
        notes?: string;
        followUpDate?: string;
        followUpNotes?: string;
      }
    ) => {
      const now = new Date().toISOString();
      commitState((prev) => {
        const existing = prev.leads.find((l) => l.id === leadId);
        if (!existing) return prev;

        return {
          ...prev,
          customers: prev.customers.map((c) =>
            c.id === existing.customerId
              ? {
                  ...c,
                  fullName: input.customerName.trim(),
                  phone: input.phone.trim(),
                  email: input.email.trim(),
                  address: input.address.trim(),
                  suburb: input.suburb.trim()
                }
              : c
          ),
          leads: prev.leads.map((l) =>
            l.id === leadId
              ? {
                  ...l,
                  providerId: input.providerId,
                  productId: input.productId,
                  agentId: input.agentId,
                  notes: input.notes ?? l.notes,
                  followUpDate: input.followUpDate,
                  followUpNotes: input.followUpNotes,
                  updatedAt: now
                }
              : l
          ),
          activityHistory: [
            {
              id: generateId('ACT'),
              leadId,
              type: 'updated',
              description: `Lead ${leadId} details updated`,
              actor: 'Sales Manager',
              timestamp: now
            },
            ...prev.activityHistory
          ]
        };
      });
      addToast({ type: 'success', title: 'Lead updated' });
    },
    [commitState, addToast]
  );

  const deleteLead = useCallback(
    (leadId: string) => {
      commitState((prev) => {
        const hasCommission = prev.commissions.some((c) => c.leadId === leadId);
        if (hasCommission) {
          return prev;
        }
        return {
          ...prev,
          leads: prev.leads.filter((l) => l.id !== leadId),
          qaReviews: prev.qaReviews.filter((q) => q.leadId !== leadId),
          activityHistory: prev.activityHistory.filter((a) => a.leadId !== leadId)
        };
      });
      addToast({ type: 'info', title: 'Lead removed' });
    },
    [commitState, addToast]
  );

  const updateLeadStatus = useCallback(
    (
      leadId: string,
      newStatus: LeadStatus,
      options?: {
        rejectionReason?: string;
        followUpDate?: string;
        followUpNotes?: string;
      }
    ) => {
      const now = new Date().toISOString();
      commitState((prev) => {
        const existing = prev.leads.find((l) => l.id === leadId);
        if (!existing) return prev;

        const updatedLead: Lead = {
          ...existing,
          status: newStatus,
          rejectionReason:
            newStatus === 'Rejected'
              ? options?.rejectionReason?.trim() || existing.rejectionReason
              : undefined,
          followUpDate: options?.followUpDate ?? existing.followUpDate,
          followUpNotes: options?.followUpNotes ?? existing.followUpNotes,
          updatedAt: now,
          statusEnteredAt: existing.status !== newStatus ? now : existing.statusEnteredAt
        };

        const latestQA = getLatestQAByLeadId(prev.qaReviews).get(leadId);
        const newCommission = createEligibleCommissionIfNeeded(
          updatedLead,
          latestQA,
          prev.commissions,
          prev.products,
          now
        );

        const newEvents: ActivityEvent[] = [
          {
            id: generateId('ACT'),
            leadId,
            type: 'status_change',
            description: `Status changed from ${existing.status} to ${newStatus}`,
            fromStatus: existing.status,
            toStatus: newStatus,
            actor: 'Sales Manager',
            timestamp: now
          }
        ];

        if (newCommission) {
          newEvents.unshift({
            id: generateId('ACT'),
            leadId,
            type: 'commission_created',
            description: `Commission ${newCommission.id} generated (R${newCommission.amount})`,
            actor: 'Commission Rule Engine',
            timestamp: now
          });
        }

        return {
          ...prev,
          leads: prev.leads.map((l) => (l.id === leadId ? updatedLead : l)),
          commissions: newCommission ? [newCommission, ...prev.commissions] : prev.commissions,
          activityHistory: [...newEvents, ...prev.activityHistory]
        };
      });
      addToast({ type: 'success', title: 'Pipeline status updated', message: `Moved to ${newStatus}` });
    },
    [commitState, addToast]
  );

  const assignLeadAgent = useCallback(
    (leadId: string, agentId: string) => {
      const now = new Date().toISOString();
      commitState((prev) => {
        const agent = prev.agents.find((a) => a.id === agentId);
        if (!agent) return prev;
        return {
          ...prev,
          leads: prev.leads.map((l) =>
            l.id === leadId ? { ...l, agentId, updatedAt: now } : l
          ),
          activityHistory: [
            {
              id: generateId('ACT'),
              leadId,
              type: 'agent_assigned',
              description: `Reassigned to ${agent.fullName}`,
              actor: 'Sales Manager',
              timestamp: now
            },
            ...prev.activityHistory
          ]
        };
      });
      addToast({ type: 'success', title: 'Agent reassigned' });
    },
    [commitState, addToast]
  );

  const createAgent = useCallback(
    (input: Omit<Agent, 'id'>) => {
      const newAgent: Agent = { ...input, id: generateId('AG') };
      commitState((prev) => ({
        ...prev,
        agents: [...prev.agents, newAgent]
      }));
      addToast({ type: 'success', title: 'Agent added', message: newAgent.fullName });
    },
    [commitState, addToast]
  );

  const updateAgent = useCallback(
    (agent: Agent) => {
      commitState((prev) => ({
        ...prev,
        agents: prev.agents.map((a) => (a.id === agent.id ? agent : a))
      }));
      addToast({ type: 'success', title: 'Agent updated' });
    },
    [commitState, addToast]
  );

  const toggleAgentActive = useCallback(
    (agentId: string) => {
      commitState((prev) => ({
        ...prev,
        agents: prev.agents.map((a) =>
          a.id === agentId ? { ...a, isActive: !a.isActive } : a
        )
      }));
      addToast({ type: 'info', title: 'Agent status updated' });
    },
    [commitState, addToast]
  );

  const createProvider = useCallback(
    (input: Omit<Provider, 'id'>) => {
      commitState((prev) => ({
        ...prev,
        providers: [...prev.providers, { ...input, id: generateId('PROV') }]
      }));
      addToast({ type: 'success', title: 'Provider added' });
    },
    [commitState, addToast]
  );

  const updateProvider = useCallback(
    (provider: Provider) => {
      commitState((prev) => ({
        ...prev,
        providers: prev.providers.map((p) => (p.id === provider.id ? provider : p))
      }));
      addToast({ type: 'success', title: 'Provider updated' });
    },
    [commitState, addToast]
  );

  const createProduct = useCallback(
    (input: Omit<Product, 'id'>) => {
      commitState((prev) => ({
        ...prev,
        products: [...prev.products, { ...input, id: generateId('PROD') }]
      }));
      addToast({ type: 'success', title: 'Package added' });
    },
    [commitState, addToast]
  );

  const updateProduct = useCallback(
    (product: Product) => {
      commitState((prev) => ({
        ...prev,
        products: prev.products.map((p) => (p.id === product.id ? product : p))
      }));
      addToast({
        type: 'success',
        title: 'Package updated',
        message: 'Future eligible sales will use the updated rate.'
      });
    },
    [commitState, addToast]
  );

  const submitQAReview = useCallback(
    (input: {
      leadId: string;
      reviewerName: string;
      outcome: Exclude<QAOutcome, 'Pending Review'>;
      checklist: QAChecklistItem[];
      comments: string;
    }) => {
      const now = new Date().toISOString();
      commitState((prev) => {
        const lead = prev.leads.find((l) => l.id === input.leadId);
        if (!lead) return prev;

        const review: QAReview = {
          id: generateId('QA'),
          leadId: lead.id,
          agentId: lead.agentId,
          reviewerName: input.reviewerName.trim() || 'Sales Manager',
          reviewedAt: now,
          outcome: input.outcome,
          checklist: input.checklist,
          comments: input.comments.trim()
        };

        const newCommission = createEligibleCommissionIfNeeded(
          lead,
          review,
          prev.commissions,
          prev.products,
          now
        );

        const events: ActivityEvent[] = [
          {
            id: generateId('ACT'),
            leadId: lead.id,
            type: 'qa_review',
            description: `QA review recorded: ${input.outcome}`,
            actor: review.reviewerName,
            timestamp: now
          }
        ];

        if (newCommission) {
          events.unshift({
            id: generateId('ACT'),
            leadId: lead.id,
            type: 'commission_created',
            description: `Commission ${newCommission.id} generated (R${newCommission.amount})`,
            actor: 'Commission Rule Engine',
            timestamp: now
          });
        }

        return {
          ...prev,
          qaReviews: [review, ...prev.qaReviews],
          commissions: newCommission ? [newCommission, ...prev.commissions] : prev.commissions,
          activityHistory: [...events, ...prev.activityHistory]
        };
      });
      addToast({ type: 'success', title: 'QA review recorded', message: input.outcome });
    },
    [commitState, addToast]
  );

  const updateCommissionStatus = useCallback(
    (commissionId: string, paymentStatus: CommissionPaymentStatus, paymentDate?: string) => {
      const now = new Date().toISOString();
      commitState((prev) => {
        const target = prev.commissions.find((c) => c.id === commissionId);
        if (!target) return prev;

        const resolvedDate =
          paymentStatus === 'Paid' ? paymentDate || now.slice(0, 10) : undefined;

        return {
          ...prev,
          commissions: prev.commissions.map((c) =>
            c.id === commissionId
              ? { ...c, paymentStatus, paymentDate: resolvedDate }
              : c
          ),
          activityHistory:
            paymentStatus === 'Paid'
              ? [
                  {
                    id: generateId('ACT'),
                    leadId: target.leadId,
                    type: 'commission_paid',
                    description: `Commission ${commissionId} (R${target.amount}) marked Paid`,
                    actor: 'Sales Manager',
                    timestamp: now
                  },
                  ...prev.activityHistory
                ]
              : prev.activityHistory
        };
      });
      addToast({ type: 'success', title: 'Commission status updated', message: paymentStatus });
    },
    [commitState, addToast]
  );

  const importCRMState = useCallback(
    (newState: CRMState) => {
      saveCRMState(newState);
      setState(newState);
      addToast({ type: 'success', title: 'Backup imported successfully' });
    },
    [addToast]
  );

  const resetDemoData = useCallback(() => {
    const fresh = resetCRMState();
    setState(fresh);
    addToast({ type: 'info', title: 'Demo data reset to default state' });
  }, [addToast]);

  const clearAllRecords = useCallback(() => {
    commitState((prev) => ({
      ...prev,
      customers: [],
      leads: [],
      qaReviews: [],
      commissions: [],
      activityHistory: []
    }));
    addToast({
      type: 'info',
      title: 'Operational records cleared',
      message: 'Agents, providers, and packages were retained.'
    });
  }, [commitState, addToast]);

  const value = useMemo<CRMContextValue>(
    () => ({
      state,
      activeSection,
      setActiveSection,
      dateFilter,
      setDateFilter,
      toasts,
      addToast,
      dismissToast,
      createLead,
      updateLead,
      deleteLead,
      updateLeadStatus,
      assignLeadAgent,
      createAgent,
      updateAgent,
      toggleAgentActive,
      createProvider,
      updateProvider,
      createProduct,
      updateProduct,
      submitQAReview,
      updateCommissionStatus,
      importCRMState,
      resetDemoData,
      clearAllRecords
    }),
    [
      state,
      activeSection,
      dateFilter,
      toasts,
      addToast,
      dismissToast,
      createLead,
      updateLead,
      deleteLead,
      updateLeadStatus,
      assignLeadAgent,
      createAgent,
      updateAgent,
      toggleAgentActive,
      createProvider,
      updateProvider,
      createProduct,
      updateProduct,
      submitQAReview,
      updateCommissionStatus,
      importCRMState,
      resetDemoData,
      clearAllRecords
    ]
  );

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
};

export function useCRM(): CRMContextValue {
  const ctx = useContext(CRMContext);
  if (!ctx) {
    throw new Error('useCRM must be used inside a CRMProvider');
  }
  return ctx;
}
