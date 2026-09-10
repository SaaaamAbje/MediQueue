import React, { useState, useEffect } from 'react';
import {
  Pill,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Printer,
  Package,
  ArrowUpDown,
  FileText,
  X,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import { PharmacyItem, PrescriptionDispense } from '../../types';

export const AdminPharmacyView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dispense' | 'inventory'>('dispense');
  const [inventory, setInventory] = useState<PharmacyItem[]>([]);
  const [dispenses, setDispenses] = useState<PrescriptionDispense[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lowStockFilter, setLowStockFilter] = useState<boolean>(false);

  // Selected item for label printing
  const [printLabelDispense, setPrintLabelDispense] = useState<PrescriptionDispense | null>(null);

  // Modal for adding new item
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newItem, setNewItem] = useState<Partial<PharmacyItem>>({
    medicine_name: '',
    generic_name: '',
    dosage_form: 'Tablet',
    strength: '500mg',
    unit_price: 15,
    stock_quantity: 100,
    reorder_level: 25,
    expiration_date: '2028-12-31',
    batch_number: '',
    manufacturer: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [invRes, dspRes] = await Promise.all([
        api.getPharmacyInventory({ search: searchQuery, lowStockOnly: lowStockFilter }),
        api.getDispenseRecords(),
      ]);
      setInventory(invRes.items || []);
      setDispenses(dspRes.records || []);
    } catch (err) {
      console.error('Failed to load pharmacy data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery, lowStockFilter]);

  const handleStockAdjustment = async (itemId: string, delta: number) => {
    try {
      await api.updatePharmacyStock(itemId, delta);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update stock');
    }
  };

  const handleStatusChange = async (
    dispenseId: string,
    status: 'pending' | 'prepared' | 'dispensed' | 'cancelled'
  ) => {
    try {
      await api.updateDispenseStatus(dispenseId, status, 'Staff Pharmacist');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update dispense status');
    }
  };

  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addPharmacyItem(newItem);
      setShowAddModal(false);
      setNewItem({
        medicine_name: '',
        generic_name: '',
        dosage_form: 'Tablet',
        strength: '500mg',
        unit_price: 15,
        stock_quantity: 100,
        reorder_level: 25,
        expiration_date: '2028-12-31',
        batch_number: '',
        manufacturer: '',
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to add medication');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 mb-1">
            <Pill className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Outpatient Pharmacy Module</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Pharmacy & Formulary Dispensing</h1>
          <p className="text-sm text-slate-500">
            Real-time outpatient prescription fulfillment, stock inventory, and printable dosage instruction labels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('dispense')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === 'dispense'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Prescription Queue ({dispenses.filter((d) => d.status === 'pending' || d.status === 'prepared').length})
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === 'inventory'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Drug Formulary & Stock ({inventory.length})
          </button>
        </div>
      </div>

      {/* DISPENSE QUEUE TAB */}
      {activeTab === 'dispense' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <span className="text-xs font-bold text-amber-700 uppercase">Pending Preparation</span>
              <p className="text-2xl font-bold text-amber-900 mt-1">
                {dispenses.filter((d) => d.status === 'pending').length}
              </p>
              <p className="text-xs text-amber-700 mt-1">Orders sent directly from doctor consultations</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <span className="text-xs font-bold text-blue-700 uppercase">Ready for Pickup / Counseling</span>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {dispenses.filter((d) => d.status === 'prepared').length}
              </p>
              <p className="text-xs text-blue-700 mt-1">Packaged with medicine dosage labels</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <span className="text-xs font-bold text-emerald-700 uppercase">Dispensed Today</span>
              <p className="text-2xl font-bold text-emerald-900 mt-1">
                {dispenses.filter((d) => d.status === 'dispensed').length}
              </p>
              <p className="text-xs text-emerald-700 mt-1">Completed patient releases</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Active Prescriptions for Dispensing</h2>
              <button
                onClick={fetchData}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Refresh List
              </button>
            </div>

            {dispenses.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No active prescription dispensing requests found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {dispenses.map((dsp) => (
                  <div key={dsp.id} className="p-6 hover:bg-slate-50/70 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {dsp.patient ? `${dsp.patient.first_name} ${dsp.patient.last_name}` : 'Patient'}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                            {dsp.patient?.patient_number || 'PT-XXXX'}
                          </span>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                              dsp.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : dsp.status === 'prepared'
                                ? 'bg-blue-100 text-blue-800'
                                : dsp.status === 'dispensed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {dsp.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500">
                          Prescribed by{' '}
                          <span className="font-medium text-slate-700">
                            {dsp.doctor ? `Dr. ${dsp.doctor.first_name} ${dsp.doctor.last_name}` : 'Attending Physician'}
                          </span>{' '}
                          • {new Date(dsp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>

                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5 max-w-2xl">
                          <span className="font-semibold text-slate-700 block">Medication Items:</span>
                          {dsp.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-slate-600">
                              <span>
                                • <strong className="text-slate-800">{item.medicine_name}</strong> ({item.quantity} units)
                                <span className="text-slate-500 italic ml-2">— {item.dosage_instructions}</span>
                              </span>
                              <span className="font-medium text-slate-700">₱{item.total_price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        {dsp.counseling_notes && (
                          <p className="text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded border border-emerald-200">
                            <strong>Pharmacist Counseling Notes:</strong> {dsp.counseling_notes}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setPrintLabelDispense(dsp)}
                          className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print Bottle Label
                        </button>

                        {dsp.status === 'pending' && (
                          <button
                            onClick={() => handleStatusChange(dsp.id, 'prepared')}
                            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"
                          >
                            <Package className="w-3.5 h-3.5" />
                            Mark Prepared
                          </button>
                        )}

                        {dsp.status === 'prepared' && (
                          <button
                            onClick={() => handleStatusChange(dsp.id, 'dispensed')}
                            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Release to Patient
                          </button>
                        )}

                        {dsp.status === 'dispensed' && (
                          <span className="text-xs text-emerald-700 font-medium flex items-center gap-1 px-3 py-2 bg-emerald-50 rounded-lg">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Dispensed by {dsp.dispensed_by || 'Pharmacist'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DRUG FORMULARY & INVENTORY TAB */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search brand or generic medication..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                onClick={() => setLowStockFilter(!lowStockFilter)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  lowStockFilter
                    ? 'bg-amber-100 border-amber-300 text-amber-900'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Low Stock Only
              </button>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm self-end sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              Add Medication to Formulary
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Medicine & Generic</th>
                  <th className="py-3 px-4">Form / Strength</th>
                  <th className="py-3 px-4">Batch / Expiry</th>
                  <th className="py-3 px-4">Unit Price</th>
                  <th className="py-3 px-4">Stock Level</th>
                  <th className="py-3 px-4 text-right">Adjust Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map((item) => {
                  const isLow = item.stock_quantity <= item.reorder_level;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.medicine_name}</div>
                        <div className="text-xs text-slate-500 italic">{item.generic_name}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {item.dosage_form} • <span className="font-medium text-slate-800">{item.strength}</span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        <div>Batch: <span className="font-mono text-slate-800">{item.batch_number}</span></div>
                        <div className="text-slate-500">Exp: {item.expiration_date}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        ₱{item.unit_price.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold ${
                              isLow ? 'text-rose-600' : 'text-slate-900'
                            }`}
                          >
                            {item.stock_quantity}
                          </span>
                          {isLow && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-semibold uppercase">
                              Low (Reorder &lt;= {item.reorder_level})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleStockAdjustment(item.id, -10)}
                            className="px-2 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                            title="Deduct 10 units"
                          >
                            -10
                          </button>
                          <button
                            onClick={() => handleStockAdjustment(item.id, 50)}
                            className="px-2 py-1 text-xs font-semibold rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                            title="Restock 50 units"
                          >
                            +50 Restock
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

      {/* PRINTABLE PILL BOTTLE LABEL MODAL */}
      {printLabelDispense && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <Printer className="w-5 h-5" />
                <span>Pharmacy Dispensing Label Sticker</span>
              </div>
              <button
                onClick={() => setPrintLabelDispense(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sticker Preview Container */}
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 bg-amber-50/40 text-slate-900 space-y-3 font-sans">
              <div className="border-b border-slate-300 pb-2 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-800">
                    MEDIQUEUE CLINIC PHARMACY
                  </h3>
                  <p className="text-[10px] text-slate-500">Licensed Outpatient Dispensing Station</p>
                </div>
                <span className="text-[10px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Rx #{printLabelDispense.id.slice(-6).toUpperCase()}
                </span>
              </div>

              <div>
                <p className="text-xs text-slate-500">Patient Name:</p>
                <p className="text-base font-bold text-slate-900">
                  {printLabelDispense.patient
                    ? `${printLabelDispense.patient.first_name} ${printLabelDispense.patient.last_name}`
                    : 'Outpatient'}
                </p>
                <p className="text-[11px] text-slate-600">
                  Attending: {printLabelDispense.doctor ? `Dr. ${printLabelDispense.doctor.first_name} ${printLabelDispense.doctor.last_name}` : 'Physician'}
                </p>
              </div>

              <div className="space-y-2 border-t border-slate-200 pt-2">
                {printLabelDispense.items.map((it, i) => (
                  <div key={i} className="bg-white p-2.5 rounded border border-slate-200 text-xs">
                    <p className="font-bold text-slate-900">{it.medicine_name} ({it.quantity} units)</p>
                    <p className="text-emerald-900 font-medium mt-1">
                      ⚠️ INSTRUCTIONS: {it.dosage_instructions}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-2 text-[10px] text-slate-500 flex justify-between">
                <span>Date: {new Date().toLocaleDateString()}</span>
                <span>Keep out of reach of children. Store in dry place.</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPrintLabelDispense(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                Print Sticker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MEDICATION MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-bold text-slate-900">Add New Medication to Formulary</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItemSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={newItem.medicine_name}
                    onChange={(e) => setNewItem({ ...newItem, medicine_name: e.target.value })}
                    placeholder="e.g. Biogesic 500mg"
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Generic Name *</label>
                  <input
                    type="text"
                    required
                    value={newItem.generic_name}
                    onChange={(e) => setNewItem({ ...newItem, generic_name: e.target.value })}
                    placeholder="e.g. Paracetamol"
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Form</label>
                  <select
                    value={newItem.dosage_form}
                    onChange={(e) => setNewItem({ ...newItem, dosage_form: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Inhaler">Inhaler</option>
                    <option value="Injection">Injection</option>
                    <option value="Drops">Drops</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Strength</label>
                  <input
                    type="text"
                    value={newItem.strength}
                    onChange={(e) => setNewItem({ ...newItem, strength: e.target.value })}
                    placeholder="e.g. 500mg"
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Unit Price (₱)</label>
                  <input
                    type="number"
                    step="0.25"
                    value={newItem.unit_price}
                    onChange={(e) => setNewItem({ ...newItem, unit_price: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={newItem.stock_quantity}
                    onChange={(e) => setNewItem({ ...newItem, stock_quantity: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Reorder Level</label>
                  <input
                    type="number"
                    value={newItem.reorder_level}
                    onChange={(e) => setNewItem({ ...newItem, reorder_level: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={newItem.expiration_date}
                    onChange={(e) => setNewItem({ ...newItem, expiration_date: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Batch Number</label>
                  <input
                    type="text"
                    value={newItem.batch_number}
                    onChange={(e) => setNewItem({ ...newItem, batch_number: e.target.value })}
                    placeholder="e.g. BAT-2026-X1"
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Manufacturer</label>
                  <input
                    type="text"
                    value={newItem.manufacturer}
                    onChange={(e) => setNewItem({ ...newItem, manufacturer: e.target.value })}
                    placeholder="e.g. Unilab, Pfizer"
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold shadow-sm"
                >
                  Save Medication
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
