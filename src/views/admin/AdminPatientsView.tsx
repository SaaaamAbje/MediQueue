import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { Patient, Consultation } from '../../types/index';
import { StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Users,
  Search,
  User,
  Heart,
  AlertTriangle,
  Phone,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';

export const AdminPatientsView: React.FC = () => {
  const { showToast } = useNotifications();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Selected Patient Modal
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientConsultations, setPatientConsultations] = useState<Consultation[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadPatients = async () => {
    setIsLoading(true);
    try {
      const data = await api.getPatients(search || undefined);
      setPatients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const handleOpenPatient = async (p: Patient) => {
    setSelectedPatient(p);
    setIsLoadingHistory(true);
    try {
      const data = await api.getPatientConsultations(p.id);
      setPatientConsultations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleToggleStatus = async (p: Patient) => {
    try {
      const newStatus = !p.is_active;
      await api.updatePatient(p.id, { is_active: newStatus });
      showToast('success', 'Status Updated', `Patient is now ${newStatus ? 'Active' : 'Inactive'}.`);
      await loadPatients();
      if (selectedPatient?.id === p.id) {
        setSelectedPatient({ ...selectedPatient, is_active: newStatus });
      }
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Registered Patients Registry</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total of {patients.length} registered clinic patient profiles
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, ID, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadPatients()}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-white"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="px-5 py-3">Patient ID</th>
                <th className="px-5 py-3">Full Name</th>
                <th className="px-5 py-3">Age / Sex</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Blood Type</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    Loading patient database...
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No patients found.
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-blue-800">
                      {p.patient_number}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">
                      {p.first_name} {p.last_name}
                      {p.allergies && (
                        <span className="block text-[10px] text-rose-600 font-normal truncate max-w-xs">
                          Allergies: {p.allergies}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {p.age} yrs • {p.sex}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{p.contact_number}</td>
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-800">
                      {p.blood_type || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={p.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleOpenPatient(p)}
                        className="p-1 text-slate-400 hover:text-slate-800"
                        title="View Records"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(p)}
                        className={`text-[11px] font-semibold ${
                          p.is_active ? 'text-amber-700 hover:text-amber-900' : 'text-blue-700 hover:text-blue-900'
                        }`}
                      >
                        {p.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Detail Modal */}
      <Modal
        isOpen={!!selectedPatient}
        onClose={() => setSelectedPatient(null)}
        title="Patient Record &amp; Clinical History"
        subtitle={`${selectedPatient?.first_name} ${selectedPatient?.last_name} (${selectedPatient?.patient_number})`}
        maxWidth="2xl"
      >
        {selectedPatient && (
          <div className="space-y-5 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-medium">Contact Phone</span>
                <p className="font-bold text-slate-900">{selectedPatient.contact_number}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-medium">Date of Birth</span>
                <p className="font-bold text-slate-900">{selectedPatient.date_of_birth}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-medium">Permanent Address</span>
                <p className="font-semibold text-slate-800">{selectedPatient.address}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-medium">Emergency Contact</span>
                <p className="font-bold text-slate-900">
                  {selectedPatient.emergency_contact_name || 'None'} ({selectedPatient.emergency_contact_phone || 'None'})
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-medium">Known Allergies</span>
                <p className="font-bold text-rose-700">{selectedPatient.allergies || 'None reported'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-medium">Account Status</span>
                <div>
                  <StatusBadge status={selectedPatient.is_active ? 'active' : 'inactive'} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-slate-700 mb-2">
                Consultation Records ({patientConsultations.length})
              </h4>
              {isLoadingHistory ? (
                <p className="text-slate-400">Loading consultations...</p>
              ) : patientConsultations.length === 0 ? (
                <p className="text-slate-400">No medical visits recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {patientConsultations.map((c) => (
                    <div key={c.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>{c.consultation_date} — {c.diagnosis}</span>
                        <span className="text-slate-500 font-normal">Dr. {c.doctor?.last_name}</span>
                      </div>
                      <p className="text-slate-600">Chief Complaint: "{c.chief_complaint}"</p>
                      {c.prescription && (
                        <p className="text-blue-700 font-mono text-[11px]">Rx: {c.prescription}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-4 py-2 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
