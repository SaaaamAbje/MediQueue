import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Appointment, Doctor } from '../../types/index';
import { useNotifications } from '../../context/NotificationContext';
import { StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Calendar,
  Clock,
  Stethoscope,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  RotateCcw,
  MapPin,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface MyAppointmentsViewProps {
  onNavigate: (view: string) => void;
}

export const MyAppointmentsView: React.FC<MyAppointmentsViewProps> = ({ onNavigate }) => {
  const { showToast } = useNotifications();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Cancel Modal State
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Reschedule Modal State
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newSlot, setNewSlot] = useState('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAppointments();
      setAppointments(data);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Fetch slots for reschedule
  useEffect(() => {
    if (!rescheduleTarget || !newDate) return;

    async function loadSlots() {
      try {
        const data = await api.getAvailableSlots(rescheduleTarget!.doctor_id, newDate);
        setAvailableSlots(data.availableSlots || []);
      } catch {
        setAvailableSlots([]);
      }
    }
    loadSlots();
  }, [rescheduleTarget, newDate]);

  const handleSelfCheckIn = async (apt: Appointment) => {
    try {
      const res = await api.checkIn({ appointment_id: apt.id });
      showToast('success', 'Checked In!', res.message);
      await fetchAppointments();
      onNavigate('patient-queue');
    } catch (err: any) {
      showToast('error', 'Check-in Error', err.message || 'Unable to check in.');
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      await api.cancelAppointment(cancelTarget.id, cancelReason || 'Patient request');
      showToast('success', 'Cancelled', 'Your appointment has been cancelled.');
      setCancelTarget(null);
      setCancelReason('');
      await fetchAppointments();
    } catch (err: any) {
      showToast('error', 'Cancellation Failed', err.message || 'Could not cancel.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleTarget || !newDate || !newSlot) {
      showToast('warning', 'Missing Details', 'Please select both date and time slot.');
      return;
    }
    setIsRescheduling(true);
    try {
      await api.rescheduleAppointment(rescheduleTarget.id, newDate, newSlot);
      showToast('success', 'Rescheduled', 'Your appointment has been updated to the new date.');
      setRescheduleTarget(null);
      setNewDate('');
      setNewSlot('');
      await fetchAppointments();
    } catch (err: any) {
      showToast('error', 'Reschedule Failed', err.message || 'Could not reschedule.');
    } finally {
      setIsRescheduling(false);
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const refMatch = apt.reference_number?.toLowerCase().includes(q);
      const docMatch = `${apt.doctor?.first_name} ${apt.doctor?.last_name}`.toLowerCase().includes(q);
      const reasonMatch = apt.reason_for_consultation?.toLowerCase().includes(q);
      return refMatch || docMatch || reasonMatch;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">My Appointments</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track, check into, reschedule, or cancel your clinic consultations.
          </p>
        </div>
        <button
          onClick={() => onNavigate('patient-book')}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 shadow-sm self-start sm:self-auto"
        >
          <Calendar className="w-4 h-4" /> Book New Appointment
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by reference #, doctor name, or complaint..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {['all', 'confirmed', 'pending', 'checked_in', 'completed', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-500">Loading appointments...</div>
      ) : filteredAppointments.length === 0 ? (
        <EmptyState
          title="No Appointments Found"
          description="You do not have any appointments matching your search or filter."
          actionText="Book New Appointment"
          onAction={() => onNavigate('patient-book')}
        />
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((apt) => {
            const isToday = apt.appointment_date === todayStr;
            const canCheckIn = isToday && (apt.status === 'confirmed' || apt.status === 'pending');
            const canCancel = ['pending', 'confirmed'].includes(apt.status);
            const canReschedule = ['pending', 'confirmed'].includes(apt.status);

            return (
              <div
                key={apt.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                      {apt.reference_number}
                    </span>
                    <StatusBadge status={apt.status} type="appointment" />
                    {isToday && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Today's Schedule
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-teal-600 shrink-0" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Dr. {apt.doctor?.first_name} {apt.doctor?.last_name}
                      <span className="text-xs font-normal text-slate-500 ml-1.5">
                        ({apt.doctor?.specialization_name})
                      </span>
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(apt.appointment_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-teal-700">
                      <Clock className="w-3.5 h-3.5" />
                      {apt.time_slot}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      Room {apt.doctor?.room_number || '101'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 italic mt-1">
                    "{apt.reason_for_consultation}"
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {canCheckIn && (
                    <button
                      onClick={() => handleSelfCheckIn(apt)}
                      className="px-3 py-1.5 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700 flex items-center gap-1 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Self Check-in
                    </button>
                  )}

                  {canReschedule && (
                    <button
                      onClick={() => {
                        setRescheduleTarget(apt);
                        setNewDate(apt.appointment_date);
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reschedule
                    </button>
                  )}

                  {canCancel && (
                    <button
                      onClick={() => setCancelTarget(apt)}
                      className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 text-xs font-medium rounded-lg hover:bg-rose-50 flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Cancel
                    </button>
                  )}

                  {apt.status === 'completed' && (
                    <button
                      onClick={() => onNavigate('patient-consultations')}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-100 flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5 text-teal-600" /> View Notes
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Modal */}
      <Modal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel Appointment"
        subtitle={`Reference: ${cancelTarget?.reference_number}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you wish to cancel this appointment with Dr. {cancelTarget?.doctor?.last_name} on{' '}
            {cancelTarget?.appointment_date} at {cancelTarget?.time_slot}?
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Reason for Cancellation (Optional)
            </label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Schedule conflict, feeling better, personal emergency..."
              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCancelTarget(null)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Keep Appointment
            </button>
            <button
              type="button"
              onClick={handleConfirmCancel}
              disabled={isCancelling}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50"
            >
              {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={!!rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        title="Reschedule Appointment"
        subtitle={`Current Reference: ${rescheduleTarget?.reference_number}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Select New Date</label>
            <input
              type="date"
              min={todayStr}
              value={newDate}
              onChange={(e) => {
                setNewDate(e.target.value);
                setNewSlot('');
              }}
              className="p-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">
              Available Consultation Time Slots
            </label>
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.map((slot) => {
                const isSelected = newSlot === slot.time;
                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setNewSlot(slot.time)}
                    className={`p-2 rounded-lg border text-center text-xs ${
                      !slot.available
                        ? 'opacity-40 bg-slate-100 cursor-not-allowed'
                        : isSelected
                        ? 'bg-teal-600 text-white font-bold'
                        : 'bg-white hover:bg-teal-50 border-slate-200'
                    }`}
                  >
                    {slot.formattedTime}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setRescheduleTarget(null)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleConfirmReschedule}
              disabled={isRescheduling || !newSlot}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50"
            >
              {isRescheduling ? 'Rescheduling...' : 'Save New Schedule'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
