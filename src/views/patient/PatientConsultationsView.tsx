import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Consultation, MedicalCertificate, DoctorReferral } from '../../types/index';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { CertificateVerificationModal } from '../../components/clinical/CertificateVerificationModal';
import {
  FileText,
  Stethoscope,
  Calendar,
  Pill,
  Printer,
  ChevronRight,
  ClipboardList,
  Award,
  QrCode,
  Share2,
  ShieldCheck,
  Building2,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Search,
} from 'lucide-react';

export const PatientConsultationsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'consultations' | 'certificates' | 'referrals'>('consultations');
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [certificates, setCertificates] = useState<MedicalCertificate[]>([]);
  const [referrals, setReferrals] = useState<DoctorReferral[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected detail modals
  const [selectedRecord, setSelectedRecord] = useState<Consultation | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<MedicalCertificate | null>(null);
  const [selectedReferral, setSelectedReferral] = useState<DoctorReferral | null>(null);

  // Verification modal
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyCodeToPass, setVerifyCodeToPass] = useState('');

  useEffect(() => {
    async function loadAllData() {
      try {
        setIsLoading(true);
        const [consRes, certRes, refRes] = await Promise.all([
          api.getConsultations().catch(() => []),
          api.getMedicalCertificates().then((r) => r.certificates).catch(() => []),
          api.getDoctorReferrals().then((r) => r.referrals).catch(() => []),
        ]);
        setConsultations(consRes || []);
        setCertificates(certRes || []);
        setReferrals(refRes || []);
      } catch (err) {
        console.error('Failed to load patient records:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAllData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const openVerifyWithCode = (code: string) => {
    setVerifyCodeToPass(code);
    setVerifyModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Medical Records &amp; Clinical Documents</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Access your consultation notes, official fit-to-work clearances, verifiable medical certificates, and specialist referrals.
          </p>
        </div>
        <button
          onClick={() => {
            setVerifyCodeToPass('');
            setVerifyModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-800 rounded-xl text-xs font-bold shadow-2xs transition-colors self-start md:self-auto"
        >
          <QrCode className="w-4 h-4 text-blue-600" />
          Verify Certificate Authenticity
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-2xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('consultations')}
          className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'consultations'
              ? 'border-blue-700 text-blue-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          Consultations ({consultations.length})
        </button>
        <button
          onClick={() => setActiveTab('certificates')}
          className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'certificates'
              ? 'border-blue-700 text-blue-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          Medical Certificates &amp; Clearances ({certificates.length})
        </button>
        <button
          onClick={() => setActiveTab('referrals')}
          className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'referrals'
              ? 'border-blue-700 text-blue-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Share2 className="w-4 h-4" />
          Specialist Referrals ({referrals.length})
        </button>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
          Loading clinical records...
        </div>
      ) : (
        <>
          {/* TAB 1: CONSULTATIONS */}
          {activeTab === 'consultations' && (
            <div>
              {consultations.length === 0 ? (
                <EmptyState
                  title="No Medical Records"
                  description="You do not have any recorded medical consultations yet. Completed doctor visits will appear here."
                  icon={ClipboardList}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {consultations.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-teal-300 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(c.consultation_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                            {c.appointment?.reference_number || 'Walk-in'}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                            <Stethoscope className="w-4 h-4 text-teal-600" />
                            <span className="font-bold text-slate-900">
                              Dr. {c.doctor?.first_name} {c.doctor?.last_name}
                            </span>
                            <span className="text-slate-400">({c.doctor?.specialization_name})</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mt-2">{c.diagnosis}</h4>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            Complaint: "{c.chief_complaint}"
                          </p>
                        </div>

                        {c.prescription && (
                          <div className="p-2.5 bg-teal-50/70 border border-teal-100 rounded-xl text-xs text-teal-900">
                            <div className="flex items-center gap-1 font-bold text-teal-800 mb-1">
                              <Pill className="w-3.5 h-3.5 text-teal-600" />
                              Prescription (Rx)
                            </div>
                            <p className="font-mono text-[11px] leading-relaxed line-clamp-2">
                              {c.prescription}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        {c.follow_up_date ? (
                          <span className="text-[11px] text-amber-700 font-medium">
                            Follow-up: {c.follow_up_date}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">No follow-up required</span>
                        )}
                        <button
                          onClick={() => setSelectedRecord(c)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                        >
                          View Full Record <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MEDICAL CERTIFICATES */}
          {activeTab === 'certificates' && (
            <div>
              {certificates.length === 0 ? (
                <EmptyState
                  title="No Medical Certificates Issued"
                  description="When your attending doctor issues an official clearance or fit-to-work certificate, it will appear here with an online verification QR code."
                  icon={Award}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-teal-300 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-100 text-teal-800">
                            {cert.certificate_type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            Issued: {cert.effective_date}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                            <Stethoscope className="w-4 h-4 text-teal-600" />
                            <span className="font-bold text-slate-900">
                              Dr. {cert.physician_credentials?.name || `${cert.doctor?.first_name} ${cert.doctor?.last_name}`}
                            </span>
                            <span className="text-slate-400">
                              ({cert.physician_credentials?.specialization || cert.doctor?.specialization_name})
                            </span>
                          </div>

                          <div className="mt-2 text-xs">
                            <span className="font-semibold text-slate-500">Diagnosis: </span>
                            <span className="font-bold text-slate-800">
                              {cert.diagnosis} {cert.icd10_code ? `(${cert.icd10_code})` : ''}
                            </span>
                          </div>

                          <p className="mt-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <strong className="text-slate-700">Recommendation: </strong>
                            {cert.recommendations}
                            {cert.rest_days ? ` • ${cert.rest_days} day(s) rest period` : ''}
                          </p>
                        </div>

                        {/* QR Code Verification badge */}
                        <div className="flex items-center justify-between p-2.5 bg-teal-50/60 border border-teal-200/70 rounded-xl text-xs">
                          <div className="flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-teal-600" />
                            <div>
                              <div className="text-[10px] text-slate-500 font-medium">Verification Code</div>
                              <div className="font-mono font-bold text-teal-900 text-xs">
                                {cert.qr_verification_code}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => openVerifyWithCode(cert.qr_verification_code)}
                            className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline"
                          >
                            Verify Online
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono">
                          PRC #{cert.physician_credentials?.prc_license || cert.doctor?.license_number}
                        </span>
                        <button
                          onClick={() => setSelectedCertificate(cert)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900"
                        >
                          View &amp; Print Certificate <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SPECIALIST REFERRALS */}
          {activeTab === 'referrals' && (
            <div>
              {referrals.length === 0 ? (
                <EmptyState
                  title="No Specialist Referrals"
                  description="When a physician endorses you to a specialist (e.g. Cardiology, Orthopedics, ENT), the formal referral letter with your clinical summary will be accessible here."
                  icon={Share2}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {referrals.map((ref) => (
                    <div
                      key={ref.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-teal-300 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              ref.priority === 'Emergency' || ref.priority === 'STAT'
                                ? 'bg-rose-100 text-rose-800'
                                : ref.priority === 'Urgent'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {ref.priority} Priority
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            {ref.referral_number}
                          </span>
                        </div>

                        <div>
                          <div className="text-xs text-slate-500">Endorsed to:</div>
                          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                            <Building2 className="w-4 h-4 text-teal-600" />
                            {ref.receiving_specialty}
                            {ref.receiving_doctor_name ? ` (${ref.receiving_doctor_name})` : ''}
                          </h4>
                          {ref.receiving_clinic_branch && (
                            <p className="text-xs text-slate-500">{ref.receiving_clinic_branch}</p>
                          )}
                        </div>

                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                          <div className="font-semibold text-slate-700">
                            <strong>Reason: </strong> {ref.reason_for_referral}
                          </div>
                          <div className="text-slate-600 line-clamp-2">
                            <strong>Clinical Context: </strong> {ref.clinical_summary}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                          <span>
                            From: Dr. {ref.referring_doctor?.first_name} {ref.referring_doctor?.last_name}
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-700">
                            Valid until: {ref.valid_until}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                        <button
                          onClick={() => setSelectedReferral(ref)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900"
                        >
                          View Referral Letter <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL 1: Full Consultation Record Modal */}
      <Modal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title="Consultation Summary Record"
        subtitle={`Date: ${selectedRecord?.consultation_date}`}
        maxWidth="2xl"
      >
        {selectedRecord && (
          <div className="space-y-5">
            {/* Doctor & Patient Info Header */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-500 uppercase font-medium">Attending Physician</span>
                <p className="font-bold text-slate-900 text-sm">
                  Dr. {selectedRecord.doctor?.first_name} {selectedRecord.doctor?.last_name},{' '}
                  {selectedRecord.doctor?.specialization_name}
                </p>
                <p className="text-slate-500">License No: {selectedRecord.doctor?.license_number}</p>
              </div>
              <div className="sm:text-right">
                <span className="text-slate-500 uppercase font-medium">Patient</span>
                <p className="font-bold text-slate-900 text-sm">
                  {selectedRecord.patient?.first_name} {selectedRecord.patient?.last_name}
                </p>
                <p className="text-slate-500">ID: {selectedRecord.patient?.patient_number}</p>
              </div>
            </div>

            {/* Clinical Findings */}
            <div className="space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase">Chief Complaint</span>
                <p className="text-sm text-slate-800 mt-0.5">{selectedRecord.chief_complaint}</p>
              </div>

              {selectedRecord.symptoms && (
                <div>
                  <span className="text-xs font-bold text-slate-700 uppercase">Symptoms Observed</span>
                  <p className="text-sm text-slate-800 mt-0.5">{selectedRecord.symptoms}</p>
                </div>
              )}

              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
                <span className="text-xs font-bold text-teal-900 uppercase">Clinical Diagnosis</span>
                <p className="text-sm font-bold text-teal-950 mt-0.5">{selectedRecord.diagnosis}</p>
              </div>

              {selectedRecord.clinical_notes && (
                <div>
                  <span className="text-xs font-bold text-slate-700 uppercase">Physician's Notes</span>
                  <p className="text-sm text-slate-800 mt-0.5 whitespace-pre-wrap">
                    {selectedRecord.clinical_notes}
                  </p>
                </div>
              )}

              {selectedRecord.prescription && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-teal-600" />
                    Prescriptions &amp; Dosage Instructions (Rx)
                  </span>
                  <p className="text-xs font-mono text-slate-900 mt-2 whitespace-pre-wrap leading-relaxed">
                    {selectedRecord.prescription}
                  </p>
                </div>
              )}

              {selectedRecord.recommendations && (
                <div>
                  <span className="text-xs font-bold text-slate-700 uppercase">Recommendations</span>
                  <p className="text-sm text-slate-800 mt-0.5">{selectedRecord.recommendations}</p>
                </div>
              )}

              {selectedRecord.follow_up_date && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                  <span className="font-bold">Next Follow-Up Date: </span>
                  {selectedRecord.follow_up_date}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50"
              >
                <Printer className="w-4 h-4" /> Print Summary
              </button>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: Official Medical Certificate Preview Modal */}
      <Modal
        isOpen={!!selectedCertificate}
        onClose={() => setSelectedCertificate(null)}
        title="Official Medical Certificate"
        subtitle={`Verification Ref: ${selectedCertificate?.qr_verification_code}`}
        maxWidth="2xl"
      >
        {selectedCertificate && (
          <div className="space-y-6">
            {/* Letterhead & Watermark Preview Container */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-slate-200 shadow-sm relative overflow-hidden font-serif">
              {/* Header Letterhead */}
              <div className="text-center pb-4 border-b-2 border-blue-900 mb-6 font-sans">
                <h3 className="text-lg font-black tracking-wide text-blue-950 uppercase">
                  Makati Medical Center
                </h3>
                <p className="text-xs text-slate-600">Department of Clinical Medicine &amp; Diagnostic Services</p>
                <p className="text-[11px] text-slate-500">Republic of the Philippines • PRC Regulated Practice</p>
              </div>

              {/* Title */}
              <div className="text-center my-5">
                <h2 className="text-xl font-bold uppercase tracking-widest text-slate-900 underline decoration-blue-600 decoration-2 underline-offset-8">
                  Medical Certificate
                </h2>
                <span className="inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-sans font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase">
                  {selectedCertificate.certificate_type.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Date */}
              <div className="text-right text-xs font-sans text-slate-600 mb-6">
                <strong>Date Issued:</strong> {selectedCertificate.effective_date}
              </div>

              {/* Salutation & Body */}
              <div className="text-sm leading-relaxed text-slate-800 space-y-4 font-sans">
                <p className="font-semibold text-slate-900">TO WHOM IT MAY CONCERN:</p>
                <p>
                  This is to certify that{' '}
                  <strong className="text-slate-950 underline">
                    {selectedCertificate.patient?.first_name} {selectedCertificate.patient?.last_name}
                  </strong>
                  , of legal age, was medically evaluated and attended at this facility on{' '}
                  <strong>{selectedCertificate.effective_date}</strong>.
                </p>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 my-3 space-y-1 text-xs">
                  <div>
                    <span className="font-bold text-slate-700">Diagnosis: </span>
                    <span className="font-bold text-slate-900">
                      {selectedCertificate.diagnosis}
                      {selectedCertificate.icd10_code ? ` (ICD-10: ${selectedCertificate.icd10_code})` : ''}
                    </span>
                  </div>
                  {selectedCertificate.findings_summary && (
                    <div className="text-slate-600">
                      <span className="font-bold text-slate-700">Clinical Findings: </span>
                      {selectedCertificate.findings_summary}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 text-xs">
                  <span className="font-bold text-teal-950 uppercase block mb-1">Recommendation &amp; Fitness</span>
                  <p className="text-teal-900 font-medium">{selectedCertificate.recommendations}</p>
                </div>

                {selectedCertificate.remarks && (
                  <p className="text-xs text-slate-500 italic">Remarks: {selectedCertificate.remarks}</p>
                )}
              </div>

              {/* Footer Credentials & QR verification */}
              <div className="mt-8 pt-6 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 font-sans">
                {/* QR Code */}
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="w-16 h-16 bg-white p-1 rounded-lg border border-slate-200 flex items-center justify-center">
                    <QrCode className="w-14 h-14 text-slate-900" />
                  </div>
                  <div className="text-[10px] text-slate-600 space-y-0.5">
                    <span className="font-bold text-slate-900 block">Scan to Verify Authenticity</span>
                    <span className="font-mono text-teal-800 font-bold block">
                      {selectedCertificate.qr_verification_code}
                    </span>
                    <span className="text-[9px] text-slate-400 block">Tamper-evident medical clearance</span>
                  </div>
                </div>

                {/* Doctor Signature Block */}
                <div className="text-center sm:text-right min-w-[200px]">
                  <div className="font-serif italic text-base text-teal-950 font-bold mb-1">
                    Dr. {selectedCertificate.physician_credentials?.name || `${selectedCertificate.doctor?.first_name} ${selectedCertificate.doctor?.last_name}`}
                  </div>
                  <div className="border-t border-slate-400 pt-1 text-[11px] font-semibold text-slate-800">
                    Attending Physician
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono space-y-0.5 mt-0.5">
                    <div>PRC Lic. No: {selectedCertificate.physician_credentials?.prc_license}</div>
                    <div>PTR No: {selectedCertificate.physician_credentials?.ptr_number}</div>
                    {selectedCertificate.physician_credentials?.s2_license && (
                      <div>S2 Narcotic Lic: {selectedCertificate.physician_credentials.s2_license}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                <Printer className="w-4 h-4" /> Print Official Certificate
              </button>
              <button
                onClick={() => setSelectedCertificate(null)}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: Specialist Referral Slip Preview Modal */}
      <Modal
        isOpen={!!selectedReferral}
        onClose={() => setSelectedReferral(null)}
        title="Inter-Departmental Referral Slip"
        subtitle={`Referral #: ${selectedReferral?.referral_number}`}
        maxWidth="2xl"
      >
        {selectedReferral && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs font-sans">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Clinical Specialist Referral</h3>
                  <p className="text-slate-500">Official Clinical Summary &amp; Patient Endorsement</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full font-bold uppercase text-[10px] ${
                    selectedReferral.priority === 'Emergency' || selectedReferral.priority === 'STAT'
                      ? 'bg-rose-100 text-rose-800'
                      : selectedReferral.priority === 'Urgent'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {selectedReferral.priority} Priority
                </span>
              </div>

              {/* Endorsement Details */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-slate-500 block">Referring Physician</span>
                  <span className="font-bold text-slate-900 text-sm block">
                    Dr. {selectedReferral.referring_doctor?.first_name} {selectedReferral.referring_doctor?.last_name}
                  </span>
                  <span className="text-slate-500">
                    {selectedReferral.referring_doctor?.specialization_name} (Lic #{selectedReferral.referring_doctor?.license_number})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Referred Specialist / Department</span>
                  <span className="font-bold text-teal-800 text-sm block">
                    {selectedReferral.receiving_specialty}
                  </span>
                  <span className="text-slate-600 block">
                    {selectedReferral.receiving_doctor_name || 'Department Clinic Specialist on Duty'}
                  </span>
                  {selectedReferral.receiving_clinic_branch && (
                    <span className="text-slate-400 block">{selectedReferral.receiving_clinic_branch}</span>
                  )}
                </div>
              </div>

              {/* Reason */}
              <div>
                <span className="font-bold text-slate-800 block mb-1">Reason for Referral</span>
                <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800">
                  {selectedReferral.reason_for_referral}
                </p>
              </div>

              {/* Clinical Summary */}
              <div>
                <span className="font-bold text-slate-800 block mb-1">Transferred Clinical Summary</span>
                <p className="p-3 bg-teal-50/50 rounded-xl border border-teal-200 text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {selectedReferral.clinical_summary}
                </p>
              </div>

              {/* Attached History */}
              {(selectedReferral.relevant_vitals || selectedReferral.attached_medications) && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {selectedReferral.relevant_vitals && (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-700 block mb-0.5">Pertinent Vitals:</span>
                      <span className="font-mono text-slate-800">{selectedReferral.relevant_vitals}</span>
                    </div>
                  )}
                  {selectedReferral.attached_medications && (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-700 block mb-0.5">Active Medications:</span>
                      <span className="font-mono text-slate-800">{selectedReferral.attached_medications}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-3 border-t text-right text-slate-500">
                Endorsement valid until: <strong>{selectedReferral.valid_until}</strong>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                <Printer className="w-4 h-4" /> Print Referral Slip
              </button>
              <button
                onClick={() => setSelectedReferral(null)}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 4: Public/Patient QR Certificate Verification Modal */}
      <CertificateVerificationModal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        initialCode={verifyCodeToPass}
      />
    </div>
  );
};
