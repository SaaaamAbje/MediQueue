import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { QueueItem, Doctor } from '../../types/index';
import { StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  Volume2,
  Play,
  RotateCcw,
  SkipForward,
  UserX,
  PlusCircle,
  RefreshCw,
  Clock,
  User,
  Stethoscope,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

export const AdminQueueView: React.FC = () => {
  const { showToast } = useNotifications();

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Manual Check-in Modal
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInRef, setCheckInRef] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Confirm dialog
  const [confirmAction, setConfirmAction] = useState<{
    type: 'skip' | 'no-show';
    item: QueueItem;
  } | null>(null);

  const loadData = async () => {
    try {
      const [qList, docList] = await Promise.all([
        api.getTodayQueue({
          doctorId: selectedDoctorId !== 'all' ? selectedDoctorId : undefined,
        }),
        api.getDoctors({ status: 'active' }),
      ]);
      setQueue(qList);
      setDoctors(docList);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [selectedDoctorId]);

  const currentPatient = queue.find((q) => q.status === 'called' || q.status === 'in_consultation');
  const waitingPatients = queue.filter((q) => q.status === 'waiting');
  const nextPatient = waitingPatients[0];
  const followingPatients = waitingPatients.slice(1);

  const handleCallNext = async () => {
    try {
      const docId = selectedDoctorId !== 'all' ? selectedDoctorId : undefined;
      const res = await api.callNext(docId);
      showToast('success', 'Patient Called', res.message);
      await loadData();
    } catch (err: any) {
      showToast('info', 'Queue Notice', err.message || 'No patients waiting in queue.');
    }
  };

  const handleRecall = async (item: QueueItem) => {
    try {
      const res = await api.recallPatient(item.id);
      showToast('info', 'Recalled', res.message);
      await loadData();
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Could not recall patient.');
    }
  };

  const handleStartConsultation = async (item: QueueItem) => {
    try {
      const res = await api.startConsultation(item.id);
      showToast('success', 'Consultation Started', res.message);
      await loadData();
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to start consultation.');
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, item } = confirmAction;

    try {
      if (type === 'skip') {
        const res = await api.skipPatient(item.id);
        showToast('warning', 'Patient Skipped', res.message);
      } else {
        const res = await api.markNoShow(item.id);
        showToast('error', 'Marked No-Show', res.message);
      }
      setConfirmAction(null);
      await loadData();
    } catch (err: any) {
      showToast('error', 'Action Error', err.message);
    }
  };

  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInRef.trim()) return;

    setIsCheckingIn(true);
    try {
      const res = await api.checkIn({ appointment_id: checkInRef.trim() });
      showToast('success', 'Checked In', res.message);
      setCheckInRef('');
      setIsCheckInOpen(false);
      await loadData();
    } catch (err: any) {
      showToast('error', 'Check-in Error', err.message || 'Unable to check in.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <h2 className="text-xl font-bold text-slate-900">Makati Med Live Dispatch &amp; Patient Queue</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage real-time hospital queue calls, patient status transitions, and specialist clinic arrivals
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Doctors / All Rooms</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                Dr. {doc.last_name} (Room {doc.room_number})
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsCheckInOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold rounded-lg hover:bg-blue-100"
          >
            <PlusCircle className="w-4 h-4 text-blue-600" />
            Check-In Arrival
          </button>

          <button
            onClick={handleCallNext}
            disabled={waitingPatients.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
          >
            <Volume2 className="w-4 h-4" />
            Call Next Patient
          </button>
        </div>
      </div>

      {/* Hero Display Cards: Current & Next */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Patient Card */}
        <div className="bg-white rounded-2xl border-2 border-blue-600 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Now Serving / Active Patient
              </span>
              {currentPatient && <StatusBadge status={currentPatient.status} type="queue" />}
            </div>

            {currentPatient ? (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-blue-600 text-white flex flex-col items-center justify-center font-mono font-black text-2xl shadow-xs">
                    <span className="text-[9px] uppercase font-sans text-blue-200">Ticket</span>
                    {currentPatient.queue_number}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {currentPatient.patient?.first_name} {currentPatient.patient?.last_name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Patient ID: {currentPatient.patient?.patient_number}
                    </p>
                    <p className="text-xs text-blue-800 font-medium">
                      Dr. {currentPatient.doctor?.last_name} • Room {currentPatient.doctor?.room_number}
                    </p>
                  </div>
                </div>

                <div className="pt-2 text-xs text-slate-500">
                  Checked in at {currentPatient.check_in_time} • Reason: "{currentPatient.appointment?.reason_for_consultation || 'Consultation'}"
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No patient currently called into consultation room.
              </div>
            )}
          </div>

          {currentPatient && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleStartConsultation(currentPatient)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1"
              >
                <Play className="w-3 h-3" /> Start Consultation
              </button>
              <button
                onClick={() => handleRecall(currentPatient)}
                className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Recall
              </button>
              <button
                onClick={() => setConfirmAction({ type: 'skip', item: currentPatient })}
                className="px-3 py-1.5 bg-white border border-amber-200 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-50"
              >
                Skip
              </button>
              <button
                onClick={() => setConfirmAction({ type: 'no-show', item: currentPatient })}
                className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 text-xs font-medium rounded-lg hover:bg-rose-50"
              >
                No-Show
              </button>
            </div>
          )}
        </div>

        {/* Next in Line Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-3">
              Next Patient in Line
            </span>

            {nextPatient ? (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-slate-100 text-slate-800 flex flex-col items-center justify-center font-mono font-black text-2xl border border-slate-200">
                  <span className="text-[9px] uppercase font-sans text-slate-400">Next</span>
                  {nextPatient.queue_number}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {nextPatient.patient?.first_name} {nextPatient.patient?.last_name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Patient ID: {nextPatient.patient?.patient_number}
                  </p>
                  <p className="text-xs text-slate-600">
                    Assigned to Dr. {nextPatient.doctor?.last_name} (Room {nextPatient.doctor?.room_number})
                  </p>
                  <span className="inline-block mt-1 text-[11px] text-slate-400">
                    Checked in at {nextPatient.check_in_time}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No patients currently waiting in line.
              </div>
            )}
          </div>

          {nextPatient && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleCallNext}
                className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <Volume2 className="w-3.5 h-3.5" /> Call Ticket #{nextPatient.queue_number}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Waiting List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Patients in Waiting Queue ({waitingPatients.length})
            </h3>
            <p className="text-xs text-slate-500">Sequential order based on arrival &amp; check-in</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="px-5 py-3">Queue #</th>
                <th className="px-5 py-3">Check-in Time</th>
                <th className="px-5 py-3">Patient Name</th>
                <th className="px-5 py-3">Assigned Physician</th>
                <th className="px-5 py-3">Room</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {waitingPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    Waiting queue is currently empty.
                  </td>
                </tr>
              ) : (
                waitingPatients.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-blue-800 text-sm">
                      {item.queue_number}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{item.check_in_time}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">
                      {item.patient?.first_name} {item.patient?.last_name}
                      <span className="block text-[10px] text-slate-400">
                        {item.patient?.patient_number}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      Dr. {item.doctor?.first_name} {item.doctor?.last_name}
                    </td>
                    <td className="px-5 py-3.5 font-medium">Room {item.doctor?.room_number}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={item.status} type="queue" />
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => setConfirmAction({ type: 'skip', item })}
                        className="text-xs text-amber-700 hover:text-amber-900 font-medium"
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => setConfirmAction({ type: 'no-show', item })}
                        className="text-xs text-rose-700 hover:text-rose-900 font-medium"
                      >
                        No-Show
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Check-in Modal */}
      <Modal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        title="Manual Reception Check-in"
        subtitle="Check in arriving patient to queue"
        maxWidth="md"
      >
        <form onSubmit={handleManualCheckIn} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Appointment Reference Number *
            </label>
            <input
              type="text"
              value={checkInRef}
              onChange={(e) => setCheckInRef(e.target.value)}
              placeholder="e.g. APT-2026-000001"
              required
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCheckInOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCheckingIn}
              className="px-4 py-2 bg-blue-700 text-white text-xs font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {isCheckingIn ? 'Checking in...' : 'Issue Ticket'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog */}
      {confirmAction && (
        <ConfirmDialog
          isOpen={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
          title={confirmAction.type === 'skip' ? 'Skip Patient' : 'Mark as No-Show'}
          message={`Are you sure you want to mark ${confirmAction.item.patient?.first_name} ${confirmAction.item.patient?.last_name} (Ticket ${confirmAction.item.queue_number}) as ${confirmAction.type}?`}
          isDestructive={confirmAction.type === 'no-show'}
          confirmText={confirmAction.type === 'skip' ? 'Skip' : 'Mark No-Show'}
        />
      )}
    </div>
  );
};
