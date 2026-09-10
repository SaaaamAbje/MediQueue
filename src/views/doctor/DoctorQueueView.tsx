import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { QueueItem } from '../../types/index';
import { StatusBadge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  Volume2,
  Play,
  RotateCcw,
  SkipForward,
  UserX,
  Stethoscope,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface DoctorQueueViewProps {
  onNavigate: (view: string) => void;
  onSelectQueueItem?: (queueItem: QueueItem) => void;
}

export const DoctorQueueView: React.FC<DoctorQueueViewProps> = ({
  onNavigate,
  onSelectQueueItem,
}) => {
  const { doctor } = useAuth();
  const { showToast } = useNotifications();

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog actions
  const [actionConfirm, setActionConfirm] = useState<{
    type: 'skip' | 'no-show';
    item: QueueItem;
  } | null>(null);

  const loadQueue = async () => {
    try {
      const data = await api.getTodayQueue();
      setQueue(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentPatient = queue.find((q) => q.status === 'called' || q.status === 'in_consultation');
  const waitingPatients = queue.filter((q) => q.status === 'waiting');
  const processedPatients = queue.filter((q) => ['completed', 'skipped', 'no_show'].includes(q.status));

  const handleCallNext = async () => {
    try {
      const res = await api.callNext(doctor?.id);
      showToast('success', 'Patient Called', res.message);
      await loadQueue();
    } catch (err: any) {
      showToast('info', 'Call Next', err.message || 'No patients currently waiting.');
    }
  };

  const handleRecall = async (item: QueueItem) => {
    try {
      const res = await api.recallPatient(item.id);
      showToast('info', 'Patient Recalled', res.message);
      await loadQueue();
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to recall patient.');
    }
  };

  const handleStartConsultation = async (item: QueueItem) => {
    try {
      const res = await api.startConsultation(item.id);
      showToast('success', 'Consultation Started', res.message);
      if (onSelectQueueItem) {
        onSelectQueueItem(res.queueItem);
      }
      onNavigate('doctor-consultation-room');
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to start consultation.');
    }
  };

  const handleConfirmAction = async () => {
    if (!actionConfirm) return;
    const { type, item } = actionConfirm;

    try {
      if (type === 'skip') {
        const res = await api.skipPatient(item.id);
        showToast('warning', 'Patient Skipped', res.message);
      } else if (type === 'no-show') {
        const res = await api.markNoShow(item.id);
        showToast('error', 'Marked No-Show', res.message);
      }
      setActionConfirm(null);
      await loadQueue();
    } catch (err: any) {
      showToast('error', 'Action Failed', err.message || 'Operation failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-xl font-bold text-slate-900">Queue Management Board</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Active patient flow for Room {doctor?.room_number || '101'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadQueue}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleCallNext}
            disabled={waitingPatients.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
          >
            <Volume2 className="w-4 h-4" />
            Call Next Patient ({waitingPatients.length} waiting)
          </button>
        </div>
      </div>

      {/* Active Serving Card */}
      {currentPatient ? (
        <div className="p-6 rounded-2xl bg-white border-2 border-teal-500 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Active Patient in Station
            </span>
            <StatusBadge status={currentPatient.status} type="queue" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-teal-700 text-white flex flex-col items-center justify-center font-mono font-black text-2xl shadow-sm">
                <span className="text-[9px] uppercase font-sans font-medium text-teal-200">Ticket</span>
                {currentPatient.queue_number}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {currentPatient.patient?.first_name} {currentPatient.patient?.last_name}
                </h3>
                <p className="text-xs text-slate-500">
                  Patient ID: {currentPatient.patient?.patient_number} • Age: {currentPatient.patient?.age} • Sex: {currentPatient.patient?.sex}
                </p>
                <p className="text-xs text-teal-800 font-medium mt-1">
                  Complaint: "{currentPatient.appointment?.reason_for_consultation || 'Consultation'}"
                </p>
              </div>
            </div>

            {/* Quick Action Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {currentPatient.status === 'called' ? (
                <>
                  <button
                    onClick={() => handleStartConsultation(currentPatient)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" /> Start Consultation
                  </button>
                  <button
                    onClick={() => handleRecall(currentPatient)}
                    className="px-3 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Recall
                  </button>
                  <button
                    onClick={() => setActionConfirm({ type: 'skip', item: currentPatient })}
                    className="px-3 py-2 bg-white border border-amber-200 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-50 flex items-center gap-1"
                  >
                    <SkipForward className="w-3.5 h-3.5" /> Skip
                  </button>
                  <button
                    onClick={() => setActionConfirm({ type: 'no-show', item: currentPatient })}
                    className="px-3 py-2 bg-white border border-rose-200 text-rose-600 text-xs font-medium rounded-lg hover:bg-rose-50 flex items-center gap-1"
                  >
                    <UserX className="w-3.5 h-3.5" /> No-Show
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    if (onSelectQueueItem) onSelectQueueItem(currentPatient);
                    onNavigate('doctor-consultation-room');
                  }}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  <Stethoscope className="w-3.5 h-3.5" /> Open Consultation Form
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Waiting List Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Patients Waiting in Queue ({waitingPatients.length})
            </h3>
            <p className="text-xs text-slate-500">Ordered by check-in time</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="px-5 py-3">Queue #</th>
                <th className="px-5 py-3">Check-in Time</th>
                <th className="px-5 py-3">Patient Name</th>
                <th className="px-5 py-3">Chief Complaint</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {waitingPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No patients currently waiting in line.
                  </td>
                </tr>
              ) : (
                waitingPatients.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-bold font-mono text-teal-800 text-sm">
                      {item.queue_number}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{item.check_in_time}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">
                      {item.patient?.first_name} {item.patient?.last_name}
                      <span className="block text-[10px] font-normal text-slate-400">
                        {item.patient?.patient_number}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate">
                      {item.appointment?.reason_for_consultation || 'Consultation'}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={item.status} type="queue" />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {index === 0 && !currentPatient ? (
                        <button
                          onClick={handleCallNext}
                          className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded shadow-xs inline-flex items-center gap-1"
                        >
                          <Volume2 className="w-3 h-3" /> Call This Patient
                        </button>
                      ) : (
                        <button
                          onClick={() => setActionConfirm({ type: 'skip', item })}
                          className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                        >
                          Skip
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Completed & Handled Patients */}
      {processedPatients.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Processed Earlier Today ({processedPatients.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {processedPatients.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-700">{item.queue_number}</span>
                  <span className="font-semibold text-slate-900">
                    {item.patient?.first_name} {item.patient?.last_name}
                  </span>
                  <span className="text-slate-400">
                    {item.completed_time ? `Completed at ${item.completed_time}` : item.status}
                  </span>
                </div>
                <StatusBadge status={item.status} type="queue" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Dialog Confirmation */}
      {actionConfirm && (
        <ConfirmDialog
          isOpen={!!actionConfirm}
          onClose={() => setActionConfirm(null)}
          onConfirm={handleConfirmAction}
          title={actionConfirm.type === 'skip' ? 'Skip Patient' : 'Mark as No-Show'}
          message={`Are you sure you want to mark patient ${actionConfirm.item.patient?.first_name} ${actionConfirm.item.patient?.last_name} (Ticket ${actionConfirm.item.queue_number}) as ${actionConfirm.type}?`}
          isDestructive={actionConfirm.type === 'no-show'}
          confirmText={actionConfirm.type === 'skip' ? 'Skip Patient' : 'Mark No-Show'}
        />
      )}
    </div>
  );
};
