import React, { useMemo, useState } from 'react';
import { Edit3, Info, Plus, Power, Search } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { Product, Provider } from '../types/crm';
import { formatCurrency } from '../utils/calculations';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';

export const ProductsPage: React.FC = () => {
  const {
    state,
    createProvider,
    updateProvider,
    createProduct,
    updateProduct
  } = useCRM();

  const [providerFilter, setProviderFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');

  // Provider Modal state
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [provName, setProvName] = useState('');
  const [provCode, setProvCode] = useState('');
  const [provActive, setProvActive] = useState(true);
  const [provError, setProvError] = useState('');

  // Product Modal state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodProviderId, setProdProviderId] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodSpeed, setProdSpeed] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCommission, setProdCommission] = useState('');
  const [prodActive, setProdActive] = useState(true);
  const [prodErrors, setProdErrors] = useState<Record<string, string>>({});

  const providerMap = useMemo(
    () => new Map(state.providers.map((p) => [p.id, p])),
    [state.providers]
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.products.filter((prod) => {
      if (providerFilter !== 'all' && prod.providerId !== providerFilter) return false;
      if (availabilityFilter === 'active' && !prod.isActive) return false;
      if (availabilityFilter === 'inactive' && prod.isActive) return false;
      if (
        q &&
        !prod.name.toLowerCase().includes(q) &&
        !prod.id.toLowerCase().includes(q) &&
        !prod.speedLabel.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [state.products, providerFilter, availabilityFilter, search]);

  const openCreateProvider = () => {
    setEditingProvider(null);
    setProvName('');
    setProvCode('');
    setProvActive(true);
    setProvError('');
    setProviderModalOpen(true);
  };

  const openEditProvider = (provider: Provider) => {
    setEditingProvider(provider);
    setProvName(provider.name);
    setProvCode(provider.code);
    setProvActive(provider.isActive);
    setProvError('');
    setProviderModalOpen(true);
  };

  const handleSaveProvider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provName.trim() || !provCode.trim()) {
      setProvError('Provider name and short code are required.');
      return;
    }
    if (editingProvider) {
      updateProvider({
        ...editingProvider,
        name: provName.trim(),
        code: provCode.trim().toUpperCase(),
        isActive: provActive
      });
    } else {
      createProvider({
        name: provName.trim(),
        code: provCode.trim().toUpperCase(),
        isActive: provActive
      });
    }
    setProviderModalOpen(false);
  };

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProdProviderId(state.providers[0]?.id || '');
    setProdName('');
    setProdSpeed('');
    setProdPrice('699');
    setProdCommission('350');
    setProdActive(true);
    setProdErrors({});
    setProductModalOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProdProviderId(product.providerId);
    setProdName(product.name);
    setProdSpeed(product.speedLabel);
    setProdPrice(String(product.monthlyPrice));
    setProdCommission(String(product.commissionAmount));
    setProdActive(product.isActive);
    setProdErrors({});
    setProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const priceNum = Number(prodPrice);
    const commNum = Number(prodCommission);

    if (!prodProviderId) errs.providerId = 'Select a provider.';
    if (!prodName.trim()) errs.name = 'Package name is required.';
    if (!prodSpeed.trim()) errs.speed = 'Advertised speed is required.';
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      errs.price = 'Enter a valid monthly price greater than 0.';
    }
    if (Number.isNaN(commNum) || commNum < 0) {
      errs.commission = 'Enter a valid non-negative commission amount.';
    }

    if (Object.keys(errs).length > 0) {
      setProdErrors(errs);
      return;
    }

    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        providerId: prodProviderId,
        name: prodName.trim(),
        speedLabel: prodSpeed.trim(),
        monthlyPrice: priceNum,
        commissionAmount: commNum,
        isActive: prodActive
      });
    } else {
      createProduct({
        providerId: prodProviderId,
        name: prodName.trim(),
        speedLabel: prodSpeed.trim(),
        monthlyPrice: priceNum,
        commissionAmount: commNum,
        isActive: prodActive
      });
    }
    setProductModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Rule Notice */}
      <div className="bg-sky-50 border border-sky-200 rounded-lg p-3.5 flex items-start gap-2.5 text-xs text-sky-900">
        <Info className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          <strong>Demonstration Catalogue:</strong> Packages, pricing, and commission rates are fictional demonstration values. Updating a package commission rate applies strictly to future eligible sales—existing commission records keep their historical locked amount.
        </p>
      </div>

      {/* Providers Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Fibre Providers</h2>
          <button
            type="button"
            onClick={openCreateProvider}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add Provider</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {state.providers.map((provider) => {
            const pkgCount = state.products.filter((p) => p.providerId === provider.id).length;
            const activePkgCount = state.products.filter(
              (p) => p.providerId === provider.id && p.isActive
            ).length;

            return (
              <div
                key={provider.id}
                className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{provider.name}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {provider.code} · {activePkgCount}/{pkgCount} packages active
                    </p>
                  </div>
                  <Badge tone={provider.isActive ? 'emerald' : 'slate'}>
                    {provider.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={() => openEditProvider(provider)}
                    className="text-slate-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" aria-hidden="true" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateProvider({ ...provider, isActive: !provider.isActive })
                    }
                    className="text-slate-600 hover:text-slate-900 font-medium"
                  >
                    {provider.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Fibre Packages Section */}
      <section className="space-y-3">
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Search fibre packages"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search package name or speed..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:border-blue-600"
              />
            </div>

            <select
              aria-label="Filter packages by provider"
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
              aria-label="Filter packages by availability"
              value={availabilityFilter}
              onChange={(e) =>
                setAvailabilityFilter(e.target.value as 'all' | 'active' | 'inactive')
              }
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-md"
            >
              <option value="all">All Availability</option>
              <option value="active">Available</option>
              <option value="inactive">Unavailable</option>
            </select>
          </div>

          <button
            type="button"
            onClick={openCreateProduct}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add Package</span>
          </button>
        </div>

        {filteredProducts.length === 0 ? (
          <EmptyState
            title="No fibre packages found"
            description="Adjust your provider or availability filters, or add a new fibre package."
          />
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Product ID</th>
                    <th className="py-3 px-4">Provider</th>
                    <th className="py-3 px-4">Package Name</th>
                    <th className="py-3 px-4">Advertised Speed</th>
                    <th className="py-3 px-4 text-right">Monthly Price</th>
                    <th className="py-3 px-4 text-right">Commission</th>
                    <th className="py-3 px-4">Availability</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredProducts.map((product) => {
                    const provider = providerMap.get(product.providerId);
                    return (
                      <tr key={product.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                          {product.id}
                        </td>
                        <td className="py-2.5 px-4 text-xs font-medium text-slate-900 whitespace-nowrap">
                          {provider?.name || '—'}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          {product.name}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-600">
                          {product.speedLabel}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-800 whitespace-nowrap">
                          {formatCurrency(product.monthlyPrice)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs font-semibold text-slate-900 whitespace-nowrap">
                          {formatCurrency(product.commissionAmount)}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <Badge tone={product.isActive ? 'emerald' : 'slate'}>
                            {product.isActive ? 'Available' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditProduct(product)}
                              aria-label={`Edit ${product.name}`}
                              className="p-1.5 rounded text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateProduct({ ...product, isActive: !product.isActive })
                              }
                              aria-label={
                                product.isActive
                                  ? `Deactivate ${product.name}`
                                  : `Activate ${product.name}`
                              }
                              title={product.isActive ? 'Deactivate package' : 'Activate package'}
                              className={`p-1.5 rounded ${
                                product.isActive
                                  ? 'text-slate-500 hover:text-amber-700 hover:bg-amber-50'
                                  : 'text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              <Power className="w-4 h-4" />
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
      </section>

      {/* Provider Modal */}
      <Modal
        isOpen={providerModalOpen}
        onClose={() => setProviderModalOpen(false)}
        title={editingProvider ? `Edit Provider ${editingProvider.name}` : 'Add Fibre Provider'}
        size="sm"
      >
        <form onSubmit={handleSaveProvider} className="space-y-4">
          <div>
            <label htmlFor="prov-name" className="block text-xs font-medium text-slate-700 mb-1">
              Provider name *
            </label>
            <input
              id="prov-name"
              type="text"
              value={provName}
              onChange={(e) => setProvName(e.target.value)}
              placeholder="e.g. Cool Ideas"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white"
            />
          </div>
          <div>
            <label htmlFor="prov-code" className="block text-xs font-medium text-slate-700 mb-1">
              Short code *
            </label>
            <input
              id="prov-code"
              type="text"
              maxLength={6}
              value={provCode}
              onChange={(e) => setProvCode(e.target.value)}
              placeholder="e.g. CID"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white uppercase font-mono"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={provActive}
              onChange={(e) => setProvActive(e.target.checked)}
              className="rounded border-slate-300 text-blue-700"
            />
            <span>Provider active for new leads</span>
          </label>
          {provError && <p className="text-xs text-rose-700">{provError}</p>}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setProviderModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md"
            >
              Save Provider
            </button>
          </div>
        </form>
      </Modal>

      {/* Product Modal */}
      <Modal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title={editingProduct ? `Edit Package ${editingProduct.id}` : 'Add Fibre Package'}
        subtitle="Changing commission affects future eligible sales only."
        size="md"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div>
            <label htmlFor="prod-prov" className="block text-xs font-medium text-slate-700 mb-1">
              Fibre provider *
            </label>
            <select
              id="prod-prov"
              value={prodProviderId}
              onChange={(e) => setProdProviderId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
            >
              <option value="">Select provider</option>
              {state.providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {prodErrors.providerId && (
              <p className="text-xs text-rose-700 mt-1">{prodErrors.providerId}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prod-name" className="block text-xs font-medium text-slate-700 mb-1">
                Package name *
              </label>
              <input
                id="prod-name"
                type="text"
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                placeholder="e.g. Pure Fibre 100/100 Demo"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white"
              />
              {prodErrors.name && (
                <p className="text-xs text-rose-700 mt-1">{prodErrors.name}</p>
              )}
            </div>
            <div>
              <label htmlFor="prod-speed" className="block text-xs font-medium text-slate-700 mb-1">
                Advertised speed *
              </label>
              <input
                id="prod-speed"
                type="text"
                value={prodSpeed}
                onChange={(e) => setProdSpeed(e.target.value)}
                placeholder="e.g. 100 Mbps Down / 100 Mbps Up"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:bg-white"
              />
              {prodErrors.speed && (
                <p className="text-xs text-rose-700 mt-1">{prodErrors.speed}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prod-price" className="block text-xs font-medium text-slate-700 mb-1">
                Monthly price (R) *
              </label>
              <input
                id="prod-price"
                type="number"
                min={1}
                value={prodPrice}
                onChange={(e) => setProdPrice(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md font-mono tabular-nums focus:bg-white"
              />
              {prodErrors.price && (
                <p className="text-xs text-rose-700 mt-1">{prodErrors.price}</p>
              )}
            </div>
            <div>
              <label htmlFor="prod-comm" className="block text-xs font-medium text-slate-700 mb-1">
                Commission per eligible sale (R) *
              </label>
              <input
                id="prod-comm"
                type="number"
                min={0}
                value={prodCommission}
                onChange={(e) => setProdCommission(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md font-mono tabular-nums focus:bg-white"
              />
              {prodErrors.commission && (
                <p className="text-xs text-rose-700 mt-1">{prodErrors.commission}</p>
              )}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={prodActive}
              onChange={(e) => setProdActive(e.target.checked)}
              className="rounded border-slate-300 text-blue-700"
            />
            <span>Package available for new sales</span>
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setProductModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md"
            >
              {editingProduct ? 'Save Changes' : 'Add Package'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
