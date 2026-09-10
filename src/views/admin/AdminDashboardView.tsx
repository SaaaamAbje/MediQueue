import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { Appointment, QueueItem, Doctor, AuditLog } from '../../types/index';
import { StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Activity,
  Users,
  Clock,
  Calendar,
  UserCheck,
  CheckCircle2,
  XCircle,
  Shield,
  Volume2,
  PlusCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface AdminDashboardViewProps {
  onNavigate: (view: string) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onNavigate }) => {
  const { showToast } = useNotifications();

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Manual Check-in Modal
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInRef, setCheckInRef] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadData = async () => {
    try {
      const [qList, aptList, docList, logs, st] = await Promise.all([
        api.getTodayQueue(),
        api.getAppointments({ date: todayStr }),
        api.getDoctors({ status: 'active' }),
        api.getAuditLogs(),
        api.getAppointmentStats(),
      ]);
      setQueue(qList);
      setAppointments(aptList);
      setDoctors(docList);
      setAuditLogs(logs.slice(0, 5));
      setStats(st);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  const waitingCount = queue.filter((q) => q.status === 'waiting').length;
  const inConsultCount = queue.filter((q) => q.status === 'in_consultation').length;
  const completedCount = queue.filter((q) => q.status === 'completed').length;

  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInRef.trim()) return;

    setIsCheckingIn(true);
    try {
      // Find appointment by reference or ID
      const apt = appointments.find(
        (a) => a.reference_number.toLowerCase() === checkInRef.trim().toLowerCase()
      );
      if (!apt) {
        showToast('error', 'Not Found', 'No appointment found for today with that reference number.');
        return;
      }

      const res = await api.checkIn({ appointment_id: apt.id });
      showToast('success', 'Checked In', res.message);
      setCheckInRef('');
      setIsCheckInOpen(false);
      await loadData();
    } catch (err: any) {
      showToast('error', 'Check-in Error', err.message || 'Check-in failed.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-slate-900 to-teal-900 rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
              Clinic Operations Central
            </span>
            <span className="text-xs text-purple-200">Date: {todayStr}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Clinic Administrator Dashboard</h1>
          <p className="text-xs text-purple-100 mt-1">
            Centralized coordination for patient appointments, doctor schedules, and live reception queues.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCheckInOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <PlusCircle className="w-4 h-4 text-slate-950" />
            Check In Arriving Patient
          </button>
          <button
            onClick={() => onNavigate('admin-queue')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20"
          >
            Open Queue Board &rarr;
          </button>
        </div>
      </div>

      {/* Operational Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-slate-500">Today's Appts</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{appointments.length}</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-slate-500">Waiting in Line</span>
          <div className="text-xl font-bold text-indigo-700 mt-1">{waitingCount}</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-slate-500">In Consultation</span>
          <div className="text-xl font-bold text-teal-700 mt-1">{inConsultCount}</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-slate-500">Completed Today</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">{completedCount}</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-slate-500">Active Doctors</span>
          <div className="text-xl font-bold text-sky-700 mt-1">{doctors.length}</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold uppercase text-slate-500">Total Bookings</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{stats?.total || 0}</div>
        </div>
      </div>

      {/* Live Reception Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-base font-bold text-slate-900">Today's Live Queue Overview</h3>
            </div>
            <p className="text-xs text-slate-500">Real-time status across all clinic rooms</p>
          </div>
          <button
            onClick={() => onNavigate('admin-queue')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
          >
            Full Queue Manager &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="px-5 py-3">Queue #</th>
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Assigned Doctor</th>
                <th className="px-5 py-3">Room</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No patients currently checked into today's queue.
                  </td>
                </tr>
              ) : (
                queue.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-teal-800 text-sm">
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: Doctors on Duty & Recent Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Doctors Roster */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Medical Specialists Roster</h3>
              <p className="text-xs text-slate-500">Active clinic physicians</p>
            </div>
            <button
              onClick={() => onNavigate('admin-doctors')}
              className="text-xs font-semibold text-sky-700 hover:text-sky-900"
            >
              Manage Doctors &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {doctors.map((doc) => (
              <div
                key={doc.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                    {doc.first_name[0]}{doc.last_name[0]}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Dr. {doc.first_name} {doc.last_name}
                    </h4>
                    <p className="text-[11px] text-teal-700">{doc.specialization_name} • Room {doc.room_number}</p>
                  </div>
                </div>
                <StatusBadge status={doc.is_active ? 'active' : 'inactive'} />
              </div>
            ))}
          </div>
        </div>

        {/* Audit Activity */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent System Activity</h3>
              <p className="text-xs text-slate-500">Security and audit trail logs</p>
            </div>
            <button
              onClick={() => onNavigate('admin-audit-logs')}
              className="text-xs font-semibold text-purple-700 hover:text-purple-900"
            >
              View All Logs &rarr;
            </button>
          </div>

          <div className="space-y-2.5">
            {auditLogs.map((log) => (
              <div key={log.id} className="text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{log.action}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] mt-0.5 line-clamp-1">{log.details}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                  <span>User: {log.user_email}</span>
                  <span>• Module: {log.module}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Manual Check-in Modal */}
      <Modal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        title="Check In Arriving Patient"
        subtitle="Issue a digital queue pass for scheduled appointment"
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Check in the patient when they physically arrive at the clinic reception desk.
            </p>
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
              className="px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {isCheckingIn ? 'Checking in...' : 'Issue Queue Ticket'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
