import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { Doctor, DoctorSchedule } from '../../types/index';
import { StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Stethoscope,
  Users,
} from 'lucide-react';

export const AdminSchedulesView: React.FC = () => {
  const { showToast } = useNotifications();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<DoctorSchedule | null>(null);
  const [formData, setFormData] = useState({
    day_of_week: 'Monday',
    start_time: '09:00',
    end_time: '17:00',
    slot_duration_minutes: 30,
    max_patients: 16,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<DoctorSchedule | null>(null);

  useEffect(() => {
    api.getDoctors({ status: 'active' }).then((docs) => {
      setDoctors(docs);
      if (docs.length > 0) {
        setSelectedDoctorId(docs[0].id);
      }
    });
  }, []);

  const loadSchedules = async () => {
    if (!selectedDoctorId) return;
    setIsLoading(true);
    try {
      const data = await api.getDoctorSchedules(selectedDoctorId);
      setSchedules(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, [selectedDoctorId]);

  const handleOpenAdd = () => {
    setEditingSchedule(null);
    setFormData({
      day_of_week: 'Monday',
      start_time: '09:00',
      end_time: '17:00',
      slot_duration_minutes: 30,
      max_patients: 16,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sc: DoctorSchedule) => {
    setEditingSchedule(sc);
    setFormData({
      day_of_week: sc.day_of_week,
      start_time: sc.start_time,
      end_time: sc.end_time,
      slot_duration_minutes: sc.slot_duration_minutes,
      max_patients: sc.max_patients,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) return;

    setIsSaving(true);
    try {
      if (editingSchedule) {
        await api.updateSchedule(editingSchedule.id, {
          ...formData,
          slot_duration_minutes: Number(formData.slot_duration_minutes),
          max_patients: Number(formData.max_patients),
        });
        showToast('success', 'Updated', 'Duty schedule updated.');
      } else {
        await api.createSchedule({
          doctor_id: selectedDoctorId,
          ...formData,
          slot_duration_minutes: Number(formData.slot_duration_minutes),
          max_patients: Number(formData.max_patients),
        });
        showToast('success', 'Created', 'Duty schedule added.');
      }
      setIsModalOpen(false);
      await loadSchedules();
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteSchedule(deleteTarget.id);
      showToast('success', 'Deleted', 'Schedule removed.');
      setDeleteTarget(null);
      await loadSchedules();
    } catch (err: any) {
      showToast('error', 'Delete Failed', err.message);
    }
  };

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Doctor Duty &amp; Slot Schedules</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure weekly clinic shifts, slot durations, and consultation limits
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium"
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                Dr. {d.first_name} {d.last_name} ({d.specialization_name})
              </option>
            ))}
          </select>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            <Plus className="w-4 h-4" /> Add Duty Shift
          </button>
        </div>
      </div>

      {selectedDoctor && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between text-xs text-teal-900">
          <div className="flex items-center gap-3">
            <Stethoscope className="w-5 h-5 text-teal-700" />
            <div>
              <span className="font-bold">
                Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}
              </span>
              <span className="text-teal-700 ml-1.5">
                • {selectedDoctor.specialization_name} • Room {selectedDoctor.room_number}
              </span>
            </div>
          </div>
          <span className="font-medium text-teal-800">
            Fee: ₱{selectedDoctor.consultation_fee?.toLocaleString()}
          </span>
        </div>
      )}

      {/* Schedules Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="px-5 py-3">Day of Week</th>
                <th className="px-5 py-3">Duty Hours</th>
                <th className="px-5 py-3">Slot Duration</th>
                <th className="px-5 py-3">Max Patients</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    Loading duty schedules...
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No active duty shifts configured for this doctor yet. Click "Add Duty Shift" above.
                  </td>
                </tr>
              ) : (
                schedules.map((sc) => (
                  <tr key={sc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{sc.day_of_week}</td>
                    <td className="px-5 py-3.5 font-mono text-teal-800 font-semibold">
                      {sc.start_time} - {sc.end_time}
                    </td>
                    <td className="px-5 py-3.5">{sc.slot_duration_minutes} minutes</td>
                    <td className="px-5 py-3.5">{sc.max_patients} patients</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={sc.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(sc)}
                        className="p-1 text-slate-400 hover:text-slate-700"
                        title="Edit Shift"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(sc)}
                        className="p-1 text-rose-400 hover:text-rose-700"
                        title="Delete Shift"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSchedule ? 'Edit Duty Shift' : 'Add Weekly Duty Shift'}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Day of the Week *</label>
            <select
              value={formData.day_of_week}
              onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
                (d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Start Time *</label>
              <input
                type="time"
                required
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">End Time *</label>
              <input
                type="time"
                required
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Slot Duration (Minutes) *
              </label>
              <select
                value={formData.slot_duration_minutes}
                onChange={(e) =>
                  setFormData({ ...formData, slot_duration_minutes: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Max Patients Capacity *</label>
              <input
                type="number"
                required
                min={1}
                max={50}
                value={formData.max_patients}
                onChange={(e) => setFormData({ ...formData, max_patients: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : editingSchedule ? 'Save Shift' : 'Create Shift'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Duty Shift"
          message={`Are you sure you want to remove the ${deleteTarget.day_of_week} duty shift (${deleteTarget.start_time} - ${deleteTarget.end_time})?`}
          isDestructive={true}
          confirmText="Delete Shift"
        />
      )}
    </div>
  );
};
