import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  AlertCircle,
  Clock,
  Printer,
  X,
  CheckCircle2,
  Stethoscope,
  Microscope,
} from 'lucide-react';
import { LabTestItem, LabOrder } from '../types/index';
import { api } from '../services/api';

const STANDARD_TESTS: LabTestItem[] = [
  {
    id: 'std_01',
    test_code: 'CBC-PLT',
    test_name: 'Complete Blood Count (CBC) with Platelet',
    category: 'Hematology',
    standard_price: 400,
    fasting_required: false,
    estimated_turnaround_hours: 2,
    preparation_instructions: 'No fasting required. Venous blood collection.',
  },
  {
    id: 'std_02',
    test_code: 'LIP-01',
    test_name: 'Lipid Profile (Total Cholesterol, HDL, LDL, Triglycerides)',
    category: 'Clinical Chemistry',
    standard_price: 850,
    fasting_required: true,
    estimated_turnaround_hours: 12,
    preparation_instructions: 'Strict 10-12 hours overnight fasting. Water permitted.',
  },
  {
    id: 'std_03',
    test_code: 'FBS-01',
    test_name: 'Fasting Blood Sugar (FBS)',
    category: 'Clinical Chemistry',
    standard_price: 250,
    fasting_required: true,
    estimated_turnaround_hours: 6,
    preparation_instructions: '8-10 hours fasting prior to morning draw.',
  },
  {
    id: 'std_04',
    test_code: 'HBA1C',
    test_name: 'Glycated Hemoglobin (HbA1c)',
    category: 'Clinical Chemistry',
    standard_price: 650,
    fasting_required: false,
    estimated_turnaround_hours: 8,
    preparation_instructions: 'Monitors 3-month average glucose control. No fasting required.',
  },
  {
    id: 'std_05',
    test_code: 'CREA-01',
    test_name: 'Serum Creatinine & Blood Urea Nitrogen (BUN)',
    category: 'Clinical Chemistry',
    standard_price: 450,
    fasting_required: false,
    estimated_turnaround_hours: 6,
    preparation_instructions: 'Renal function evaluation.',
  },
  {
    id: 'std_06',
    test_code: 'CXR-PA',
    test_name: 'Chest X-Ray (PA View)',
    category: 'Imaging & Radiology',
    standard_price: 600,
    fasting_required: false,
    estimated_turnaround_hours: 3,
    preparation_instructions: 'Remove upper metal jewelry or buttons prior to exposure.',
  },
  {
    id: 'std_07',
    test_code: 'ECG-12',
    test_name: '12-Lead Electrocardiogram (ECG)',
    category: 'Cardiology',
    standard_price: 550,
    fasting_required: false,
    estimated_turnaround_hours: 1,
    preparation_instructions: 'Rest calmly 10 minutes prior to lead attachment.',
  },
  {
    id: 'std_08',
    test_code: 'URI-01',
    test_name: 'Routine Urinalysis (Clean-Catch Midstream)',
    category: 'Urinalysis & Fecalysis',
    standard_price: 200,
    fasting_required: false,
    estimated_turnaround_hours: 2,
    preparation_instructions: 'Midstream clean catch sample in sterile specimen container.',
  },
];

interface LabOrdersModalProps {
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName?: string;
  consultationId?: string;
  onClose: () => void;
  onOrderCreated?: (order: LabOrder) => void;
}

export const LabOrdersModal: React.FC<LabOrdersModalProps> = ({
  patientId,
  patientName,
  doctorId,
  doctorName = 'Attending Physician',
  consultationId,
  onClose,
  onOrderCreated,
}) => {
  const [selectedTests, setSelectedTests] = useState<LabTestItem[]>([STANDARD_TESTS[0]]);
  const [priority, setPriority] = useState<'Routine' | 'Urgent' | 'STAT'>('Routine');
  const [clinicalIndication, setClinicalIndication] = useState('Routine medical diagnostic workup');
  const [specimenNotes, setSpecimenNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<LabOrder | null>(null);

  const toggleTest = (test: LabTestItem) => {
    if (selectedTests.some((t) => t.id === test.id)) {
      setSelectedTests(selectedTests.filter((t) => t.id !== test.id));
    } else {
      setSelectedTests([...selectedTests, test]);
    }
  };

  const isFastingRequired = selectedTests.some((t) => t.fasting_required);
  const totalAmount = selectedTests.reduce((sum, t) => sum + (t.standard_price || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTests.length === 0) {
      alert('Please select at least one laboratory or diagnostic test.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.createLabOrder({
        patient_id: patientId,
        doctor_id: doctorId,
        consultation_id: consultationId,
        priority,
        clinical_indication: clinicalIndication,
        tests: selectedTests,
        fasting_required: isFastingRequired,
        specimen_notes: specimenNotes,
      });

      setCreatedOrder(res.order);
      if (onOrderCreated) onOrderCreated(res.order);
    } catch (err: any) {
      alert(err.message || 'Failed to issue lab order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center">
              <Microscope className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {createdOrder ? 'Diagnostic Requisition Issued' : 'Issue Diagnostic & Lab Request'}
              </h2>
              <p className="text-xs text-slate-400">
                Patient: <strong className="text-white">{patientName}</strong> | Doctor: {doctorName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {createdOrder ? (
            /* Printable Requisition Slip View */
            <div className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-slate-800 font-sans print:border-none">
                {/* Clinic Official Header */}
                <div className="text-center border-b pb-4 border-slate-200">
                  <h3 className="text-xl font-bold tracking-tight text-slate-900">MEDI-QUEUE CLINICAL LABORATORY</h3>
                  <p className="text-xs text-slate-500">Official Diagnostic Requisition Slip</p>
                  <p className="text-[11px] text-slate-400">Accredited by DOH &amp; Health Insurance Partners</p>
                </div>

                <div className="grid grid-cols-2 gap-4 my-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">Requisition #:</span>
                    <span className="font-mono font-bold text-slate-900">{createdOrder.order_number}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block">Order Date:</span>
                    <span className="font-medium text-slate-800">
                      {new Date(createdOrder.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Patient Name:</span>
                    <span className="font-bold text-slate-900">{patientName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block">Attending Doctor:</span>
                    <span className="font-bold text-slate-900">{doctorName}</span>
                  </div>
                </div>

                {/* Priority & Fasting alert */}
                <div className="flex items-center gap-3 my-3">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-teal-100 text-teal-800">
                    Priority: {createdOrder.priority}
                  </span>
                  {createdOrder.fasting_required && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-800 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Fasting Required (10-12 hrs)
                    </span>
                  )}
                </div>

                {/* Clinical Indication */}
                <div className="text-xs bg-white p-3 rounded-xl border border-slate-200 mb-4">
                  <span className="text-slate-500 font-semibold block mb-0.5">Clinical Indication:</span>
                  <span className="text-slate-800">{createdOrder.clinical_indication}</span>
                </div>

                {/* Tests Table */}
                <table className="w-full text-left text-xs mb-4">
                  <thead className="border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2">Test Name</th>
                      <th className="py-2">Category</th>
                      <th className="py-2 text-right">Standard Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {createdOrder.tests.map((t) => (
                      <tr key={t.id}>
                        <td className="py-2 font-semibold text-slate-800">
                          {t.test_name} <span className="font-mono text-[10px] text-slate-400">({t.test_code})</span>
                        </td>
                        <td className="py-2 text-slate-500">{t.category}</td>
                        <td className="py-2 text-right font-mono text-slate-700">₱{t.standard_price.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-slate-200 font-bold">
                      <td colSpan={2} className="py-2 text-slate-800 text-right pr-4">Total Estimated Fee:</td>
                      <td className="py-2 text-right font-mono text-teal-700">₱{totalAmount.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Signature Block */}
                <div className="pt-6 mt-6 border-t border-slate-200 flex items-end justify-between text-xs">
                  <div className="text-slate-400 text-[10px]">
                    Generated via MediQueue Clinical System
                    <br />
                    Verifiable at Laboratory Reception Counter
                  </div>
                  <div className="text-center w-48">
                    <div className="border-b border-slate-400 pb-1 font-bold text-slate-900">{doctorName}</div>
                    <span className="text-[10px] text-slate-500 block">Attending Physician / PRC License</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Print Requisition Slip
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Creation Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Test Catalog Checkboxes */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider">
                  Select Diagnostic Tests to Order
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {STANDARD_TESTS.map((test) => {
                    const isChecked = selectedTests.some((t) => t.id === test.id);
                    return (
                      <div
                        key={test.id}
                        onClick={() => toggleTest(test)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start justify-between ${
                          isChecked
                            ? 'bg-teal-50 border-teal-500 text-slate-900'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="pr-2">
                          <span className="font-semibold text-xs block leading-tight">{test.test_name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{test.category}</span>
                          {test.fasting_required && (
                            <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                              Fasting req.
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono text-xs font-bold text-slate-800 block">₱{test.standard_price}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-1 rounded text-teal-600 focus:ring-teal-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Priority & Fasting Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white"
                  >
                    <option value="Routine">Routine</option>
                    <option value="Urgent">Urgent (Expedited 4h)</option>
                    <option value="STAT">STAT (Immediate Emergency)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Preparation Note</label>
                  <div className="px-3 py-2 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200">
                    {isFastingRequired ? (
                      <span className="text-amber-700 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> 10-12 hrs fasting needed
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium">No fasting required</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Clinical Indication */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clinical Indication / Diagnosis Reason *
                </label>
                <input
                  type="text"
                  required
                  value={clinicalIndication}
                  onChange={(e) => setClinicalIndication(e.target.value)}
                  placeholder="e.g. Assessment for persistent cough, ruling out respiratory infection."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Special Specimen Instructions */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Special Instructions / Specimen Notes (Optional)
                </label>
                <input
                  type="text"
                  value={specimenNotes}
                  onChange={(e) => setSpecimenNotes(e.target.value)}
                  placeholder="e.g. Morning midstream specimen; patient has slight needle anxiety."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Summary & Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">Tests Selected: {selectedTests.length}</span>
                  <span className="text-base font-bold font-mono text-teal-700">Total: ₱{totalAmount.toFixed(2)}</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || selectedTests.length === 0}
                    className="px-5 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? 'Issuing...' : 'Issue Lab Order'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
