import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { Doctor, Specialization } from '../../types/index';
import { StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Stethoscope,
  Plus,
  Edit2,
  MapPin,
  Phone,
  Award,
  Search,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const AdminDoctorsView: React.FC = () => {
  const { showToast } = useNotifications();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    specialization_id: '',
    license_number: '',
    room_number: '',
    contact_number: '',
    bio: '',
    consultation_fee: 500,
  });

  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [docs, specs] = await Promise.all([
        api.getDoctors(),
        api.getSpecializations(),
      ]);
      setDoctors(docs);
      setSpecializations(specs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingDoctor(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      password: 'password123',
      specialization_id: specializations[0]?.id || '',
      license_number: '',
      room_number: '101',
      contact_number: '+63 9',
      bio: '',
      consultation_fee: 600,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (doc: Doctor) => {
    setEditingDoctor(doc);
    setFormData({
      first_name: doc.first_name,
      last_name: doc.last_name,
      email: '',
      password: '',
      specialization_id: doc.specialization_id,
      license_number: doc.license_number,
      room_number: doc.room_number,
      contact_number: doc.contact_number,
      bio: doc.bio,
      consultation_fee: doc.consultation_fee,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingDoctor) {
        await api.updateDoctor(editingDoctor.id, {
          first_name: formData.first_name,
          last_name: formData.last_name,
          specialization_id: formData.specialization_id,
          license_number: formData.license_number,
          room_number: formData.room_number,
          contact_number: formData.contact_number,
          bio: formData.bio,
          consultation_fee: Number(formData.consultation_fee),
        });
        showToast('success', 'Updated', 'Doctor details saved.');
      } else {
        await api.createDoctor({
          ...formData,
          consultation_fee: Number(formData.consultation_fee),
        });
        showToast('success', 'Doctor Added', 'New doctor profile created successfully.');
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      showToast('error', 'Save Failed', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (doc: Doctor) => {
    try {
      const newStatus = !doc.is_active;
      await api.updateDoctor(doc.id, { is_active: newStatus });
      showToast('success', 'Status Changed', `Dr. ${doc.last_name} is now ${newStatus ? 'Active' : 'Inactive'}.`);
      await loadData();
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const filteredDoctors = doctors.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.first_name.toLowerCase().includes(q) ||
      d.last_name.toLowerCase().includes(q) ||
      d.specialization_name?.toLowerCase().includes(q) ||
      d.room_number.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Physicians &amp; Specialists Roster</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage medical doctors, clinic consultation room assignments, and fees
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search doctor or room..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-white w-48 sm:w-60"
            />
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            <Plus className="w-4 h-4" /> Add Doctor
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="px-5 py-3">Doctor Name</th>
                <th className="px-5 py-3">Specialization</th>
                <th className="px-5 py-3">Room #</th>
                <th className="px-5 py-3">License #</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Fee</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    Loading doctors roster...
                  </td>
                </tr>
              ) : filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    No doctors found.
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      Dr. {doc.first_name} {doc.last_name}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-blue-800">
                      {doc.specialization_name}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold">Room {doc.room_number}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-500">{doc.license_number}</td>
                    <td className="px-5 py-3.5 text-slate-600">{doc.contact_number}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">
                      ₱{doc.consultation_fee?.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={doc.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(doc)}
                        className="p-1 text-slate-400 hover:text-slate-700"
                        title="Edit Doctor"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(doc)}
                        className={`text-[11px] font-semibold ${
                          doc.is_active ? 'text-amber-700 hover:text-amber-900' : 'text-emerald-700 hover:text-emerald-900'
                        }`}
                      >
                        {doc.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Doctor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDoctor ? 'Edit Doctor Details' : 'Register New Medical Doctor'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {!editingDoctor && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Account Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="doctor@mmc.com.ph"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Temporary Password *</label>
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Medical Specialty *</label>
              <select
                value={formData.specialization_id}
                onChange={(e) => setFormData({ ...formData, specialization_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                {specializations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Room Number *</label>
              <input
                type="text"
                required
                value={formData.room_number}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                placeholder="e.g. 101"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Medical License # *</label>
              <input
                type="text"
                required
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                placeholder="PRC-001234"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Contact Phone *</label>
              <input
                type="text"
                required
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Consultation Fee (₱) *</label>
              <input
                type="number"
                required
                value={formData.consultation_fee}
                onChange={(e) => setFormData({ ...formData, consultation_fee: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Professional Bio</label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Board certifications, clinical experience, affiliations..."
              className="w-full p-2.5 border border-slate-300 rounded-lg"
            />
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : editingDoctor ? 'Save Changes' : 'Create Doctor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
