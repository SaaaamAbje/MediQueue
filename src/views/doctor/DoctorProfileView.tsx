import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { DoctorSchedule } from '../../types/index';
import { Stethoscope, Clock, MapPin, Award, Phone, Calendar } from 'lucide-react';

export const DoctorProfileView: React.FC = () => {
  const { doctor } = useAuth();
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);

  useEffect(() => {
    if (doctor) {
      api.getDoctorSchedules(doctor.id).then(setSchedules).catch(console.error);
    }
  }, [doctor]);

  if (!doctor) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-2xl shadow-md">
            {doctor.first_name[0]}{doctor.last_name[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Dr. {doctor.first_name} {doctor.last_name}
            </h2>
            <p className="text-xs font-semibold text-teal-700 mt-0.5">
              {doctor.specialization_name}
            </p>
            <p className="text-xs text-slate-500">License No: {doctor.license_number}</p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-[10px] text-slate-400 uppercase block font-medium">Assigned Clinic</span>
          <span className="text-sm font-bold text-slate-900">Room {doctor.room_number}</span>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Professional Overview
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">{doctor.bio}</p>

          <div className="pt-2 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>Contact: {doctor.contact_number}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>Room: Room {doctor.room_number}</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-slate-400" />
              <span>Consultation Fee: ₱{doctor.consultation_fee?.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Weekly Clinic Schedule */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Weekly Clinic Duty Hours
          </h3>
          {schedules.length === 0 ? (
            <p className="text-xs text-slate-400">No duty hours configured yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {schedules.map((sc) => (
                <div key={sc.id} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900">{sc.day_of_week}</span>
                  <span className="font-mono text-teal-800">
                    {sc.start_time} - {sc.end_time} ({sc.slot_duration_minutes} min slots)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
