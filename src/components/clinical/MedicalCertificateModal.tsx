import React, { useState, useEffect } from 'react';
import {
  X,
  FileCheck,
  Award,
  Calendar,
  Clock,
  Printer,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Building2,
  Copy,
  Download,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  MedicalCertificate,
  MedicalCertificateType,
  Patient,
  Doctor,
  Consultation,
} from '../../types/index';

interface MedicalCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  doctor?: Doctor | null;
  consultation?: Consultation | null;
  existingCertificate?: MedicalCertificate | null;
  onSuccess?: (certificate: MedicalCertificate) => void;
}

const TEMPLATES: Record<
  MedicalCertificateType,
  {
    title: string;
    badge: string;
    defaultDiagnosis: string;
    defaultIcd10: string;
    defaultFindings: string;
    defaultRecommendations: string;
    defaultRestDays: number;
  }
> = {
  sick_leave: {
    title: 'Medical Certificate — Sick Leave & Temporary Incapacity',
    badge: 'Sick Leave',
    defaultDiagnosis: 'Acute Upper Respiratory Tract Infection (URTI)',
    defaultIcd10: 'J06.9',
    defaultFindings: 'Patient evaluated with productive cough, rhinitis, low-grade fever, and mild throat erythema. Cardiopulmonary auscultation clear. Vital signs stable.',
    defaultRecommendations: 'Advised strict home bed rest, oral hydration (>2.5 L/day), and symptomatic oral pharmacotherapy. Excuse from academic/occupational duties for 3 days.',
    defaultRestDays: 3,
  },
  fit_to_work: {
    title: 'Official Medical Certificate — Fit to Work Clearance',
    badge: 'Fit to Work',
    defaultDiagnosis: 'Resolved Acute Medical Illness / Post-Illness Evaluation',
    defaultIcd10: 'Z02.7',
    defaultFindings: 'Patient is completely asymptomatic, afebrile, and normotensive. Physical examination unremarkable. Resolution of previously diagnosed symptoms confirmed.',
    defaultRecommendations: 'Patient is certified medically and physically fit to resume full employment duties, desk operations, and regular occupational shifts without work restrictions.',
    defaultRestDays: 0,
  },
  fit_to_travel: {
    title: 'Medical Travel Clearance & Air Travel Certificate',
    badge: 'Fit to Travel',
    defaultDiagnosis: 'Normal Physical Examination — Travel Health Clearance',
    defaultIcd10: 'Z02.3',
    defaultFindings: 'Comprehensive pre-travel clinical assessment. Vital signs within normal limits. Normal cardiac rhythm, clear lungs, and no contraindications to pressurized air or sea transit.',
    defaultRecommendations: 'Certified fit for commercial passenger travel (air, maritime, and land transit). Carry maintenance medications in original labeled containers.',
    defaultRestDays: 0,
  },
  student_clearance: {
    title: 'Student Physical & Athletic Health Clearance',
    badge: 'Student Clearance',
    defaultDiagnosis: 'Normal Pediatric & Adolescent Health Assessment',
    defaultIcd10: 'Z00.129',
    defaultFindings: 'Routine academic and sports physical screening. Normal visual acuity, musculoskeletal alignment, and normal cardiac evaluation without murmurs.',
    defaultRecommendations: 'Cleared for unrestricted participation in academic classroom sessions, physical education (P.E.), and competitive school athletics.',
    defaultRestDays: 0,
  },
};

const COMMON_ICD10 = [
  { code: 'J06.9', label: 'Acute upper respiratory infection, unspecified' },
  { code: 'J20.9', label: 'Acute bronchitis, unspecified' },
  { code: 'K52.9', label: 'Noninfective gastroenteritis and colitis, unspecified' },
  { code: 'M54.5', label: 'Low back pain (Lumbago)' },
  { code: 'G43.9', label: 'Migraine, unspecified' },
  { code: 'I10', label: 'Essential (primary) hypertension' },
  { code: 'E11.9', label: 'Type 2 diabetes mellitus without complications' },
  { code: 'Z02.7', label: 'Issue of medical certificate' },
  { code: 'Z00.00', label: 'General medical examination without abnormal findings' },
];

export const MedicalCertificateModal: React.FC<MedicalCertificateModalProps> = ({
  isOpen,
  onClose,
  patient,
  doctor,
  consultation,
  existingCertificate,
  onSuccess,
}) => {
  const [certType, setCertType] = useState<MedicalCertificateType>('sick_leave');
  const [title, setTitle] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [icd10Code, setIcd10Code] = useState('J06.9');
  const [findings, setFindings] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [restDays, setRestDays] = useState(3);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [remarks, setRemarks] = useState('');

  // Doctor credentials
  const [physicianName, setPhysicianName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [prcLicense, setPrcLicense] = useState('');
  const [ptrNumber, setPtrNumber] = useState('');
  const [s2License, setS2License] = useState('');

  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCert, setCreatedCert] = useState<MedicalCertificate | null>(existingCertificate || null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Synchronize when opening or changing doctor/patient
  useEffect(() => {
    if (!isOpen) return;

    if (existingCertificate) {
      setCreatedCert(existingCertificate);
      setCertType(existingCertificate.certificate_type);
      setTitle(existingCertificate.title);
      setDiagnosis(existingCertificate.diagnosis);
      setIcd10Code(existingCertificate.icd10_code || 'Z02.7');
      setFindings(existingCertificate.findings_summary);
      setRecommendations(existingCertificate.recommendations);
      setRestDays(existingCertificate.rest_days || 0);
      setEffectiveDate(existingCertificate.effective_date);
      setExpiryDate(existingCertificate.expiry_date || '');
      setRemarks(existingCertificate.remarks || '');
      setPhysicianName(existingCertificate.physician_credentials.name);
      setSpecialization(existingCertificate.physician_credentials.specialization);
      setPrcLicense(existingCertificate.physician_credentials.prc_license);
      setPtrNumber(existingCertificate.physician_credentials.ptr_number);
      setS2License(existingCertificate.physician_credentials.s2_license || '');
      setActiveTab('preview');
      return;
    }

    const tpl = TEMPLATES[certType];
    setTitle(tpl.title);
    setDiagnosis(consultation?.diagnosis || tpl.defaultDiagnosis);
    setIcd10Code(tpl.defaultIcd10);
    setFindings(consultation?.clinical_notes || tpl.defaultFindings);
    setRecommendations(tpl.defaultRecommendations);
    setRestDays(tpl.defaultRestDays);
    setEffectiveDate(new Date().toISOString().split('T')[0]);
    setExpiryDate(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);

    if (doctor) {
      setPhysicianName(`Dr. ${doctor.first_name} ${doctor.last_name}, MD`);
      setSpecialization(doctor.specialization_name || 'General Medicine');
      setPrcLicense(doctor.license_number || 'PRC-0091244');
      setPtrNumber(doctor.ptr_number || 'PTR-8921034-MLA');
      setS2License(doctor.s2_license || 'S2-0941208-NCR');
    } else {
      setPhysicianName('Dr. Maria Lourdes Santos, MD, FPCP');
      setSpecialization('Internal Medicine');
      setPrcLicense('PRC-0089421');
      setPtrNumber('PTR-8921034-MLA');
      setS2License('S2-0941208-NCR');
    }
  }, [isOpen, existingCertificate, doctor, consultation]);

  const handleApplyTemplate = (type: MedicalCertificateType) => {
    setCertType(type);
    const tpl = TEMPLATES[type];
    setTitle(tpl.title);
    setDiagnosis(consultation?.diagnosis || tpl.defaultDiagnosis);
    setIcd10Code(tpl.defaultIcd10);
    setFindings(consultation?.clinical_notes || tpl.defaultFindings);
    setRecommendations(tpl.defaultRecommendations);
    setRestDays(tpl.defaultRestDays);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;

    setIsSubmitting(true);
    try {
      const payload: Partial<MedicalCertificate> = {
        patient_id: patient.id,
        doctor_id: doctor?.id,
        consultation_id: consultation?.id,
        certificate_type: certType,
        title,
        diagnosis,
        icd10_code: icd10Code,
        findings_summary: findings,
        recommendations,
        rest_days: Number(restDays) || 0,
        effective_date: effectiveDate,
        expiry_date: expiryDate,
        physician_credentials: {
          name: physicianName,
          specialization,
          prc_license: prcLicense,
          ptr_number: ptrNumber,
          s2_license: s2License,
        },
        remarks,
      };

      const result = await api.createMedicalCertificate(payload);
      setCreatedCert(result.certificate);
      setActiveTab('preview');
      if (onSuccess) {
        onSuccess(result.certificate);
      }
    } catch (err: any) {
      console.error('Failed to issue medical certificate:', err);
      alert(err.message || 'Failed to issue medical certificate.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Official Digital Medical Certificate Generator
              </h3>
              <p className="text-xs text-slate-500">
                Issue verifiable clinical clearance, fit-to-work, sick leave, or travel health certificates
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
                Clinical Builder
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'preview'
                    ? 'bg-white text-teal-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Official Printable Preview
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Template Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  1. Select Clinical Clearance Template:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(
                    Object.keys(TEMPLATES) as MedicalCertificateType[]
                  ).map((type) => {
                    const tpl = TEMPLATES[type];
                    const isSelected = certType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleApplyTemplate(type)}
                        className={`p-3 text-left rounded-xl border transition-all ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50/70 ring-2 ring-teal-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 mb-1">
                          {tpl.badge}
                        </span>
                        <p className="text-xs font-semibold text-slate-900 line-clamp-1">
                          {tpl.title.split('—')[1] || tpl.title}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Patient & Doctor Context Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-500">Patient: </span>
                  <span className="font-bold text-slate-800">
                    {patient ? `${patient.first_name} ${patient.last_name}` : 'No patient selected'}
                  </span>
                  <span className="text-slate-400 ml-2 font-mono">({patient?.patient_number})</span>
                </div>
                <div>
                  <span className="text-slate-500">Attending Physician: </span>
                  <span className="font-bold text-teal-800">{physicianName}</span>
                </div>
              </div>

              {/* Clinical Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  2. Clinical Evaluation & Diagnosis
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Certificate Document Title
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ICD-10 Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={icd10Code}
                        onChange={(e) => setIcd10Code(e.target.value)}
                        placeholder="e.g. J06.9"
                        className="w-28 text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      />
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            setIcd10Code(e.target.value);
                            const found = COMMON_ICD10.find((x) => x.code === e.target.value);
                            if (found && !diagnosis) setDiagnosis(found.label);
                          }
                        }}
                        className="flex-1 text-xs px-2 py-2 border border-slate-200 rounded-lg text-slate-600"
                      >
                        <option value="">Quick Presets...</option>
                        {COMMON_ICD10.map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.code} - {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Formal Clinical Diagnosis
                  </label>
                  <input
                    type="text"
                    required
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. Acute Bronchitis with Moderate Wheezing"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Physical Findings & Clinical Summary
                  </label>
                  <textarea
                    rows={2}
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="Objective clinical observations, vital signs, physical examination..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Physician Recommendations & Clearance Order
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={recommendations}
                      onChange={(e) => setRecommendations(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g. Advised strict home bed rest for 3 days..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bed Rest / Excuse Duration (Days)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={90}
                      value={restDays}
                      onChange={(e) => setRestDays(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      {restDays > 0 ? `Excuse duration: ${restDays} full day(s)` : '0 days (Fit to work / study)'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Effective Date
                    </label>
                    <input
                      type="date"
                      required
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Validity / Clearance Expiration Date
                    </label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Official Credentials Header Inputs */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>3. Physician Official Credentials Header (PRC / PTR / S2)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      PRC Medical License No.
                    </label>
                    <input
                      type="text"
                      required
                      value={prcLicense}
                      onChange={(e) => setPrcLicense(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-medium"
                      placeholder="PRC-0089421"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Professional Tax Receipt (PTR)
                    </label>
                    <input
                      type="text"
                      required
                      value={ptrNumber}
                      onChange={(e) => setPtrNumber(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-medium"
                      placeholder="PTR-8921034-MLA"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      S2 Narcotics License (Optional)
                    </label>
                    <input
                      type="text"
                      value={s2License}
                      onChange={(e) => setS2License(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-medium"
                      placeholder="S2-0941208-NCR"
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  <FileCheck className="w-4 h-4" />
                  {isSubmitting ? 'Generating Official Certificate...' : 'Issue & Verify Medical Certificate'}
                </button>
              </div>
            </form>
          ) : (
            /* PRINTABLE OFFICIAL CERTIFICATE PREVIEW */
            <div className="space-y-6">
              {/* Quick Actions toolbar (hidden during window.print) */}
              <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-teal-50 border border-teal-200 rounded-xl p-3.5">
                <div className="flex items-center gap-2 text-xs text-teal-900">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <span className="font-semibold">
                    Document Ready for Print & Online Verification
                  </span>
                  {createdCert && (
                    <span className="bg-teal-100 text-teal-800 font-mono px-2 py-0.5 rounded text-[11px]">
                      {createdCert.certificate_number}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {createdCert?.qr_verification_code && (
                    <button
                      type="button"
                      onClick={() => handleCopyCode(createdCert.qr_verification_code)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-teal-300 text-teal-800 text-xs font-medium rounded-lg hover:bg-teal-100 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedCode ? 'Copied Code!' : createdCert.qr_verification_code}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    Print Official Certificate
                  </button>
                </div>
              </div>

              {/* ACTUAL CERTIFICATE DOCUMENT (A4 Proportionate Sheet) */}
              <div
                id="printable-medical-certificate"
                className="bg-white border-2 border-slate-300 rounded-xl p-8 sm:p-12 shadow-md max-w-2xl mx-auto font-serif text-slate-800 relative overflow-hidden print:border-none print:shadow-none print:p-0 print:m-0"
              >
                {/* Official Letterhead Header */}
                <div className="text-center border-b-2 border-teal-700 pb-4 mb-6">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Building2 className="w-6 h-6 text-blue-700" />
                    <h1 className="text-xl font-black tracking-wider uppercase text-blue-950 font-sans">
                      Makati Medical Center Outpatient Health Network
                    </h1>
                  </div>
                  <p className="text-[11px] text-slate-600 font-sans tracking-wide">
                    2 Amorsolo Street, Legaspi Village, Makati City, Metro Manila, Philippines • Tel: +63 (02) 8888-8999
                  </p>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                    DOH Licensed Tertiary Medical Center & Ambulatory Services
                  </p>
                </div>

                {/* Document Title */}
                <div className="text-center my-6">
                  <h2 className="text-lg font-bold uppercase tracking-widest text-slate-900 border-b border-slate-400 inline-block pb-1">
                    Medical Certificate
                  </h2>
                  <div className="flex items-center justify-between text-[11px] font-sans text-slate-500 mt-2 px-2">
                    <span>
                      Certificate No:{' '}
                      <strong className="text-slate-800 font-mono">
                        {createdCert?.certificate_number || 'MC-2026-PREVIEW'}
                      </strong>
                    </span>
                    <span>
                      Date Issued:{' '}
                      <strong className="text-slate-800">
                        {new Date(effectiveDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Certificate Salutation & Body */}
                <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-slate-800 my-6">
                  <p className="font-semibold">TO WHOM IT MAY CONCERN:</p>
                  <p className="indent-8 text-justify">
                    This is to certify that{' '}
                    <strong className="text-slate-950 font-bold underline">
                      {patient ? `${patient.first_name} ${patient.last_name}` : 'The Patient'}
                    </strong>
                    ,{' '}
                    {patient?.age ? `${patient.age} years old` : ''} {patient?.sex ? `, ${patient.sex}` : ''},
                    residing at {patient?.address || 'Metro Manila'}, was examined and medically evaluated on{' '}
                    <strong>{new Date(effectiveDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>{' '}
                    with the following diagnosis and clinical assessment:
                  </p>

                  {/* Diagnosis & Findings Block */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg my-3 font-sans space-y-2">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-500 block font-bold">
                        Clinical Diagnosis:
                      </span>
                      <p className="text-sm font-bold text-slate-950">
                        {diagnosis}{' '}
                        {icd10Code && (
                          <span className="text-xs font-mono font-normal text-teal-800 bg-teal-100 px-2 py-0.5 rounded ml-1">
                            ICD-10: {icd10Code}
                          </span>
                        )}
                      </p>
                    </div>

                    {findings && (
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-slate-500 block font-bold">
                          Clinical Findings & Evaluation:
                        </span>
                        <p className="text-xs text-slate-700 leading-normal">{findings}</p>
                      </div>
                    )}
                  </div>

                  {/* Recommendations */}
                  <div>
                    <p className="font-bold text-slate-900 font-sans text-xs uppercase tracking-wider mb-1">
                      Physician's Recommendation & Fitness Disposition:
                    </p>
                    <p className="p-3 bg-teal-50/60 border-l-4 border-teal-600 rounded-r text-xs text-slate-800 font-sans leading-relaxed">
                      {recommendations}
                      {restDays > 0 && (
                        <span className="block mt-1 font-bold text-teal-950">
                          Total Recommended Bed Rest Duration: {restDays} day(s).
                        </span>
                      )}
                    </p>
                  </div>

                  {remarks && (
                    <p className="text-xs text-slate-500 italic">
                      Remarks: {remarks}
                    </p>
                  )}

                  <p className="text-[11px] text-slate-500 pt-2 text-justify">
                    This clearance is issued upon the request of the patient for whatever legal, school, or
                    employment requirement it may serve, excluding medico-legal proceedings.
                  </p>
                </div>

                {/* Footer Credentials & QR Code Section */}
                <div className="border-t-2 border-slate-200 pt-6 mt-8 flex flex-col sm:flex-row items-end justify-between gap-6">
                  {/* QR Code Verification Box */}
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl font-sans">
                    <div className="w-16 h-16 bg-white border border-slate-300 p-1 flex items-center justify-center rounded-lg shadow-2xs">
                      {/* Stylized QR representation */}
                      <QrCode className="w-14 h-14 text-teal-900" />
                    </div>
                    <div className="text-[10px] space-y-0.5">
                      <p className="font-bold text-slate-900 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-teal-600" /> Official DOH/PRC QR
                      </p>
                      <p className="text-slate-500 font-mono text-[9px]">
                        {createdCert?.qr_verification_code || 'VERIFY-MC-ONLINE'}
                      </p>
                      <p className="text-slate-400 text-[8px] leading-tight max-w-[150px]">
                        Scan with camera or visit makatimed.ph/verify to authenticate.
                      </p>
                    </div>
                  </div>

                  {/* Physician Signature & Official Licenses */}
                  <div className="text-right font-sans min-w-[220px]">
                    <div className="border-b border-slate-800 pb-1 mb-1">
                      <p className="font-bold text-sm text-slate-950">{physicianName}</p>
                      <p className="text-xs text-slate-600">{specialization}</p>
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono space-y-0.5">
                      <p>PRC Lic. No: <strong className="text-slate-900">{prcLicense}</strong></p>
                      <p>PTR No: <strong className="text-slate-900">{ptrNumber}</strong></p>
                      {s2License && (
                        <p>S2 Narcotics Lic: <strong className="text-slate-900">{s2License}</strong></p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Watermark */}
                <div className="absolute inset-0 pointer-events-none opacity-4 flex items-center justify-center text-slate-900 font-sans font-black text-6xl rotate-[-30deg] select-none">
                  MMC OFFICIAL DOCUMENT
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
