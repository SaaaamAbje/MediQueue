import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { Appointment, Doctor } from '../../types/index';
import { StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Eye,
  Filter,
  Stethoscope,
  User,
  PlusCircle,
} from 'lucide-react';

export const AdminAppointmentsView: React.FC = () => {
  const { showToast } = useNotifications();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Selected for View Details
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);

  // Cancel Modal
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Reschedule Modal
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadAppointments = async () => {
    setIsLoading(true);
    try {
      const [aptList, docList] = await Promise.all([
        api.getAppointments({
          doctorId: doctorFilter !== 'all' ? doctorFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          date: dateFilter || undefined,
          search: search || undefined,
        }),
        api.getDoctors(),
      ]);
      setAppointments(aptList);
      setDoctors(docList);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [statusFilter, doctorFilter, dateFilter]);

  // Load slots when rescheduling
  useEffect(() => {
    if (!rescheduleTarget || !rescheduleDate) return;
    api.getAvailableSlots(rescheduleTarget.doctor_id, rescheduleDate).then((data) => {
      setAvailableSlots(data.availableSlots || []);
    });
  }, [rescheduleTarget, rescheduleDate]);

  const handleApprove = async (apt: Appointment) => {
    try {
      await api.updateAppointment(apt.id, { status: 'confirmed' });
      showToast('success', 'Confirmed', `Appointment ${apt.appointment_reference || apt.reference_number} confirmed.`);
      await loadAppointments();
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const handleCheckIn = async (apt: Appointment) => {
    try {
      const res = await api.checkIn({ appointment_id: apt.id });
      showToast('success', 'Checked In', res.message);
      await loadAppointments();
    } catch (err: any) {
      showToast('error', 'Check In Failed', err.message);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      await api.cancelAppointment(cancelTarget.id, cancelReason || 'Administrative cancellation');
      showToast('success', 'Cancelled', 'Appointment cancelled successfully.');
      setCancelTarget(null);
      setCancelReason('');
      await loadAppointments();
    } catch (err: any) {
      showToast('error', 'Failed', err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleSlot) {
      showToast('warning', 'Missing Selection', 'Select new date and time slot.');
      return;
    }
    setIsRescheduling(true);
    try {
      await api.rescheduleAppointment(rescheduleTarget.id, rescheduleDate, rescheduleSlot);
      showToast('success', 'Rescheduled', 'Appointment schedule updated.');
      setRescheduleTarget(null);
      setRescheduleDate('');
      setRescheduleSlot('');
      await loadAppointments();
    } catch (err: any) {
      showToast('error', 'Failed', err.message);
    } finally {
      setIsRescheduling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Master Appointments Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor, approve, reschedule, and manage all clinic consultations
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search reference #, patient name, doctor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadAppointments()}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            />
          </div>

          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Doctors</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                Dr. {d.last_name} ({d.specialization_name})
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-xs text-slate-500 hover:text-slate-700 underline self-center"
            >
              Clear
            </button>
          )}
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1">
          {['all', 'pending', 'confirmed', 'checked_in', 'completed', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-medium rounded-lg capitalize whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="px-5 py-3">Reference #</th>
                <th className="px-5 py-3">Date &amp; Time</th>
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Physician</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    Loading appointments...
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No appointments found matching current filters.
                  </td>
                </tr>
              ) : (
                appointments.map((apt) => {
                  const isToday = apt.appointment_date === todayStr;
                  const canCheckIn = isToday && ['confirmed', 'pending'].includes(apt.status);
                  const canCancel = ['pending', 'confirmed'].includes(apt.status);
                  const canReschedule = ['pending', 'confirmed'].includes(apt.status);
                  const canApprove = apt.status === 'pending';

                  return (
                    <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-blue-800">
                        {apt.reference_number}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">{apt.appointment_date}</div>
                        <div className="font-mono text-blue-700">{apt.time_slot}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">
                          {apt.patient?.first_name} {apt.patient?.last_name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {apt.patient?.patient_number} • {apt.patient?.contact_number}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">
                          Dr. {apt.doctor?.last_name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Room {apt.doctor?.room_number} ({apt.doctor?.specialization_name})
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={apt.status} type="appointment" />
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedApt(apt)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {canApprove && (
                          <button
                            onClick={() => handleApprove(apt)}
                            className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-semibold"
                          >
                            Approve
                          </button>
                        )}

                        {canCheckIn && (
                          <button
                            onClick={() => handleCheckIn(apt)}
                            className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-semibold"
                          >
                            Check-in
                          </button>
                        )}

                        {canReschedule && (
                          <button
                            onClick={() => {
                              setRescheduleTarget(apt);
                              setRescheduleDate(apt.appointment_date);
                            }}
                            className="px-2 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded text-[11px] font-semibold"
                          >
                            Reschedule
                          </button>
                        )}

                        {canCancel && (
                          <button
                            onClick={() => setCancelTarget(apt)}
                            className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[11px] font-semibold"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Details Modal */}
      <Modal
        isOpen={!!selectedApt}
        onClose={() => setSelectedApt(null)}
        title="Appointment Booking Information"
        subtitle={`Reference: ${selectedApt?.reference_number}`}
        maxWidth="lg"
      >
        {selectedApt && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="text-slate-400 block uppercase text-[10px]">Patient</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedApt.patient?.first_name} {selectedApt.patient?.last_name}
                </span>
                <p className="text-slate-500">ID: {selectedApt.patient?.patient_number}</p>
                <p className="text-slate-500">Phone: {selectedApt.patient?.contact_number}</p>
              </div>

              <div>
                <span className="text-slate-400 block uppercase text-[10px]">Physician</span>
                <span className="font-bold text-slate-900 text-sm">
                  Dr. {selectedApt.doctor?.first_name} {selectedApt.doctor?.last_name}
                </span>
                <p className="text-slate-500">{selectedApt.doctor?.specialization_name}</p>
                <p className="text-slate-500">Room: Room {selectedApt.doctor?.room_number}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-slate-400 block uppercase text-[10px]">Consultation Reason</span>
              <p className="font-semibold text-slate-800">{selectedApt.reason_for_consultation}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                <span className="text-slate-400 block text-[10px]">Date</span>
                <span className="font-bold text-slate-900">{selectedApt.appointment_date}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                <span className="text-slate-400 block text-[10px]">Time Slot</span>
                <span className="font-bold text-blue-700">{selectedApt.time_slot}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                <span className="text-slate-400 block text-[10px]">Status</span>
                <StatusBadge status={selectedApt.status} type="appointment" />
              </div>
            </div>

            {selectedApt.cancellation_reason && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                <span className="font-bold">Cancellation Reason: </span>
                {selectedApt.cancellation_reason}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedApt(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

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
            Provide a cancellation reason. A notification will be recorded for the patient.
          </p>
          <textarea
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Doctor emergency call, Clinic maintenance..."
            className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              onClick={() => setCancelTarget(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Dismiss
            </button>
            <button
              onClick={handleConfirmCancel}
              disabled={isCancelling}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
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
        subtitle={`Reference: ${rescheduleTarget?.reference_number}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">New Date</label>
            <input
              type="date"
              min={todayStr}
              value={rescheduleDate}
              onChange={(e) => {
                setRescheduleDate(e.target.value);
                setRescheduleSlot('');
              }}
              className="p-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">Available Slots</label>
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.map((slot) => {
                const isSelected = rescheduleSlot === slot.time;
                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setRescheduleSlot(slot.time)}
                    className={`p-2 rounded-lg border text-center text-xs ${
                      !slot.available
                        ? 'opacity-40 bg-slate-100 cursor-not-allowed'
                        : isSelected
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-white hover:bg-blue-50 border-slate-200'
                    }`}
                  >
                    {slot.formattedTime}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              onClick={() => setRescheduleTarget(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Close
            </button>
            <button
              onClick={handleConfirmReschedule}
              disabled={isRescheduling || !rescheduleSlot}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
            >
              {isRescheduling ? 'Saving...' : 'Confirm Reschedule'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
