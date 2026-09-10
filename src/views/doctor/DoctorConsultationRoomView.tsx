import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { QueueItem, Consultation, PreConsultationTriage } from '../../types/index';
import {
  Stethoscope,
  User,
  Heart,
  AlertTriangle,
  FileText,
  Pill,
  Calendar,
  Save,
  CheckCircle2,
  Clock,
  History,
  Phone,
  Microscope,
  Activity,
  ClipboardList,
  Printer,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Send,
} from 'lucide-react';
import { VitalsTracker } from '../../components/VitalsTracker';
import { LabOrdersModal } from '../../components/LabOrdersModal';
import { DoctorStatusControl } from '../../components/DoctorStatusControl';
import { MedicalCertificateModal } from '../../components/clinical/MedicalCertificateModal';
import { DoctorReferralModal } from '../../components/clinical/DoctorReferralModal';

interface DoctorConsultationRoomViewProps {
  queueItem?: QueueItem | null;
  onNavigate: (view: string) => void;
}

export const DoctorConsultationRoomView: React.FC<DoctorConsultationRoomViewProps> = ({
  queueItem,
  onNavigate,
}) => {
  const { showToast } = useNotifications();

  const [activeQueueItem, setActiveQueueItem] = useState<QueueItem | null>(queueItem || null);
  const [patientHistory, setPatientHistory] = useState<Consultation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [triage, setTriage] = useState<PreConsultationTriage | null>(null);

  // Modals & Panels
  const [showLabModal, setShowLabModal] = useState(false);
  const [showVitalsPanel, setShowVitalsPanel] = useState(true);
  const [showRxModal, setShowRxModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);

  // Form State
  const [chiefComplaint, setChiefComplaint] = useState(
    queueItem?.appointment?.reason_for_consultation || ''
  );
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [prescription, setPrescription] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If no queue item was passed in, check if there is an in-consultation or called item today
  useEffect(() => {
    if (!activeQueueItem) {
      api.getTodayQueue().then((list) => {
        const current = list.find((q) => q.status === 'in_consultation' || q.status === 'called');
        if (current) {
          setActiveQueueItem(current);
          setChiefComplaint(current.appointment?.reason_for_consultation || '');
        }
      });
    }
  }, [activeQueueItem]);

  // Load past medical history and triage of the patient
  useEffect(() => {
    if (activeQueueItem?.patient_id) {
      api.getPatientConsultations(activeQueueItem.patient_id).then(setPatientHistory).catch(console.error);

      api.getTriage(activeQueueItem.patient_id, activeQueueItem.appointment_id)
        .then((res) => {
          if (res.triage) {
            setTriage(res.triage);
            if (!chiefComplaint && res.triage.chief_complaint) {
              setChiefComplaint(res.triage.chief_complaint);
            }
          }
        })
        .catch(console.error);
    }
  }, [activeQueueItem]);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQueueItem) return;

    if (!chiefComplaint.trim() || !diagnosis.trim()) {
      showToast('warning', 'Required Fields', 'Chief Complaint and Diagnosis are mandatory.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.completeConsultation(activeQueueItem.id, {
        chief_complaint: chiefComplaint.trim(),
        symptoms: symptoms.trim(),
        diagnosis: diagnosis.trim(),
        clinical_notes: clinicalNotes.trim(),
        prescription: prescription.trim(),
        recommendations: recommendations.trim(),
        follow_up_date: followUpDate || undefined,
      });

      showToast('success', 'Consultation Finished', `Consultation for ${activeQueueItem.patient?.first_name} completed.`);
      onNavigate('doctor-queue');
    } catch (err: any) {
      showToast('error', 'Completion Error', err.message || 'Failed to complete consultation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!activeQueueItem) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
        <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900">No Patient in Consultation Room</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Please select or call a waiting patient from your Queue Board to start their medical consultation.
        </p>
        <button
          onClick={() => onNavigate('doctor-queue')}
          className="mt-6 px-5 py-2.5 bg-teal-600 text-white text-xs font-semibold rounded-xl hover:bg-teal-700 shadow-xs transition-colors"
        >
          Go to Queue Board
        </button>
      </div>
    );
  }

  const patient = activeQueueItem.patient;
  const doctor = activeQueueItem.doctor;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Operational Status Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Consultation Room #{doctor?.room_number || '101'}</h2>
            <p className="text-xs text-slate-500">Dr. {doctor?.first_name} {doctor?.last_name} • {doctor?.specialization_name}</p>
          </div>
        </div>

        {doctor?.id && (
          <DoctorStatusControl
            doctorId={doctor.id}
            initialStatus="in_consultation"
          />
        )}
      </div>

      {/* Patient Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              {patient?.first_name?.[0]}{patient?.last_name?.[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">
                  {patient?.first_name} {patient?.last_name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200">
                  Ticket #{activeQueueItem.queue_number}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Patient ID: {patient?.patient_number} • Age: {patient?.age} • Sex: {patient?.sex} • Contact: {patient?.contact_number}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowCertModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl hover:bg-emerald-100 transition-colors shadow-2xs"
            >
              <FileCheck className="w-4 h-4 text-emerald-600" />
              Medical Certificate
            </button>

            <button
              type="button"
              onClick={() => setShowReferralModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold rounded-xl hover:bg-sky-100 transition-colors shadow-2xs"
            >
              <Send className="w-4 h-4 text-sky-600" />
              Specialist Referral
            </button>

            <button
              type="button"
              onClick={() => setShowLabModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold rounded-xl hover:bg-teal-100 transition-colors"
            >
              <Microscope className="w-4 h-4 text-teal-600" />
              Order Labs
            </button>

            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl hover:bg-slate-100 transition-colors"
            >
              <History className="w-4 h-4 text-teal-600" />
              {showHistory ? 'Hide Visits' : `Visits (${patientHistory.length})`}
            </button>
          </div>
        </div>

        {/* Clinical alerts row */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 flex items-center gap-2 text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold">Drug Allergies: </span>
              <span>{patient?.allergies || triage?.known_allergies || 'None reported'}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100 flex items-center gap-2 text-sky-800">
            <Heart className="w-4 h-4 text-sky-600 shrink-0" />
            <div>
              <span className="font-bold">Blood Type: </span>
              <span>{patient?.blood_type || 'Unspecified'}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-slate-700">
            <Phone className="w-4 h-4 text-slate-500 shrink-0" />
            <div>
              <span className="font-bold">Emergency Contact: </span>
              <span>{patient?.emergency_contact_name || 'N/A'} ({patient?.emergency_contact_phone || 'None'})</span>
            </div>
          </div>
        </div>

        {/* Pre-Consultation Triage Intake Card (if completed) */}
        {triage && (
          <div className="mt-4 p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-teal-700" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900">
                  Pre-Consultation Patient Intake (Triage)
                </h4>
              </div>
              <span className="text-[10px] text-teal-700 font-medium">
                Submitted {new Date(triage.submitted_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Patient Reported Complaint:</span>
                <span className="font-semibold text-slate-900">"{triage.chief_complaint}"</span>
              </div>
              <div>
                <span className="text-slate-500 block">Duration &amp; Pain Scale:</span>
                <span className="font-semibold text-slate-900">
                  {triage.symptoms_duration} • Pain: {triage.pain_scale}/10
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Current Medications:</span>
                <span className="font-semibold text-slate-900">{triage.current_medications}</span>
              </div>
            </div>
          </div>
        )}

        {/* Expandable Patient History */}
        {showHistory && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold uppercase text-slate-500">
              Previous Consultations &amp; Diagnoses
            </h4>
            {patientHistory.length === 0 ? (
              <p className="text-xs text-slate-400">No previous recorded visits for this patient.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {patientHistory.map((h) => (
                  <div key={h.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <div className="flex justify-between font-semibold text-slate-900">
                      <span>{h.consultation_date} — {h.diagnosis}</span>
                      <span className="text-slate-500 font-normal">Dr. {h.doctor?.last_name}</span>
                    </div>
                    <p className="text-slate-600 mt-1">Complaint: "{h.chief_complaint}"</p>
                    {h.prescription && (
                      <p className="text-teal-700 font-mono mt-0.5">Rx: {h.prescription}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vital Signs Tracker Component */}
      {patient?.id && (
        <div>
          <VitalsTracker
            patientId={patient.id}
            patientName={`${patient.first_name} ${patient.last_name}`}
            canRecord={true}
          />
        </div>
      )}

      {/* Clinical Consultation Form */}
      <form onSubmit={handleComplete} className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold text-slate-900">Clinical Consultation Notes</h3>
          </div>
          {prescription && (
            <button
              type="button"
              onClick={() => setShowRxModal(true)}
              className="text-xs font-semibold text-teal-600 hover:underline flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" /> Preview Official Prescription Slip
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chief Complaint *
            </label>
            <input
              type="text"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="e.g. Severe throbbing headache with nausea"
              required
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Clinical Diagnosis *
            </label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Acute Migraine without Aura"
              required
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Symptoms &amp; Clinical Findings
          </label>
          <textarea
            rows={2}
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="e.g. BP 120/80, temp 37.1C, photophobia present, neck supple..."
            className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Clinical Notes &amp; Observations
          </label>
          <textarea
            rows={3}
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
            placeholder="Detailed assessment notes, patient history, physical exam results..."
            className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Pill className="w-4 h-4 text-teal-600" />
              Prescriptions &amp; Dosage Instructions (Rx)
            </label>
            <span className="text-[11px] text-slate-400">Printed onto official prescription slip</span>
          </div>
          <textarea
            rows={3}
            value={prescription}
            onChange={(e) => setPrescription(e.target.value)}
            placeholder="e.g. Paracetamol 500mg tab — 1 tab every 6 hours as needed for pain&#10;Sumatriptan 50mg tab — 1 tab at onset of migraine"
            className="w-full p-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-slate-50/50"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Recommendations &amp; Home Care
            </label>
            <input
              type="text"
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              placeholder="e.g. Rest in dark quiet room, stay hydrated, avoid caffeine"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Scheduled Follow-Up Date (Optional)
            </label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('doctor-queue')}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancel / Back to Queue
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? 'Finalizing...' : 'Complete Consultation & Release Patient'}
          </button>
        </div>
      </form>

      {/* Lab Orders Modal */}
      {showLabModal && patient?.id && (
        <LabOrdersModal
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          doctorId={doctor?.id || 'doc_01'}
          doctorName={`Dr. ${doctor?.first_name} ${doctor?.last_name}`}
          onClose={() => setShowLabModal(false)}
        />
      )}

      {/* Official Prescription Slip Modal */}
      {showRxModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-slate-800 font-sans print:border-none">
              {/* Doctor Header */}
              <div className="text-center pb-4 border-b border-slate-300">
                <h3 className="text-lg font-bold text-slate-900">
                  DR. {doctor?.first_name?.toUpperCase()} {doctor?.last_name?.toUpperCase()}, M.D.
                </h3>
                <p className="text-xs font-medium text-teal-700">{doctor?.specialization_name}</p>
                <p className="text-[10px] text-slate-500">
                  PRC License No: {doctor?.license_number || '0098412'} • PTR No: 8819201A
                </p>
                <p className="text-[10px] text-slate-400">MediQueue Outpatient Clinic • Room #{doctor?.room_number || '101'}</p>
              </div>

              {/* Patient Info */}
              <div className="grid grid-cols-2 gap-3 my-4 text-xs">
                <div>
                  <span className="text-slate-500">Patient: </span>
                  <strong className="text-slate-900">{patient?.first_name} {patient?.last_name}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Date: </span>
                  <span className="font-medium text-slate-800">
                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Age / Sex: </span>
                  <span className="font-medium text-slate-800">{patient?.age} yrs / {patient?.sex}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Patient #: </span>
                  <span className="font-mono text-slate-800">{patient?.patient_number}</span>
                </div>
              </div>

              {/* Big Rx Symbol */}
              <div className="my-4">
                <span className="text-4xl font-serif font-black text-teal-900 block mb-2">℞</span>
                <div className="p-4 bg-white rounded-xl border border-slate-200 font-mono text-xs whitespace-pre-line leading-relaxed text-slate-800 min-h-32">
                  {prescription || 'No medications prescribed.'}
                </div>
              </div>

              {/* Recommendations */}
              {recommendations && (
                <div className="text-xs bg-white p-3 rounded-xl border border-slate-200 mb-4">
                  <span className="text-slate-500 font-bold block mb-0.5">Instructions &amp; Lifestyle:</span>
                  <span className="text-slate-800">{recommendations}</span>
                </div>
              )}

              {/* Doctor Signature */}
              <div className="pt-6 mt-6 border-t border-slate-300 flex items-end justify-between text-xs">
                <div className="text-[10px] text-slate-400">
                  Electronic Signature Validated
                  <br />
                  MediQueue Clinical System
                </div>
                <div className="text-center w-48">
                  <div className="border-b border-slate-400 pb-1 font-bold text-slate-900">
                    Dr. {doctor?.first_name} {doctor?.last_name}, MD
                  </div>
                  <span className="text-[10px] text-slate-500">Attending Physician</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Prescription
              </button>
              <button
                onClick={() => setShowRxModal(false)}
                className="px-5 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Digital Medical Certificate Generator Modal */}
      <MedicalCertificateModal
        isOpen={showCertModal}
        onClose={() => setShowCertModal(false)}
        patient={patient || null}
        doctor={doctor || null}
        consultation={
          activeQueueItem
            ? ({
                id: activeQueueItem.id,
                diagnosis: diagnosis || 'Clinical Assessment',
                clinical_notes: clinicalNotes || symptoms,
              } as any)
            : null
        }
        onSuccess={(cert) => {
          showToast(`Medical Certificate #${cert.certificate_number} successfully issued!`, 'success');
        }}
      />

      {/* Formal Specialist Referral Slip Modal */}
      <DoctorReferralModal
        isOpen={showReferralModal}
        onClose={() => setShowReferralModal(false)}
        patient={patient || null}
        referringDoctor={doctor || null}
        consultation={
          activeQueueItem
            ? ({
                id: activeQueueItem.id,
                diagnosis: diagnosis || 'Outpatient Consultation',
                clinical_notes: clinicalNotes || symptoms,
                prescription: prescription,
              } as any)
            : null
        }
        onSuccess={(ref) => {
          showToast(`Specialist referral #${ref.referral_number} successfully created!`, 'success');
        }}
      />
    </div>
  );
};
