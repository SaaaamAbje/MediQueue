import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Appointment, QueueItem } from '../../types/index';
import { StatusBadge } from '../../components/common/Badge';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  Stethoscope,
  Volume2,
  ArrowRight,
  AlertCircle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { DoctorStatusControl } from '../../components/DoctorStatusControl';

interface DoctorDashboardViewProps {
  onNavigate: (view: string) => void;
  onSelectQueueItem?: (queueItem: QueueItem) => void;
}

export const DoctorDashboardView: React.FC<DoctorDashboardViewProps> = ({
  onNavigate,
  onSelectQueueItem,
}) => {
  const { doctor } = useAuth();
  const { showToast } = useNotifications();

  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalling, setIsCalling] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadData = async () => {
    try {
      const [qList, apts] = await Promise.all([
        api.getTodayQueue(),
        api.getAppointments({ date: todayStr }),
      ]);
      setQueueItems(qList);
      setAppointments(apts);
    } catch (err) {
      console.error('Error loading doctor dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  const waitingCount = queueItems.filter((q) => q.status === 'waiting').length;
  const inConsultCount = queueItems.filter((q) => q.status === 'in_consultation').length;
  const completedCount = queueItems.filter((q) => q.status === 'completed').length;
  const currentPatient = queueItems.find((q) => q.status === 'in_consultation' || q.status === 'called');

  const handleCallNext = async () => {
    setIsCalling(true);
    try {
      const res = await api.callNext(doctor?.id);
      showToast('success', 'Patient Called', res.message);
      await loadData();
    } catch (err: any) {
      showToast('info', 'Call Next', err.message || 'No patients currently waiting in queue.');
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
              MMC Physician Workstation
            </span>
            <span className="text-xs text-indigo-200">
              Room {doctor?.room_number || '101'} • {doctor?.specialization_name}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Dr. {doctor?.first_name} {doctor?.last_name}
          </h1>
          <p className="text-xs text-indigo-100 mt-1">
            Manage your Makati Medical Center daily appointments and live patient consultation queue.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCallNext}
            disabled={isCalling || waitingCount === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            <Volume2 className="w-4 h-4 text-slate-950" />
            {isCalling ? 'Calling...' : `Call Next (${waitingCount} waiting)`}
          </button>
        </div>
      </div>

      {/* Operational Work Status Bar */}
      {doctor?.id && (
        <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-700 ml-2">Consultation Room Availability:</span>
          <DoctorStatusControl doctorId={doctor.id} />
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Today's Appointments</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{appointments.length}</div>
          <span className="text-[11px] text-blue-600 font-medium mt-1 block">Scheduled for today</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Waiting in Queue</span>
          <div className="text-2xl font-bold text-indigo-700 mt-1">{waitingCount}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Patients checked in</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">In Consultation</span>
          <div className="text-2xl font-bold text-blue-700 mt-1">{inConsultCount}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Active in room</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Completed Today</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{completedCount}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Finished consultations</span>
        </div>
      </div>

      {/* Current Serving Card */}
      {currentPatient ? (
        <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-700 text-white flex flex-col items-center justify-center font-mono font-black text-xl shadow-xs">
              <span className="text-[9px] uppercase font-sans font-medium text-blue-200">Ticket</span>
              {currentPatient.queue_number}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <StatusBadge status={currentPatient.status} type="queue" />
                <span className="text-xs text-slate-500">Called at {currentPatient.called_time || currentPatient.check_in_time}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                {currentPatient.patient?.first_name} {currentPatient.patient?.last_name}
              </h3>
              <p className="text-xs text-slate-600">
                Patient ID: {currentPatient.patient?.patient_number} • Complaint: "{currentPatient.appointment?.reason_for_consultation || 'General Checkup'}"
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onSelectQueueItem) onSelectQueueItem(currentPatient);
                onNavigate('doctor-consultation-room');
              }}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <Stethoscope className="w-4 h-4" /> Open Consultation Form
            </button>
            <button
              onClick={() => onNavigate('doctor-queue')}
              className="px-3 py-2 bg-white border border-blue-200 text-blue-800 text-xs font-medium rounded-lg hover:bg-blue-100"
            >
              Queue Board
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">No Patient Currently Called</h4>
              <p className="text-xs text-slate-500">
                {waitingCount > 0
                  ? `${waitingCount} patients are waiting in today's queue.`
                  : 'Queue is currently clear.'}
              </p>
            </div>
          </div>
          {waitingCount > 0 && (
            <button
              onClick={handleCallNext}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" /> Call Next Patient
            </button>
          )}
        </div>
      )}

      {/* Today's Appointments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Today's Appointment Schedule</h3>
            <p className="text-xs text-slate-500">Booked patient consultations for {todayStr}</p>
          </div>
          <button
            onClick={() => onNavigate('doctor-appointments')}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
          >
            View All Schedule <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="px-5 py-3">Time Slot</th>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Patient Name</th>
                <th className="px-5 py-3">Reason</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No appointments scheduled for today.
                  </td>
                </tr>
              ) : (
                appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-bold font-mono text-blue-800">
                      {apt.time_slot}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-500">
                      {apt.reference_number}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">
                      {apt.patient?.first_name} {apt.patient?.last_name}
                      <span className="block text-[10px] font-normal text-slate-400">
                        {apt.patient?.patient_number}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate">
                      {apt.reason_for_consultation}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={apt.status} type="appointment" />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {apt.status === 'checked_in' || apt.status === 'confirmed' ? (
                        <button
                          onClick={() => {
                            const q = queueItems.find((item) => item.appointment_id === apt.id);
                            if (q && onSelectQueueItem) {
                              onSelectQueueItem(q);
                            }
                            onNavigate('doctor-queue');
                          }}
                          className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                        >
                          Manage Queue &rarr;
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
