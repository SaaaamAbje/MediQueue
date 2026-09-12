import React, { useState, useEffect } from 'react';
import {
  Receipt,
  CreditCard,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  ShieldCheck,
  Building2,
  DollarSign,
  TrendingUp,
  X,
  FileText,
  Percent,
  QrCode,
  Smartphone,
} from 'lucide-react';
import { BillingInvoice, InvoiceItem, Patient, Doctor } from '../../types/index';
import { api } from '../../services/api';
import { ContactlessQrModal } from '../../components/billing/ContactlessQrModal';

const HMO_PROVIDERS = [
  'Maxicare Healthcare',
  'Medicard Philippines',
  'PhilHealth (National Health Insurance)',
  'Intellicare (Asalus)',
  'Avega Managed Care',
  'Cocolife Healthcare',
  'Pacific Cross Insurance',
];

export const AdminBillingView: React.FC = () => {
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showNewModal, setShowNewModal] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<BillingInvoice | null>(null);
  const [receiptInvoice, setReceiptInvoice] = useState<BillingInvoice | null>(null);
  const [qrInvoiceModal, setQrInvoiceModal] = useState<BillingInvoice | null>(null);

  // New invoice state
  const [newPatientId, setNewPatientId] = useState('');
  const [newDoctorId, setNewDoctorId] = useState('');
  const [discountType, setDiscountType] = useState<string>('None');
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 'itm_1',
      description: 'Outpatient Specialty Consultation Fee',
      category: 'consultation',
      quantity: 1,
      unit_price: 700,
      total: 700,
    },
  ]);

  // Payment form state
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'hmo' | 'qr'>('cash');
  const [amountTendered, setAmountTendered] = useState<number>(0);
  const [hmoProvider, setHmoProvider] = useState(HMO_PROVIDERS[0]);
  const [hmoMemberId, setHmoMemberId] = useState('');
  const [hmoApprovalCode, setHmoApprovalCode] = useState('');
  const [hmoCoverageAmount, setHmoCoverageAmount] = useState<number>(0);
  const [qrPaymentRef, setQrPaymentRef] = useState('');
  const [qrChannel, setQrChannel] = useState<'QR_PH' | 'GCASH' | 'MAYA'>('QR_PH');
  const [cashierRemarks, setCashierRemarks] = useState('');
  const [isProcessingPay, setIsProcessingPay] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invRes, patRes, docRes] = await Promise.all([
        api.getInvoices({ status: statusFilter !== 'all' ? statusFilter : undefined }),
        api.getPatients(),
        api.getDoctors(),
      ]);
      setInvoices(invRes.invoices || []);
      const patientList = Array.isArray(patRes) ? patRes : (patRes as any).patients || [];
      const doctorList = Array.isArray(docRes) ? docRes : (docRes as any).doctors || [];
      setPatients(patientList);
      setDoctors(doctorList);
      if (patientList.length > 0 && !newPatientId) {
        setNewPatientId(patientList[0].id);
      }
    } catch (err) {
      console.error('Failed to load billing data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const patName = `${inv.patient?.first_name || ''} ${inv.patient?.last_name || ''}`.toLowerCase();
    const invNum = inv.invoice_number.toLowerCase();
    const query = search.toLowerCase();
    return patName.includes(query) || invNum.includes(query);
  });

  // Financial Metrics
  const totalRevenue = invoices
    .filter((i) => i.status === 'paid' || i.status === 'partially_paid')
    .reduce((sum, i) => sum + (i.amount_paid || 0), 0);

  const pendingReceivables = invoices
    .filter((i) => i.status === 'pending')
    .reduce((sum, i) => sum + (i.balance_due || i.total_amount), 0);

  const hmoTotal = invoices
    .filter((i) => i.payment_method === 'hmo' && i.hmo_coverage_amount)
    .reduce((sum, i) => sum + (i.hmo_coverage_amount || 0), 0);

  // New Invoice Calculations
  const subtotal = items.reduce((sum, itm) => sum + (itm.unit_price * itm.quantity), 0);
  const discountAmount = discountType.includes('20%') ? subtotal * 0.2 : 0;
  const netTotal = Math.max(0, subtotal - discountAmount);

  const addItem = () => {
    setItems([
      ...items,
      {
        id: `itm_${Date.now()}`,
        description: 'Prescribed Pharmacy / Diagnostic Test',
        category: 'pharmacy',
        quantity: 1,
        unit_price: 350,
        total: 350,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((i) => i.id !== id));
    }
  };

  const updateItem = (id: string, field: string, val: any) => {
    setItems(
      items.map((i) => {
        if (i.id !== id) return i;
        const updated = { ...i, [field]: val };
        if (field === 'quantity' || field === 'unit_price') {
          updated.total = Number(updated.quantity) * Number(updated.unit_price);
        }
        return updated;
      })
    );
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createInvoice({
        patient_id: newPatientId,
        doctor_id: newDoctorId || undefined,
        items,
        subtotal,
        discount_amount: discountAmount,
        discount_type: discountType,
        tax_amount: 0,
        total_amount: netTotal,
        status: 'pending',
        amount_paid: 0,
        balance_due: netTotal,
      });

      setShowNewModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create invoice.');
    }
  };

  const openPaymentModal = (inv: BillingInvoice) => {
    setPayingInvoice(inv);
    setAmountTendered(inv.balance_due || inv.total_amount);
    setHmoCoverageAmount(inv.balance_due || inv.total_amount);
    setPayMethod('cash');
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;

    try {
      setIsProcessingPay(true);
      const isHmo = payMethod === 'hmo';
      const isQr = payMethod === 'qr';
      const actualPaid = isHmo ? hmoCoverageAmount : amountTendered;
      const change = !isHmo && payMethod === 'cash' ? Math.max(0, amountTendered - payingInvoice.balance_due) : 0;

      let effectiveMethod = payMethod;
      if (isQr) {
        effectiveMethod = qrChannel === 'GCASH' ? 'gcash' : qrChannel === 'MAYA' ? 'maya' : 'qr_ph';
      }

      const res = await api.payInvoice(payingInvoice.id, {
        payment_method: effectiveMethod,
        amount_paid: actualPaid,
        change_amount: change,
        qr_payment_ref: isQr ? qrPaymentRef : undefined,
        qr_payment_channel: isQr ? qrChannel : undefined,
        hmo_provider: isHmo ? hmoProvider : undefined,
        hmo_member_id: isHmo ? hmoMemberId : undefined,
        hmo_approval_code: isHmo ? hmoApprovalCode : undefined,
        hmo_coverage_amount: isHmo ? hmoCoverageAmount : undefined,
        remarks: cashierRemarks,
      });

      setPayingInvoice(null);
      setReceiptInvoice(res.invoice);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Payment processing failed.');
    } finally {
      setIsProcessingPay(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-blue-600" />
            Billing, Cashier &amp; HMO Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Outpatient billing statements, HMO coverage verification, and payment receipts.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create New Bill
        </button>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Revenue</span>
            <span className="text-2xl font-black font-mono text-slate-900 mt-1 block">
              ₱{totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">Collected via Cash &amp; Cards</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Pending Receivables</span>
            <span className="text-2xl font-black font-mono text-amber-600 mt-1 block">
              ₱{pendingReceivables.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Awaiting Cashier Settlement</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">HMO Covered Total</span>
            <span className="text-2xl font-black font-mono text-blue-700 mt-1 block">
              ₱{hmoTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-blue-600 font-medium">Approved Guarantee Letters</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Invoices</span>
            <span className="text-2xl font-black font-mono text-slate-900 mt-1 block">
              {invoices.length}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Billing Ledgers Recorded</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient, invoice #, OR #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {['all', 'pending', 'paid', 'partially_paid'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  statusFilter === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading billing records...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No billing statements match your criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Doctor</th>
                  <th className="py-3.5 px-4">Bill Items</th>
                  <th className="py-3.5 px-4 text-right">Total Amount</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(inv.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">
                        {inv.patient?.first_name} {inv.patient?.last_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{inv.patient?.patient_number}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {inv.doctor ? `Dr. ${inv.doctor.first_name} ${inv.doctor.last_name}` : 'General Clinic'}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-500">
                      {inv.items.map((i) => i.description).join(', ')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₱{inv.total_amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          inv.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {inv.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {inv.payment_method ? (
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            {['qr_ph', 'gcash', 'maya'].includes(inv.payment_method) ? (
                              <QrCode className="w-3.5 h-3.5 text-blue-600" />
                            ) : inv.payment_method === 'hmo' ? (
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            <span className="uppercase text-[11px] font-bold text-slate-800">
                              {inv.payment_method === 'qr_ph'
                                ? 'QR Ph'
                                : inv.payment_method === 'gcash'
                                ? 'GCash'
                                : inv.payment_method === 'maya'
                                ? 'Maya'
                                : inv.payment_method}
                              {inv.hmo_provider ? ` (${inv.hmo_provider.split(' ')[0]})` : ''}
                            </span>
                          </div>
                          {inv.qr_payment_ref && (
                            <span className="text-[10px] font-mono text-slate-500 mt-0.5">
                              Ref: {inv.qr_payment_ref}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unpaid</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setQrInvoiceModal(inv)}
                              className="px-2.5 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-800 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition-colors"
                              title="Contactless Dynamic QR Payment Counter"
                            >
                              <QrCode className="w-3.5 h-3.5 text-blue-600" />
                              QR Pay
                            </button>
                            <button
                              onClick={() => openPaymentModal(inv)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                            >
                              Collect
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setReceiptInvoice(inv)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                          title="Print Receipt / Statement"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Create New Billing Invoice */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Generate Billing Invoice</h2>
                <p className="text-xs text-slate-500">Create billable charges for consultations or clinic procedures</p>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Patient *</label>
                  <select
                    value={newPatientId}
                    onChange={(e) => setNewPatientId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 bg-white"
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.first_name} {p.last_name} ({p.patient_number})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Attending Doctor</label>
                  <select
                    value={newDoctorId}
                    onChange={(e) => setNewDoctorId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 bg-white"
                  >
                    <option value="">General Clinic Services</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.first_name} {d.last_name} ({d.specialization_name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Billable Items</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {items.map((itm) => (
                    <div key={itm.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <input
                        type="text"
                        value={itm.description}
                        onChange={(e) => updateItem(itm.id, 'description', e.target.value)}
                        placeholder="Description..."
                        className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800"
                      />
                      <input
                        type="number"
                        min={1}
                        value={itm.quantity}
                        onChange={(e) => updateItem(itm.id, 'quantity', Number(e.target.value))}
                        className="w-14 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-center font-mono font-bold"
                      />
                      <input
                        type="number"
                        min={0}
                        value={itm.unit_price}
                        onChange={(e) => updateItem(itm.id, 'unit_price', Number(e.target.value))}
                        className="w-24 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-right font-mono font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(itm.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Discount Privilege</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 bg-white"
                >
                  <option value="None">None (Regular Patient)</option>
                  <option value="Senior Citizen (20%)">Senior Citizen (20% OSCA Law)</option>
                  <option value="PWD (20%)">Person with Disability (20% PWD Law)</option>
                  <option value="Employee">Clinic Staff / Healthcare Worker</option>
                </select>
              </div>

              {/* Price Calculation Summary */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>₱{subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount ({discountType}):</span>
                    <span>-₱{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Due:</span>
                  <span className="text-blue-700">₱{netTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 shadow-sm"
                >
                  Save &amp; Issue Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Process Cashier Payment & HMO Settlement */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Cashier Settlement</h2>
                <p className="text-xs text-slate-500">
                  Invoice {payingInvoice.invoice_number} • Total Due: ₱{payingInvoice.balance_due.toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => setPayingInvoice(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-4">
              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'cash', label: 'Cash', icon: DollarSign },
                    { id: 'card', label: 'Credit/Debit', icon: CreditCard },
                    { id: 'hmo', label: 'HMO / LOG', icon: ShieldCheck },
                    { id: 'qr', label: 'QR Ph / e-Wallet', icon: QrCode },
                  ].map((m) => {
                    const isSelected = payMethod === m.id;
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setPayMethod(m.id as any);
                          if (m.id === 'qr' && !qrPaymentRef) {
                            const prefix = qrChannel === 'GCASH' ? 'GCASH' : qrChannel === 'MAYA' ? 'MAYA' : 'QRP';
                            setQrPaymentRef(`${prefix}-2026-${Math.floor(10000000 + Math.random() * 90000000)}`);
                          }
                        }}
                        className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cash specifics */}
              {payMethod === 'cash' && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cash Amount Tendered (₱) *
                    </label>
                    <input
                      type="number"
                      required
                      min={payingInvoice.balance_due}
                      value={amountTendered}
                      onChange={(e) => setAmountTendered(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono font-bold text-slate-700 pt-2 border-t border-slate-200">
                    <span>Change Due:</span>
                    <span className="text-emerald-600 text-sm">
                      ₱{Math.max(0, amountTendered - payingInvoice.balance_due).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* QR / e-Wallet specifics */}
              {payMethod === 'qr' && (
                <div className="space-y-3 p-4 bg-blue-50/70 rounded-2xl border border-blue-200 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900">QR Ph & Digital Settlement</span>
                    <button
                      type="button"
                      onClick={() => setQrInvoiceModal(payingInvoice)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      Launch Customer QR Display Screen
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {(['QR_PH', 'GCASH', 'MAYA'] as const).map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => {
                          setQrChannel(ch);
                          const prefix = ch === 'GCASH' ? 'GCASH' : ch === 'MAYA' ? 'MAYA' : 'QRP';
                          setQrPaymentRef(`${prefix}-2026-${Math.floor(10000000 + Math.random() * 90000000)}`);
                        }}
                        className={`p-2 rounded-xl border text-center font-bold transition-all ${
                          qrChannel === ch
                            ? 'bg-white border-blue-600 text-blue-900 shadow-2xs'
                            : 'bg-blue-50/50 border-blue-200/60 text-slate-600 hover:bg-white'
                        }`}
                      >
                        {ch === 'QR_PH' ? 'QR Ph' : ch === 'GCASH' ? 'GCash' : 'Maya'}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">
                      Transaction Reference Code (from patient's e-Wallet app) *
                    </label>
                    <input
                      type="text"
                      required
                      value={qrPaymentRef}
                      onChange={(e) => setQrPaymentRef(e.target.value)}
                      placeholder="e.g. QRP-2026-8831920"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 bg-white font-mono font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Card specifics */}
              {payMethod === 'card' && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Terminal Auth Code / POS Trace #</label>
                    <input
                      type="text"
                      placeholder="e.g. TRC-994821-POS"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 bg-white font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Swipe or tap patient card on the reception POS terminal and enter the confirmation reference.
                  </p>
                </div>
              )}

              {/* HMO Insurance specifics */}
              {payMethod === 'hmo' && (
                <div className="space-y-3 p-4 bg-blue-50/70 rounded-2xl border border-blue-200 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">HMO Provider</label>
                    <select
                      value={hmoProvider}
                      onChange={(e) => setHmoProvider(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 bg-white"
                    >
                      {HMO_PROVIDERS.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-800 mb-1">HMO Member Card # *</label>
                      <input
                        type="text"
                        required
                        value={hmoMemberId}
                        onChange={(e) => setHmoMemberId(e.target.value)}
                        placeholder="e.g. MAX-8839102"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-800 mb-1">Letter of Guarantee (LOG) # *</label>
                      <input
                        type="text"
                        required
                        value={hmoApprovalCode}
                        onChange={(e) => setHmoApprovalCode(e.target.value)}
                        placeholder="e.g. APV-88192"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">HMO Covered Amount (₱)</label>
                    <input
                      type="number"
                      required
                      value={hmoCoverageAmount}
                      onChange={(e) => setHmoCoverageAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 bg-white font-mono font-bold"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cashier Remarks (Optional)</label>
                <input
                  type="text"
                  value={cashierRemarks}
                  onChange={(e) => setCashierRemarks(e.target.value)}
                  placeholder="e.g. Official receipt issued to patient with copy to HMO portal."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayingInvoice(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPay}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 shadow-sm disabled:opacity-50"
                >
                  {isProcessingPay ? 'Processing...' : 'Confirm Settlement & Print OR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Official Receipt & Printable Statement */}
      {receiptInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            {/* Printable Receipt Frame */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-slate-800 font-sans print:border-none">
              {/* Header */}
              <div className="text-center pb-4 border-b border-slate-300">
                <h3 className="text-lg font-bold uppercase tracking-tight text-slate-900">
                  MAKATI MEDICAL CENTER OUTPATIENT CLINIC
                </h3>
                <p className="text-xs text-slate-500">Official Cashier &amp; Billing Statement</p>
                <p className="text-[10px] text-slate-400 font-mono">TIN: 401-889-102-000 • Non-VAT Clinic Provider</p>
              </div>

              <div className="grid grid-cols-2 gap-3 my-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Official Receipt #:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {receiptInvoice.receipt_number || 'OR-2026-PENDING'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Payment Date:</span>
                  <span className="font-medium text-slate-800">
                    {receiptInvoice.payment_date
                      ? new Date(receiptInvoice.payment_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Pending'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Billed Patient:</span>
                  <span className="font-bold text-slate-900">
                    {receiptInvoice.patient?.first_name} {receiptInvoice.patient?.last_name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Payment Method:</span>
                  <span className="font-bold uppercase text-blue-700">
                    {receiptInvoice.payment_method || 'CASHIER'}
                  </span>
                </div>
              </div>

              {/* HMO info if applicable */}
              {receiptInvoice.hmo_provider && (
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs mb-3">
                  <span className="font-bold block">{receiptInvoice.hmo_provider}</span>
                  <span className="text-[11px] block">
                    Card #: {receiptInvoice.hmo_member_id} | Approval: {receiptInvoice.hmo_approval_code}
                  </span>
                </div>
              )}

              {/* QR / Digital Wallet info if applicable */}
              {(receiptInvoice.qr_payment_ref || receiptInvoice.qr_payment_channel) && (
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs mb-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-blue-600" />
                      Contactless {receiptInvoice.qr_payment_channel || 'QR Ph'} Payment
                    </span>
                    <span className="text-[11px] font-mono text-slate-700 block">
                      Ref: {receiptInvoice.qr_payment_ref}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded uppercase">
                    E-Settled
                  </span>
                </div>
              )}

              {/* Items Table */}
              <table className="w-full text-left text-xs mb-4">
                <thead className="border-b border-slate-300 text-slate-600 font-bold uppercase">
                  <tr>
                    <th className="py-2">Item Description</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {receiptInvoice.items.map((i) => (
                    <tr key={i.id}>
                      <td className="py-2 font-medium text-slate-800">{i.description}</td>
                      <td className="py-2 text-center font-mono">{i.quantity}</td>
                      <td className="py-2 text-right font-mono">₱{i.total.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-300 font-bold">
                    <td colSpan={2} className="py-2 text-right pr-2">Subtotal:</td>
                    <td className="py-2 text-right font-mono">₱{receiptInvoice.subtotal.toFixed(2)}</td>
                  </tr>
                  {receiptInvoice.discount_amount > 0 && (
                    <tr className="text-emerald-700 font-semibold">
                      <td colSpan={2} className="py-1 text-right pr-2">Discount ({receiptInvoice.discount_type}):</td>
                      <td className="py-1 text-right font-mono">-₱{receiptInvoice.discount_amount.toFixed(2)}</td>
                    </tr>
                  )}
                  <tr className="text-sm font-black text-slate-900 border-t border-slate-300">
                    <td colSpan={2} className="py-2 text-right pr-2">Total Amount Paid:</td>
                    <td className="py-2 text-right font-mono text-teal-700">₱{receiptInvoice.amount_paid.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Cashier Signature Line */}
              <div className="pt-6 mt-6 border-t border-slate-300 flex items-end justify-between text-xs">
                <div className="text-[10px] text-slate-400">
                  Thank you for entrusting your healthcare with us.
                  <br />
                  Keep this official receipt for tax or reimbursement filing.
                </div>
                <div className="text-center w-40">
                  <div className="border-b border-slate-400 pb-1 font-bold text-slate-800">
                    {receiptInvoice.cashier_name || 'Authorized Cashier'}
                  </div>
                  <span className="text-[10px] text-slate-500">Cashier Signature</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
              <button
                onClick={() => setReceiptInvoice(null)}
                className="px-5 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Contactless Dynamic QR Ph / GCash / Maya Terminal */}
      <ContactlessQrModal
        isOpen={!!qrInvoiceModal}
        onClose={() => setQrInvoiceModal(null)}
        invoice={qrInvoiceModal}
        onPaymentSuccess={(updated) => {
          setReceiptInvoice(updated);
          setPayingInvoice(null);
          loadData();
        }}
      />
    </div>
  );
};
