import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Patient, Consultation } from '../../types/index';
import { Modal } from '../../components/common/Modal';
import {
  Users,
  Search,
  User,
  Heart,
  AlertTriangle,
  Phone,
  FileText,
  Calendar,
  Pill,
} from 'lucide-react';

export const DoctorPatientsView: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientConsultations, setPatientConsultations] = useState<Consultation[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadPatients = async () => {
    setIsLoading(true);
    try {
      const list = await api.getPatients(search || undefined);
      setPatients(list);
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
      const records = await api.getPatientConsultations(p.id);
      setPatientConsultations(records);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Clinic Patient Records</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Search patient records, view health summaries, allergies, and clinical visit history
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search patient name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadPatients()}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {patients.map((p) => (
          <div
            key={p.id}
            onClick={() => handleOpenPatient(p)}
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                  {p.patient_number}
                </span>
                <span className="text-[10px] text-slate-400">
                  {p.sex}, {p.age} yrs
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900">
                {p.first_name} {p.last_name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{p.contact_number}</p>
              <p className="text-[11px] text-slate-400 mt-1 truncate">{p.address}</p>

              {p.allergies && (
                <div className="mt-2 text-[10px] text-rose-700 bg-rose-50 px-2 py-1 rounded flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                  <span className="truncate">Allergies: {p.allergies}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-right">
              <span className="text-xs font-semibold text-teal-700 hover:text-teal-900">
                View Medical History &rarr;
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Patient History Modal */}
      <Modal
        isOpen={!!selectedPatient}
        onClose={() => setSelectedPatient(null)}
        title="Patient Medical Profile"
        subtitle={`${selectedPatient?.first_name} ${selectedPatient?.last_name} (${selectedPatient?.patient_number})`}
        maxWidth="2xl"
      >
        {selectedPatient && (
          <div className="space-y-5">
            {/* Vitals & Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-400 uppercase font-medium block text-[10px]">Age / Sex</span>
                <span className="font-bold text-slate-900">{selectedPatient.age} yrs / {selectedPatient.sex}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-400 uppercase font-medium block text-[10px]">Blood Type</span>
                <span className="font-bold text-slate-900">{selectedPatient.blood_type || 'Unspecified'}</span>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                <span className="text-rose-500 uppercase font-medium block text-[10px]">Allergies</span>
                <span className="font-bold text-rose-900">{selectedPatient.allergies || 'None'}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-400 uppercase font-medium block text-[10px]">Emergency Phone</span>
                <span className="font-bold text-slate-900">{selectedPatient.emergency_contact_phone || 'None'}</span>
              </div>
            </div>

            {/* Consultations List */}
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-700 mb-2">
                Consultation History ({patientConsultations.length})
              </h4>
              {isLoadingHistory ? (
                <p className="text-xs text-slate-400">Loading history...</p>
              ) : patientConsultations.length === 0 ? (
                <p className="text-xs text-slate-400">No consultation records recorded for this patient yet.</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {patientConsultations.map((c) => (
                    <div key={c.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>{c.consultation_date} — {c.diagnosis}</span>
                        <span className="text-slate-500 font-normal">Dr. {c.doctor?.last_name}</span>
                      </div>
                      <p className="text-slate-600">Complaint: "{c.chief_complaint}"</p>
                      {c.clinical_notes && (
                        <p className="text-slate-500 italic text-[11px]">{c.clinical_notes}</p>
                      )}
                      {c.prescription && (
                        <div className="p-2 bg-white rounded border border-slate-200 text-teal-800 font-mono text-[11px]">
                          Rx: {c.prescription}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700"
              >
                Close Profile
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
