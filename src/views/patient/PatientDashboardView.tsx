import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { Appointment, Consultation, LabOrder, BillingInvoice, PreConsultationTriage } from '../../types/index';
import { LiveQueueCard } from '../../components/patient/LiveQueueCard';
import { StatusBadge } from '../../components/common/Badge';
import { VitalsTracker } from '../../components/VitalsTracker';
import { TriageModal } from '../../components/TriageModal';
import {
  Calendar,
  Clock,
  FileText,
  User,
  PlusCircle,
  Stethoscope,
  ChevronRight,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ClipboardList,
  Activity,
  Microscope,
  Receipt,
  Printer,
  ChevronDown,
  ChevronUp,
  Tv,
  AlertTriangle,
} from 'lucide-react';

interface PatientDashboardViewProps {
  onNavigate: (view: string) => void;
}

export const PatientDashboardView: React.FC<PatientDashboardViewProps> = ({ onNavigate }) => {
  const { user, patient } = useAuth();
  const { showToast } = useNotifications();

  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [recentConsultations, setRecentConsultations] = useState<Consultation[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [triage, setTriage] = useState<PreConsultationTriage | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState<string | null>(null);

  // Modals & Panels
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [showVitalsTracker, setShowVitalsTracker] = useState(true);
  const [selectedLabSlip, setSelectedLabSlip] = useState<LabOrder | null>(null);

  const loadDashboardData = async () => {
    try {
      const [apts, consults] = await Promise.all([
        api.getAppointments({ status: 'confirmed' }),
        api.getConsultations(),
      ]);

      const sortedApts = apts.sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));
      setUpcomingAppointments(sortedApts);
      setRecentConsultations(consults.slice(0, 3));

      if (patient?.id) {
        const [labsRes, invRes, triageRes] = await Promise.all([
          api.getLabOrders({ patientId: patient.id }),
          api.getInvoices({ patientId: patient.id }),
          api.getTriage(patient.id),
        ]);
        setLabOrders(labsRes.orders || []);
        setInvoices(invRes.invoices || []);
        setTriage(triageRes.triage);
      }
    } catch (err) {
      console.error('Error loading patient dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [patient?.id]);

  const todayStr = new Date().toISOString().split('T')[0];
  const nextAppointment = upcomingAppointments[0];
  const isTodayAppt = nextAppointment && nextAppointment.appointment_date === todayStr;

  const handleSelfCheckIn = async (aptId: string) => {
    setIsCheckingIn(aptId);
    try {
      const res = await api.checkIn({ appointment_id: aptId });
      showToast('success', 'Checked In!', res.message);
      await loadDashboardData();
      onNavigate('patient-queue');
    } catch (err: any) {
      showToast('error', 'Check-in Failed', err.message || 'Unable to check in.');
    } finally {
      setIsCheckingIn(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-teal-600 rounded-3xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-xs">
                Patient Portal
              </span>
              <span className="text-xs text-teal-100 font-mono">
                {patient?.patient_number || 'PT-2026-0001'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Mabuhay, {patient?.first_name || 'Patient'}!
            </h1>
            <p className="text-xs sm:text-sm text-teal-100 mt-1 max-w-xl">
              Manage your clinic visits, track your real-time queue ticket, view lab orders, and monitor your vitals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('tv-display')}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-teal-300 font-semibold text-xs border border-teal-500/30 transition-all"
            >
              <Tv className="w-4 h-4 text-teal-400" />
              Lobby TV Display
            </button>
            <button
              onClick={() => onNavigate('patient-book')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-teal-900 font-semibold text-xs shadow-md hover:bg-teal-50 transition-all transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-teal-700" />
              Book Appointment
            </button>
          </div>
        </div>
      </div>
      
      {/* Clinical Alerts / Allergy Banner */}
      {patient?.allergies && (
        <div className="p-4 bg-rose-600 rounded-3xl flex items-center gap-4 text-white shadow-lg border border-rose-400">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-[10px] font-black uppercase tracking-widest opacity-90">Critical Clinical Alert: Known Allergies</h3>
            <p className="text-xl font-black">{patient.allergies}</p>
          </div>
          <div className="hidden sm:block px-3 py-1.5 bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-tighter border border-white/30">
            Vital Medical Information
          </div>
        </div>
      )}

      {/* Pre-Consultation Triage Banner */}
      <div className="bg-white rounded-3xl border border-teal-100 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Pre-Consultation Clinical Intake (Triage)
              </h3>
              {triage ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Completed
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Pending Intake
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {triage
                ? `Chief complaint logged: "${triage.chief_complaint}" (Pain: ${triage.pain_scale}/10). You can update this prior to calling.`
                : 'Help your doctor prepare your diagnosis by submitting your symptoms and pain scale in advance.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowTriageModal(true)}
          className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          {triage ? 'Edit My Symptoms' : 'Complete Triage Intake'}
        </button>
      </div>

      {/* Live Digital Queue Widget */}
      <LiveQueueCard onNavigateToQueue={() => onNavigate('patient-queue')} />

      {/* Next Upcoming Appointment Card */}
      {nextAppointment && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              <h3 className="text-base font-bold text-slate-900">Next Scheduled Appointment</h3>
            </div>
            <StatusBadge status={nextAppointment.status} type="appointment" />
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-teal-700">
                  {nextAppointment.reference_number}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(nextAppointment.appointment_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                Dr. {nextAppointment.doctor?.first_name} {nextAppointment.doctor?.last_name}
              </h4>
              <div className="flex items-center gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Room {nextAppointment.doctor?.room_number || '101'}
                </span>
                <span className="italic text-slate-500">
                  "{nextAppointment.reason_for_consultation}"
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              {isTodayAppt && nextAppointment.status === 'confirmed' ? (
                <button
                  onClick={() => handleSelfCheckIn(nextAppointment.id)}
                  disabled={isCheckingIn === nextAppointment.id}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-700 shadow-sm transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isCheckingIn === nextAppointment.id ? 'Checking in...' : 'Self Check-in for Today'}
                </button>
              ) : (
                <button
                  onClick={() => onNavigate('patient-appointments')}
                  className="w-full md:w-auto text-xs font-semibold text-teal-700 hover:text-teal-900 border border-teal-200 bg-white px-4 py-2 rounded-xl hover:bg-teal-50"
                >
                  View Details
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vital Signs & Health Progression Tracker */}
      {patient?.id && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-600" />
              My Continuous Health &amp; Vital Signs History
            </h3>
            <button
              onClick={() => setShowVitalsTracker(!showVitalsTracker)}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              {showVitalsTracker ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showVitalsTracker ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {showVitalsTracker && (
            <VitalsTracker
              patientId={patient.id}
              patientName={`${patient.first_name} ${patient.last_name}`}
              canRecord={true}
            />
          )}
        </div>
      )}

      {/* Diagnostic Lab Orders & Official Requisitions */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Microscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Diagnostic &amp; Laboratory Requisitions</h3>
              <p className="text-xs text-slate-500">Official lab test orders prescribed by your attending physicians</p>
            </div>
          </div>
        </div>

        {labOrders.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No diagnostic tests currently ordered. Test requests issued by your doctor will appear here.
          </div>
        ) : (
          <div className="space-y-3">
            {labOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-xs text-slate-900">{order.order_number}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        order.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.status === 'sample_collected'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {order.status.replace('_', ' ')}
                    </span>
                    {order.fasting_required && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        10-12h Fasting Required
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-slate-800 mt-1">
                    {order.tests.map((t) => t.test_name).join(', ')}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Dr. {order.doctor?.last_name || 'Physician'} • Ordered on{' '}
                    {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedLabSlip(order)}
                  className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Requisition Slip
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Action Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigate('patient-book')}
          className="p-5 rounded-3xl bg-white border border-slate-200/80 hover:border-teal-300 hover:shadow-md transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 group-hover:text-teal-700">
            Book Appointment
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Choose doctor, date, and reserved time slot.
          </p>
        </button>

        <button
          onClick={() => onNavigate('patient-appointments')}
          className="p-5 rounded-3xl bg-white border border-slate-200/80 hover:border-teal-300 hover:shadow-md transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 group-hover:text-sky-700">
            My Appointments
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            View status, cancel, or reschedule bookings.
          </p>
        </button>

        <button
          onClick={() => onNavigate('patient-queue')}
          className="p-5 rounded-3xl bg-white border border-slate-200/80 hover:border-teal-300 hover:shadow-md transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700">
            Live Queue Board
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Monitor real-time waiting list &amp; audio chime.
          </p>
        </button>

        <button
          onClick={() => onNavigate('patient-consultations')}
          className="p-5 rounded-3xl bg-white border border-slate-200/80 hover:border-teal-300 hover:shadow-md transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">
            Medical History &amp; Rx
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Review past diagnosis &amp; medical prescriptions.
          </p>
        </button>
      </div>

      {/* Printable Lab Requisition Slip Modal */}
      {selectedLabSlip && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-slate-800 font-sans print:border-none">
              <div className="text-center pb-4 border-b border-slate-300">
                <h3 className="text-lg font-bold text-slate-900">MEDIQUEUE DIAGNOSTIC LABORATORY</h3>
                <p className="text-xs text-slate-500">Official Patient Requisition Slip</p>
              </div>

              <div className="grid grid-cols-2 gap-3 my-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Requisition #:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedLabSlip.order_number}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Date:</span>
                  <span className="font-medium text-slate-800">
                    {new Date(selectedLabSlip.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Patient Name:</span>
                  <span className="font-bold text-slate-900">{patient?.first_name} {patient?.last_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Doctor:</span>
                  <span className="font-bold text-slate-900">Dr. {selectedLabSlip.doctor?.last_name}</span>
                </div>
              </div>

              {selectedLabSlip.fasting_required && (
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-900 text-xs font-semibold mb-3">
                  ⚠️ Fasting Notice: Please fast for 10-12 hours prior to venous specimen draw. Water is permitted.
                </div>
              )}

              <table className="w-full text-left text-xs mb-4">
                <thead className="border-b border-slate-300 text-slate-600 font-bold uppercase">
                  <tr>
                    <th className="py-2">Test Name</th>
                    <th className="py-2">Category</th>
                    <th className="py-2 text-right">Estimated Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedLabSlip.tests.map((t) => (
                    <tr key={t.id}>
                      <td className="py-2 font-medium text-slate-800">{t.test_name}</td>
                      <td className="py-2 text-slate-500">{t.category}</td>
                      <td className="py-2 text-right font-mono text-slate-700">₱{t.standard_price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-4 border-t border-slate-300 flex items-end justify-between text-xs">
                <div className="text-[10px] text-slate-400">Present this form at the clinic laboratory reception.</div>
                <div className="text-center w-36">
                  <div className="border-b border-slate-400 pb-1 font-bold text-slate-800">
                    Dr. {selectedLabSlip.doctor?.last_name}, M.D.
                  </div>
                  <span className="text-[10px] text-slate-500">Authorized Physician</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Requisition
              </button>
              <button
                onClick={() => setSelectedLabSlip(null)}
                className="px-5 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Triage Intake Modal */}
      {showTriageModal && patient && (
        <TriageModal
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          existingTriage={triage}
          onClose={() => setShowTriageModal(false)}
          onSaved={(newTriage) => {
            setTriage(newTriage);
            showToast('success', 'Intake Saved', 'Your symptoms have been sent to your physician.');
          }}
        />
      )}
    </div>
  );
};
