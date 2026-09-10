import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Building2,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Stethoscope,
  Activity,
  Pill,
  Microscope,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  DoctorReferral,
  ReferralPriority,
  Patient,
  Doctor,
  Consultation,
  ClinicBranch,
} from '../../types/index';

interface DoctorReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  referringDoctor?: Doctor | null;
  consultation?: Consultation | null;
  existingReferral?: DoctorReferral | null;
  onSuccess?: (referral: DoctorReferral) => void;
}

const SPECIALTY_OPTIONS = [
  'Cardiology & Vascular Medicine',
  'Pulmonology & Respiratory Medicine',
  'Orthopedics & Sports Medicine',
  'Gastroenterology & Hepatology',
  'Neurology & Stroke Care',
  'Dermatology & Cutaneous Surgery',
  'Endocrinology & Metabolism',
  'Nephrology & Renal Medicine',
  'Otorhinolaryngology (ENT / Head & Neck)',
  'Ophthalmology & Eye Health',
  'Obstetrics & Gynecology (OB-GYN)',
  'Pediatrics & Adolescent Medicine',
  'General & Laparoscopic Surgery',
  'Psychiatry & Behavioral Health',
  'Allergy & Clinical Immunology',
  'Rheumatology & Autoimmune Care',
];

export const DoctorReferralModal: React.FC<DoctorReferralModalProps> = ({
  isOpen,
  onClose,
  patient,
  referringDoctor,
  consultation,
  existingReferral,
  onSuccess,
}) => {
  const [receivingSpecialty, setReceivingSpecialty] = useState('Cardiology & Vascular Medicine');
  const [receivingDoctorName, setReceivingDoctorName] = useState('');
  const [receivingBranch, setReceivingBranch] = useState('MediQueue Main Flagship Center');
  const [priority, setPriority] = useState<ReferralPriority>('Routine');
  const [reasonForReferral, setReasonForReferral] = useState('');
  const [clinicalSummary, setClinicalSummary] = useState('');
  const [relevantVitals, setRelevantVitals] = useState('');
  const [attachedMedications, setAttachedMedications] = useState('');
  const [attachedLabResults, setAttachedLabResults] = useState('');
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );

  const [branches, setBranches] = useState<ClinicBranch[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdRef, setCreatedRef] = useState<DoctorReferral | null>(existingReferral || null);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');

  // Load branches
  useEffect(() => {
    if (!isOpen) return;
    api.getBranches().then((res) => {
      if (res.branches && res.branches.length > 0) {
        setBranches(res.branches);
      }
    }).catch(() => {});
  }, [isOpen]);

  // Synchronize on load or when patient/consultation changes
  useEffect(() => {
    if (!isOpen) return;

    if (existingReferral) {
      setCreatedRef(existingReferral);
      setReceivingSpecialty(existingReferral.receiving_specialty);
      setReceivingDoctorName(existingReferral.receiving_doctor_name || '');
      setReceivingBranch(existingReferral.receiving_clinic_branch || 'MediQueue Main Flagship Center');
      setPriority(existingReferral.priority);
      setReasonForReferral(existingReferral.reason_for_referral);
      setClinicalSummary(existingReferral.clinical_summary);
      setRelevantVitals(existingReferral.relevant_vitals || '');
      setAttachedMedications(existingReferral.attached_medications || '');
      setAttachedLabResults(existingReferral.attached_lab_results || '');
      setValidUntil(existingReferral.valid_until);
      setActiveTab('preview');
      return;
    }

    // Default auto-populated values from active consultation
    if (consultation) {
      setReasonForReferral(
        `For specialist evaluation and further diagnostic workup regarding: ${consultation.diagnosis}`
      );
      setClinicalSummary(
        consultation.clinical_notes ||
          'Patient evaluated during outpatient consultation. Refer to specialist for second opinion and targeted therapeutic plan.'
      );
    } else {
      setReasonForReferral('');
      setClinicalSummary('');
    }

    // Attempt to pull latest vitals
    if (patient) {
      api.getVitals(patient.id).then((res) => {
        if (res.vitals && res.vitals.length > 0) {
          const latest = res.vitals[0];
          setRelevantVitals(
            `BP: ${latest.systolic_bp}/${latest.diastolic_bp} mmHg • HR: ${latest.heart_rate} bpm • Temp: ${latest.temperature_c}°C • SpO2: ${latest.spo2}% • BMI: ${latest.bmi || 'N/A'}`
          );
        }
      }).catch(() => {});

      // Pull active medications / prescription
      if (consultation?.prescription) {
        if (typeof consultation.prescription === 'string') {
          setAttachedMedications(consultation.prescription);
        } else if (Array.isArray(consultation.prescription)) {
          setAttachedMedications(
            consultation.prescription
              .map((rx: any) =>
                typeof rx === 'string'
                  ? rx
                  : `${rx.medicine_name || ''} ${rx.dosage || ''} ${rx.frequency ? `(${rx.frequency})` : ''}`.trim()
              )
              .filter(Boolean)
              .join(', ')
          );
        }
      }
    }
  }, [isOpen, existingReferral, consultation, patient]);

  // 1-Click Clinical Summary Auto Transfer
  const handleTransferClinicalSummary = async () => {
    if (!patient) return;
    try {
      // Vitals
      const vitalsRes = await api.getPatientVitals(patient.id);
      if (vitalsRes.vitals && vitalsRes.vitals.length > 0) {
        const v = vitalsRes.vitals[0];
        setRelevantVitals(
          `BP: ${v.systolic_bp}/${v.diastolic_bp} mmHg • Pulse: ${v.heart_rate} bpm • SpO2: ${v.spo2}% • Temp: ${v.temperature_c}°C`
        );
      }

      // Labs
      const labsRes = await api.getLabOrders({ patientId: patient.id });
      if (labsRes.orders && labsRes.orders.length > 0) {
        const labSummaries = labsRes.orders
          .slice(0, 3)
          .map((lo) => {
            const testNames = lo.tests?.map((t) => t.test_name).join(', ');
            return testNames ? `${testNames} (${lo.status})` : `${lo.order_number} (${lo.status})`;
          })
          .join('; ');
        setAttachedLabResults(labSummaries || 'Routine blood chemistry and CBC on record.');
      }

      if (consultation) {
        setClinicalSummary(
          `Chief Diagnosis: ${consultation.diagnosis}\nClinical Notes: ${consultation.clinical_notes || 'Patient evaluated during clinical encounter.'}`
        );
      }
    } catch (err) {
      console.warn('Could not auto-transfer some clinical fields:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;

    setIsSubmitting(true);
    try {
      const payload: Partial<DoctorReferral> = {
        patient_id: patient.id,
        referring_doctor_id: referringDoctor?.id,
        consultation_id: consultation?.id,
        receiving_specialty: receivingSpecialty,
        receiving_doctor_name: receivingDoctorName,
        receiving_clinic_branch: receivingBranch,
        priority,
        reason_for_referral: reasonForReferral,
        clinical_summary: clinicalSummary,
        relevant_vitals: relevantVitals,
        attached_medications: attachedMedications,
        attached_lab_results: attachedLabResults,
        valid_until: validUntil,
      };

      const res = await api.createDoctorReferral(payload);
      setCreatedRef(res.referral);
      setActiveTab('preview');
      if (onSuccess) {
        onSuccess(res.referral);
      }
    } catch (err: any) {
      console.error('Failed to create referral:', err);
      alert(err.message || 'Failed to create specialist referral letter.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Inter-Departmental Specialist Referral Slip Builder
              </h3>
              <p className="text-xs text-slate-500">
                Formally endorse patients to specialist services with automatic clinical summary transfer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'form'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Referral Builder
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'preview'
                    ? 'bg-white text-sky-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Printable Endorsement Slip
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Context bar with 1-click clinical transfer */}
              <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-sky-800">Endorsing Patient: </span>
                  <strong className="text-sm text-slate-900 ml-1">
                    {patient ? `${patient.first_name} ${patient.last_name}` : 'Patient'}
                  </strong>
                  <span className="text-xs font-mono text-slate-500 ml-2">
                    ({patient?.patient_number})
                  </span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Referring Doctor:{' '}
                    <strong>
                      {referringDoctor ? `Dr. ${referringDoctor.first_name} ${referringDoctor.last_name}` : 'Attending Physician'}
                    </strong>{' '}
                    ({referringDoctor?.specialization_name || 'General Medicine'})
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTransferClinicalSummary}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-sky-300 text-sky-800 text-xs font-bold rounded-xl shadow-2xs hover:bg-sky-50 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-sky-600" />
                  Auto-Transfer Clinical Vitals & Labs
                </button>
              </div>

              {/* Receiving Specialist Destination */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  1. Receiving Specialist & Priority Level
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Receiving Specialty / Subspecialty *
                    </label>
                    <select
                      required
                      value={receivingSpecialty}
                      onChange={(e) => setReceivingSpecialty(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                    >
                      {SPECIALTY_OPTIONS.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Receiving Specialist / Doctor Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={receivingDoctorName}
                      onChange={(e) => setReceivingDoctorName(e.target.value)}
                      placeholder="e.g. Dr. Maria Santos / Next Available"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Clinical Priority
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Routine', 'Urgent', 'STAT'] as ReferralPriority[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                            priority === p
                              ? p === 'STAT'
                                ? 'bg-red-600 text-white border-red-600'
                                : p === 'Urgent'
                                ? 'bg-amber-500 text-white border-amber-500'
                                : 'bg-sky-600 text-white border-sky-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Receiving Clinic Center / Satellite Branch
                    </label>
                    <select
                      value={receivingBranch}
                      onChange={(e) => setReceivingBranch(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
                    >
                      <option value="MediQueue Main Flagship Center">MediQueue Main Flagship Center</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name} ({b.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Referral Validity Expiration
                    </label>
                    <input
                      type="date"
                      required
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Clinical Indication & Summary Transfer */}
              <div className="space-y-4 border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  2. Clinical Summary Transfer & Specific Medical Question
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Specific Reason for Referral & Clinical Question *
                  </label>
                  <input
                    type="text"
                    required
                    value={reasonForReferral}
                    onChange={(e) => setReasonForReferral(e.target.value)}
                    placeholder="e.g. For comprehensive 2D-Echocardiogram and formal cardiac risk assessment"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Clinical Summary & Pertinent Consultation Notes
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={clinicalSummary}
                    onChange={(e) => setClinicalSummary(e.target.value)}
                    placeholder="Summary of present illness, clinical course, objective physical findings..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-teal-600" />
                      Relevant Vital Signs
                    </label>
                    <textarea
                      rows={2}
                      value={relevantVitals}
                      onChange={(e) => setRelevantVitals(e.target.value)}
                      placeholder="BP, Heart rate, Temp, BMI..."
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Pill className="w-3.5 h-3.5 text-indigo-600" />
                      Current Medications
                    </label>
                    <textarea
                      rows={2}
                      value={attachedMedications}
                      onChange={(e) => setAttachedMedications(e.target.value)}
                      placeholder="Active pharmaceuticals & dosages..."
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Microscope className="w-3.5 h-3.5 text-amber-600" />
                      Pertinent Lab / Imaging Results
                    </label>
                    <textarea
                      rows={2}
                      value={attachedLabResults}
                      onChange={(e) => setAttachedLabResults(e.target.value)}
                      placeholder="CBC, Chest X-ray, ECG findings..."
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Creating Specialist Endorsement...' : 'Create Formal Specialist Referral'}
                </button>
              </div>
            </form>
          ) : (
            /* PRINTABLE FORMAL REFERRAL SLIP PREVIEW */
            <div className="space-y-6">
              {/* Quick Actions toolbar */}
              <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-sky-50 border border-sky-200 rounded-xl p-3.5">
                <div className="flex items-center gap-2 text-xs text-sky-900">
                  <CheckCircle2 className="w-4 h-4 text-sky-600" />
                  <span className="font-semibold">
                    Referral Endorsement Form Generated
                  </span>
                  {createdRef && (
                    <span className="bg-sky-100 text-sky-800 font-mono px-2 py-0.5 rounded text-[11px]">
                      {createdRef.referral_number}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print Official Referral Slip
                </button>
              </div>

              {/* THE FORMAL REFERRAL SLIP (A4 Printable Document) */}
              <div
                id="printable-doctor-referral"
                className="bg-white border-2 border-slate-300 rounded-xl p-8 sm:p-12 shadow-md max-w-2xl mx-auto font-sans text-slate-800 relative overflow-hidden print:border-none print:shadow-none print:p-0 print:m-0"
              >
                {/* Header */}
                <div className="border-b-2 border-sky-800 pb-4 mb-6 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-sky-700" />
                      <h1 className="text-lg font-black tracking-wide uppercase text-sky-950">
                        MediQueue Outpatient Health Network
                      </h1>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Inter-Departmental Clinical Consultation & Endorsement Slip
                    </p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block px-3 py-1 rounded text-xs font-black uppercase tracking-wider ${
                        priority === 'STAT'
                          ? 'bg-red-600 text-white'
                          : priority === 'Urgent'
                          ? 'bg-amber-500 text-white'
                          : 'bg-sky-100 text-sky-800 border border-sky-300'
                      }`}
                    >
                      Priority: {priority}
                    </span>
                    <p className="text-[10px] font-mono text-slate-500 mt-1">
                      {createdRef?.referral_number || 'REF-2026-PENDING'}
                    </p>
                  </div>
                </div>

                {/* Patient & Endorsement Info Grid */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-2 gap-3 text-xs mb-6">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Patient Name:</span>
                    <strong className="text-slate-950 text-sm">
                      {patient ? `${patient.first_name} ${patient.last_name}` : 'Patient'}
                    </strong>
                    <p className="text-[10px] text-slate-500 font-mono">
                      ID: {patient?.patient_number} • Age: {patient?.age || 'N/A'} • Sex: {patient?.sex || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[11px] block">Referred To:</span>
                    <strong className="text-sky-900 text-sm">{receivingSpecialty}</strong>
                    <p className="text-[10px] text-slate-600">
                      {receivingDoctorName ? `Attn: ${receivingDoctorName}` : 'Attending Specialist'}
                    </p>
                    <p className="text-[10px] text-slate-500">{receivingBranch}</p>
                  </div>
                </div>

                {/* Body Content */}
                <div className="space-y-4 text-xs leading-relaxed">
                  <div>
                    <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block mb-0.5">
                      Reason for Specialist Referral:
                    </span>
                    <p className="p-3 bg-sky-50/50 border border-sky-200 rounded text-slate-900 font-semibold">
                      {reasonForReferral}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block mb-0.5">
                      Clinical Summary Transfer:
                    </span>
                    <p className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-700 whitespace-pre-wrap leading-normal">
                      {clinicalSummary}
                    </p>
                  </div>

                  {/* Vitals, Meds, Labs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {relevantVitals && (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px]">
                        <span className="font-bold text-slate-700 block mb-0.5">Latest Vitals:</span>
                        <p className="text-slate-600 font-mono">{relevantVitals}</p>
                      </div>
                    )}
                    {attachedMedications && (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px]">
                        <span className="font-bold text-slate-700 block mb-0.5">Medications:</span>
                        <p className="text-slate-600">{attachedMedications}</p>
                      </div>
                    )}
                    {attachedLabResults && (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px]">
                        <span className="font-bold text-slate-700 block mb-0.5">Lab Findings:</span>
                        <p className="text-slate-600">{attachedLabResults}</p>
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span>
                      Date Endorsed: <strong>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                    </span>
                    <span>
                      Valid until: <strong>{new Date(validUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                    </span>
                  </div>
                </div>

                {/* Footer Signature */}
                <div className="border-t-2 border-slate-200 pt-6 mt-8 flex items-end justify-between">
                  <div className="text-[10px] text-slate-500 space-y-0.5">
                    <p className="font-bold text-slate-700">Official Clinical Transfer Form</p>
                    <p>MediQueue Integrated Electronic Health Record</p>
                    <p className="font-mono text-[9px]">DOC-REF-VALIDATED</p>
                  </div>

                  <div className="text-right min-w-[200px]">
                    <div className="border-b border-slate-800 pb-1 mb-1">
                      <p className="font-bold text-sm text-slate-900">
                        {referringDoctor ? `Dr. ${referringDoctor.first_name} ${referringDoctor.last_name}` : 'Referring Physician'}
                      </p>
                      <p className="text-xs text-slate-600">
                        {referringDoctor?.specialization_name || 'General Medicine'}
                      </p>
                    </div>
                    <p className="text-[10px] font-mono text-slate-500">
                      License: {referringDoctor?.license_number || 'PRC-VERIFIED'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
