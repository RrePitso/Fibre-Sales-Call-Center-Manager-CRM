import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { Customer, Lead } from '../../types/crm';
import { formatCurrency } from '../../utils/calculations';
import { findDuplicatePhoneLeads, validateLeadInput } from '../../utils/validators';
import { Modal } from '../ui/Modal';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingLead?: Lead | null;
  editingCustomer?: Customer | null;
}

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
  isOpen,
  onClose,
  editingLead,
  editingCustomer
}) => {
  const { state, createLead, updateLead } = useCRM();

  const activeProviders = useMemo(
    () =>
      state.providers.filter(
        (p) => p.isActive || (editingLead && p.id === editingLead.providerId)
      ),
    [state.providers, editingLead]
  );

  const activeAgents = useMemo(
    () =>
      state.agents.filter(
        (a) => a.isActive || (editingLead && a.id === editingLead.agentId)
      ),
    [state.agents, editingLead]
  );

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [suburb, setSuburb] = useState('');
  const [providerId, setProviderId] = useState('');
  const [productId, setProductId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmedDuplicate, setConfirmedDuplicate] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingLead && editingCustomer) {
      setCustomerName(editingCustomer.fullName);
      setPhone(editingCustomer.phone);
      setEmail(editingCustomer.email);
      setAddress(editingCustomer.address);
      setSuburb(editingCustomer.suburb);
      setProviderId(editingLead.providerId);
      setProductId(editingLead.productId);
      setAgentId(editingLead.agentId);
      setNotes(editingLead.notes);
      setFollowUpDate(editingLead.followUpDate || '');
      setFollowUpNotes(editingLead.followUpNotes || '');
    } else {
      const defaultProvider = activeProviders[0]?.id || '';
      const defaultProduct =
        state.products.find((p) => p.providerId === defaultProvider && p.isActive)?.id || '';
      setCustomerName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setSuburb('');
      setProviderId(defaultProvider);
      setProductId(defaultProduct);
      setAgentId(activeAgents[0]?.id || '');
      setNotes('');
      setFollowUpDate('');
      setFollowUpNotes('');
    }
    setErrors({});
    setConfirmedDuplicate(false);
  }, [isOpen, editingLead, editingCustomer, activeProviders, activeAgents, state.products]);

  const availableProducts = useMemo(
    () =>
      state.products.filter(
        (p) =>
          p.providerId === providerId &&
          (p.isActive || (editingLead && p.id === editingLead.productId))
      ),
    [state.products, providerId, editingLead]
  );

  const duplicateMatches = useMemo(
    () => findDuplicatePhoneLeads(phone, state.leads, state.customers, editingLead?.id),
    [phone, state.leads, state.customers, editingLead?.id]
  );

  useEffect(() => {
    setConfirmedDuplicate(false);
  }, [phone]);

  const handleProviderChange = (nextProviderId: string) => {
    setProviderId(nextProviderId);
    const firstMatch = state.products.find(
      (p) => p.providerId === nextProviderId && p.isActive
    );
    setProductId(firstMatch?.id || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateLeadInput(
      {
        customerName,
        phone,
        email,
        address,
        suburb,
        providerId,
        productId,
        agentId
      },
      new Set(state.agents.map((a) => a.id)),
      new Set(state.providers.map((p) => p.id)),
      new Set(state.products.map((p) => p.id))
    );

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (duplicateMatches.length > 0 && !confirmedDuplicate) {
      setErrors({
        duplicate: 'Confirm duplicate handling above before saving this lead.'
      });
      return;
    }

    if (editingLead) {
      updateLead(editingLead.id, {
        customerName,
        phone,
        email,
        address,
        suburb,
        providerId,
        productId,
        agentId,
        notes,
        followUpDate: followUpDate || undefined,
        followUpNotes: followUpNotes || undefined
      });
    } else {
      createLead({
        customerName,
        phone,
        email,
        address,
        suburb,
        providerId,
        productId,
        agentId,
        notes
      });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingLead ? `Edit Lead ${editingLead.id}` : 'Create New Lead'}
      subtitle="Capture customer details, fibre package selection, and agent assignment."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="lead-name" className="block text-xs font-medium text-slate-700 mb-1">
              Customer full name *
            </label>
            <input
              id="lead-name"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Sipho Ndlovu"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600"
            />
            {errors.customerName && (
              <p className="text-xs text-rose-700 mt-1">{errors.customerName}</p>
            )}
          </div>

          <div>
            <label htmlFor="lead-phone" className="block text-xs font-medium text-slate-700 mb-1">
              Phone number *
            </label>
            <input
              id="lead-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 082 555 0140"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600"
            />
            {errors.phone && <p className="text-xs text-rose-700 mt-1">{errors.phone}</p>}
          </div>
        </div>

        {duplicateMatches.length > 0 && (
          <div
            role="alert"
            className="p-3.5 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold">
                  Duplicate phone warning ({duplicateMatches.length} matching{' '}
                  {duplicateMatches.length === 1 ? 'record' : 'records'})
                </p>
                <ul className="mt-1 space-y-0.5 text-amber-800">
                  {duplicateMatches.slice(0, 3).map(({ lead, customer }) => (
                    <li key={lead.id}>
                      {lead.id} · {customer.fullName} · {lead.status}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <label className="flex items-center gap-2 pt-1 font-medium text-amber-950 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedDuplicate}
                onChange={(e) => {
                  setConfirmedDuplicate(e.target.checked);
                  setErrors((prev) => ({ ...prev, duplicate: '' }));
                }}
                className="rounded border-amber-400 text-blue-700"
              />
              <span>Confirm duplicate: proceed with saving as a separate lead record</span>
            </label>
            {errors.duplicate && <p className="text-rose-700 font-medium">{errors.duplicate}</p>}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="lead-email" className="block text-xs font-medium text-slate-700 mb-1">
              Email address (optional)
            </label>
            <input
              id="lead-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.demo"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600"
            />
            {errors.email && <p className="text-xs text-rose-700 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="lead-suburb" className="block text-xs font-medium text-slate-700 mb-1">
              Suburb *
            </label>
            <input
              id="lead-suburb"
              type="text"
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
              placeholder="e.g. Bryanston"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600"
            />
            {errors.suburb && <p className="text-xs text-rose-700 mt-1">{errors.suburb}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="lead-address" className="block text-xs font-medium text-slate-700 mb-1">
            Installation address *
          </label>
          <input
            id="lead-address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street number, street name, unit/complex"
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600"
          />
          {errors.address && <p className="text-xs text-rose-700 mt-1">{errors.address}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="lead-provider" className="block text-xs font-medium text-slate-700 mb-1">
              Fibre provider *
            </label>
            <select
              id="lead-provider"
              value={providerId}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600"
            >
              <option value="">Select provider</option>
              {activeProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.providerId && (
              <p className="text-xs text-rose-700 mt-1">{errors.providerId}</p>
            )}
          </div>

          <div>
            <label htmlFor="lead-product" className="block text-xs font-medium text-slate-700 mb-1">
              Fibre package *
            </label>
            <select
              id="lead-product"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600"
            >
              <option value="">Select package</option>
              {availableProducts.map((prod) => (
                <option key={prod.id} value={prod.id}>
                  {prod.name} ({formatCurrency(prod.monthlyPrice)}/pm)
                </option>
              ))}
            </select>
            {errors.productId && (
              <p className="text-xs text-rose-700 mt-1">{errors.productId}</p>
            )}
          </div>

          <div>
            <label htmlFor="lead-agent" className="block text-xs font-medium text-slate-700 mb-1">
              Assigned agent *
            </label>
            <select
              id="lead-agent"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600"
            >
              <option value="">Select agent</option>
              {activeAgents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName} {!a.isActive ? '(Inactive)' : ''}
                </option>
              ))}
            </select>
            {errors.agentId && <p className="text-xs text-rose-700 mt-1">{errors.agentId}</p>}
          </div>
        </div>

        {editingLead && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
            <div>
              <label htmlFor="lead-followup-date" className="block text-xs font-medium text-slate-700 mb-1">
                Follow-up date
              </label>
              <input
                id="lead-followup-date"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600"
              />
            </div>
            <div>
              <label htmlFor="lead-followup-notes" className="block text-xs font-medium text-slate-700 mb-1">
                Follow-up notes
              </label>
              <input
                id="lead-followup-notes"
                type="text"
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                placeholder="Next step or callback reminder"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600"
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="lead-notes" className="block text-xs font-medium text-slate-700 mb-1">
            Notes
          </label>
          <textarea
            id="lead-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Coverage checks, installation access notes, or customer preferences..."
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md"
          >
            {editingLead ? 'Save Changes' : 'Create Lead'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
