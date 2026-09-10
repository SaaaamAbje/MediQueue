import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Appointment } from '../../types/index';
import { StatusBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Calendar,
  Clock,
  Search,
  User,
  MapPin,
  CheckCircle2,
  XCircle,
  Filter,
} from 'lucide-react';

export const DoctorAppointmentsView: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAppointments({
        date: dateFilter || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined,
      });
      setAppointments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [dateFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Doctor's Appointment Schedule</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            View patient appointment bookings and history
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Clear Date
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by patient name, reference number, complaint..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAppointments()}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-white"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {['all', 'confirmed', 'checked_in', 'completed', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
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
                <th className="px-5 py-3">Date &amp; Time</th>
                <th className="px-5 py-3">Ref #</th>
                <th className="px-5 py-3">Patient Name</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Chief Complaint</th>
                <th className="px-5 py-3">Status</th>
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
                appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{apt.appointment_date}</div>
                      <div className="font-mono text-teal-700">{apt.time_slot}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-medium text-slate-500">
                      {apt.reference_number}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">
                        {apt.patient?.first_name} {apt.patient?.last_name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {apt.patient?.patient_number} ({apt.patient?.sex}, {apt.patient?.age}y)
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {apt.patient?.contact_number}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate">
                      {apt.reason_for_consultation}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={apt.status} type="appointment" />
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
