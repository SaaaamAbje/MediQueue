import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  Smartphone,
  CheckCircle2,
  Copy,
  Receipt,
  Sparkles,
  Building2,
  Clock,
  CreditCard,
  Printer,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import { BillingInvoice, PaymentMethod } from '../../types/index';

interface ContactlessQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: BillingInvoice | null;
  onPaymentSuccess?: (updatedInvoice: BillingInvoice) => void;
}

type QrChannel = 'QR_PH' | 'GCASH' | 'MAYA';

export const ContactlessQrModal: React.FC<ContactlessQrModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onPaymentSuccess,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<QrChannel>('QR_PH');
  const [customerRefInput, setCustomerRefInput] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<BillingInvoice | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(300); // 5 minute dynamic invoice QR

  // Auto-generate a realistic transaction reference code for this invoice
  const [channelRef, setChannelRef] = useState('');

  useEffect(() => {
    if (!isOpen || !invoice) {
      setCompletedInvoice(null);
      return;
    }

    setSecondsRemaining(300);
    const prefix = selectedChannel === 'QR_PH' ? 'QRP' : selectedChannel === 'GCASH' ? 'GCASH' : 'MAYA';
    const randomNum = Math.floor(10000000 + Math.random() * 90000000);
    const generated = `${prefix}-2026-${randomNum}`;
    setChannelRef(generated);
    setCustomerRefInput(generated);
  }, [isOpen, invoice, selectedChannel]);

  // Expiration countdown
  useEffect(() => {
    if (!isOpen || completedInvoice) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, completedInvoice]);

  if (!isOpen || !invoice) return null;

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    try {
      const pMethod: PaymentMethod =
        selectedChannel === 'QR_PH' ? 'qr_ph' : selectedChannel === 'GCASH' ? 'gcash' : 'maya';

      const payload = {
        payment_method: pMethod,
        amount_paid: invoice.total_amount,
        change_amount: 0,
        qr_payment_ref: customerRefInput || channelRef,
        qr_payment_channel: selectedChannel,
        remarks: `Contactless digital payment settled via ${selectedChannel} (Ref: ${customerRefInput || channelRef})`,
      };

      const res = await api.payInvoice(invoice.id, payload);
      setCompletedInvoice(res.invoice);
      if (onPaymentSuccess) {
        onPaymentSuccess(res.invoice);
      }
    } catch (err: any) {
      console.error('Payment failed:', err);
      alert(err.message || 'Payment processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const formatMinutes = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Contactless QR & Digital Payment Counter
              </h3>
              <p className="text-xs text-slate-500">
                Dynamic QR Ph (National Standard), GCash, and Maya instant payment terminal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto">
          {completedInvoice ? (
            /* PAYMENT SUCCESS SCREEN */
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h4 className="text-xl font-black text-slate-900">Payment Successfully Reconciled!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Transaction verified and settled via {completedInvoice.qr_payment_channel || 'Digital QR'}.
                </p>
              </div>

              {/* Official Receipt Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left max-w-md mx-auto font-sans space-y-3 shadow-2xs">
                <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Official Receipt</span>
                    <strong className="text-sm font-mono text-slate-900">
                      {completedInvoice.receipt_number || 'OR-2026-XXXX'}
                    </strong>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full uppercase">
                    PAID IN FULL
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Invoice Number:</span>
                    <strong className="text-slate-800 font-mono">{completedInvoice.invoice_number}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Amount Paid:</span>
                    <strong className="text-teal-800 text-base font-black">
                      ₱{completedInvoice.amount_paid.toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Patient Name:</span>
                    <strong className="text-slate-800">
                      {completedInvoice.patient
                        ? `${completedInvoice.patient.first_name} ${completedInvoice.patient.last_name}`
                        : 'Patient'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Settlement Channel:</span>
                    <strong className="text-slate-800">{completedInvoice.qr_payment_channel || 'QR Ph'}</strong>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-2.5 rounded-xl text-xs">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">
                    Bank / e-Wallet Reference Number:
                  </span>
                  <p className="font-mono font-bold text-slate-900">
                    {completedInvoice.qr_payment_ref || channelRef}
                  </p>
                </div>

                <div className="text-[11px] text-slate-400 pt-1 text-center">
                  Payment timestamp: {new Date(completedInvoice.payment_date || Date.now()).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print Official Receipt
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* ACTIVE QR PRESENTATION SCREEN */
            <div className="space-y-6">
              {/* Channel Selector Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Select Contactless Payment Provider / Standard:
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedChannel('QR_PH')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${
                      selectedChannel === 'QR_PH'
                        ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-black text-teal-900 tracking-wider">QR Ph</span>
                    <span className="text-[10px] text-teal-700 font-medium">National Standard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedChannel('GCASH')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${
                      selectedChannel === 'GCASH'
                        ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-black text-blue-900 tracking-wider">GCash</span>
                    <span className="text-[10px] text-blue-700 font-medium">e-Wallet Scan to Pay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedChannel('MAYA')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${
                      selectedChannel === 'MAYA'
                        ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-black text-emerald-900 tracking-wider">Maya</span>
                    <span className="text-[10px] text-emerald-700 font-medium">Digital Bank & Wallet</span>
                  </button>
                </div>
              </div>

              {/* Dynamic QR Presentation Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
                {/* SVG Dynamic QR Code Render */}
                <div className="relative bg-white p-4 rounded-2xl border border-slate-300 shadow-sm text-center shrink-0">
                  <div className="w-48 h-48 bg-white flex flex-col items-center justify-center p-2 relative overflow-hidden rounded-lg">
                    {/* Official standard header logo badge */}
                    <div className="absolute top-1 left-2 right-2 flex items-center justify-between text-[9px] font-bold text-slate-500 border-b pb-1">
                      <span>{selectedChannel === 'QR_PH' ? 'BSP QR Ph' : selectedChannel}</span>
                      <span>₱{invoice.total_amount.toLocaleString()}</span>
                    </div>

                    {/* QR graphic mockup using SVG patterned grid */}
                    <svg viewBox="0 0 100 100" className="w-36 h-36 text-slate-900 my-auto">
                      {/* Corner locator squares */}
                      <rect x="5" y="5" width="26" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
                      <rect x="11" y="11" width="14" height="14" rx="2" fill="currentColor" />

                      <rect x="69" y="5" width="26" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
                      <rect x="75" y="11" width="14" height="14" rx="2" fill="currentColor" />

                      <rect x="5" y="69" width="26" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
                      <rect x="11" y="75" width="14" height="14" rx="2" fill="currentColor" />

                      {/* Dense QR data matrix dots */}
                      <circle cx="45" cy="15" r="3.5" fill="currentColor" />
                      <circle cx="55" cy="22" r="3" fill="currentColor" />
                      <circle cx="40" cy="32" r="3" fill="currentColor" />
                      <circle cx="60" cy="40" r="3" fill="currentColor" />
                      <circle cx="20" cy="48" r="3" fill="currentColor" />
                      <circle cx="32" cy="55" r="3.5" fill="currentColor" />
                      <circle cx="48" cy="50" r="4" fill={selectedChannel === 'GCASH' ? '#0070ba' : selectedChannel === 'MAYA' ? '#10b981' : '#0d9488'} />
                      <circle cx="68" cy="58" r="3" fill="currentColor" />
                      <circle cx="80" cy="48" r="3" fill="currentColor" />
                      <circle cx="45" cy="68" r="3" fill="currentColor" />
                      <circle cx="60" cy="75" r="3.5" fill="currentColor" />
                      <circle cx="75" cy="85" r="3" fill="currentColor" />
                      <circle cx="50" cy="88" r="3" fill="currentColor" />
                    </svg>

                    {/* Channel logo in center */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-white/95 px-2 py-0.5 rounded shadow-2xs text-[10px] font-black text-slate-900 border border-slate-200">
                        {selectedChannel === 'QR_PH' ? 'QR Ph' : selectedChannel}
                      </div>
                    </div>

                    <div className="absolute bottom-1 text-[9px] text-slate-400 font-mono">
                      Dynamic Invoice Token
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-xs text-amber-700 font-bold mt-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Valid for {formatMinutes(secondsRemaining)}</span>
                  </div>
                </div>

                {/* Details & Live Scan Instructions */}
                <div className="flex-1 space-y-3 text-left">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Merchant Destination
                    </span>
                    <h5 className="text-sm font-black text-slate-900">
                      MEDIQUEUE CLINICAL HEALTHCARE NETWORK
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Merchant ID: MQ-PH-MNL-001 • Terminal: CASHIER-01
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Invoice Number:</span>
                      <strong className="font-mono text-slate-800">{invoice.invoice_number}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Patient:</span>
                      <strong className="text-slate-800">
                        {invoice.patient ? `${invoice.patient.first_name} ${invoice.patient.last_name}` : 'Patient'}
                      </strong>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-1 text-sm">
                      <span className="font-bold text-slate-800">Amount Due:</span>
                      <span className="font-black text-teal-800 text-lg">
                        ₱{invoice.total_amount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Generated Transaction Reference */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Transaction Reference ID (Auto-Generated / Bank Confirmation):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customerRefInput}
                        onChange={(e) => setCustomerRefInput(e.target.value)}
                        className="flex-1 text-xs font-mono font-bold px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopy(customerRefInput)}
                        className="px-2.5 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copiedRef ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions Callout */}
              <div className="bg-teal-50/60 border border-teal-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-teal-900">
                <Smartphone className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 leading-relaxed">
                  <p className="font-bold">Customer Scanning Instructions:</p>
                  <p className="text-teal-800 text-[11px]">
                    1. Open any bank app (BDO, BPI, UnionBank, RCBC) or e-Wallet (GCash, Maya).<br />
                    2. Tap "Scan QR" and point at the QR code above.<br />
                    3. Confirm payment of ₱{invoice.total_amount.toLocaleString()} to MediQueue.
                  </p>
                </div>
              </div>

              {/* Cashier Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors w-full sm:w-auto"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleSimulatePayment}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isProcessing ? 'Verifying Gateway...' : 'Reconcile & Confirm Customer Payment'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
