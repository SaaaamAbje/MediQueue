import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/common/Badge';
import {
  BarChart3,
  Calendar,
  Clock,
  Download,
  Printer,
  FileSpreadsheet,
  Users,
  Stethoscope,
  TrendingUp,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const AdminReportsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'appointments' | 'queue' | 'doctors' | 'stats'>(
    'appointments'
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const [reportDate, setReportDate] = useState(todayStr);

  const [appointmentReport, setAppointmentReport] = useState<any>(null);
  const [queueReport, setQueueReport] = useState<any>(null);
  const [doctorPerformance, setDoctorPerformance] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const [aptRep, qRep, docPerf, st] = await Promise.all([
        api.getDailyAppointmentReport(reportDate),
        api.getDailyQueueReport(reportDate),
        api.getDoctorPerformanceReport(),
        api.getAppointmentStats(),
      ]);
      setAppointmentReport(aptRep);
      setQueueReport(qRep);
      setDoctorPerformance(docPerf);
      setStats(st);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [reportDate]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (activeTab === 'appointments' && appointmentReport) {
      const headers = 'Reference,Time,Patient,Doctor,Room,Status,Reason\n';
      const rows = (appointmentReport.appointments || [])
        .map(
          (a: any) =>
            `"${a.reference_number}","${a.time_slot}","${a.patient?.first_name} ${a.patient?.last_name}","Dr. ${a.doctor?.last_name}","${a.doctor?.room_number}","${a.status}","${a.reason_for_consultation}"`
        )
        .join('\n');
      const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Appointments_${reportDate}.csv`);
      link.click();
    } else if (activeTab === 'queue' && queueReport) {
      const headers = 'Queue#,Patient,Doctor,CheckIn,Called,Started,Completed,Status\n';
      const rows = (queueReport.queueItems || [])
        .map(
          (q: any) =>
            `"${q.queue_number}","${q.patient?.first_name} ${q.patient?.last_name}","Dr. ${q.doctor?.last_name}","${q.check_in_time}","${q.called_time || ''}","${q.consultation_start_time || ''}","${q.completed_time || ''}","${q.status}"`
        )
        .join('\n');
      const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Queue_${reportDate}.csv`);
      link.click();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Clinic Operational Reports &amp; Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit logs, daily appointments summaries, queue turnaround times, and doctor performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
          />

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50"
          >
            <Download className="w-4 h-4 text-slate-600" /> Export CSV
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('appointments')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'appointments'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Daily Appointment Report
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'queue'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Daily Queue Report
        </button>

        <button
          onClick={() => setActiveTab('doctors')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'doctors'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Doctor Performance
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'stats'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Appointment Statistics
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-500">Generating report data...</div>
      ) : activeTab === 'appointments' ? (
        <div className="space-y-4">
          {/* Summary Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Total Booked</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {appointmentReport?.summary?.total || 0}
              </div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Completed</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {appointmentReport?.summary?.completed || 0}
              </div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Checked In</span>
              <div className="text-2xl font-bold text-teal-700 mt-1">
                {appointmentReport?.summary?.checked_in || 0}
              </div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Cancelled</span>
              <div className="text-2xl font-bold text-rose-700 mt-1">
                {appointmentReport?.summary?.cancelled || 0}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Reference #</th>
                    <th className="px-5 py-3">Time</th>
                    <th className="px-5 py-3">Patient</th>
                    <th className="px-5 py-3">Doctor</th>
                    <th className="px-5 py-3">Room</th>
                    <th className="px-5 py-3">Chief Complaint</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(appointmentReport?.appointments || []).map((apt: any) => (
                    <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-mono font-bold text-teal-800">
                        {apt.reference_number}
                      </td>
                      <td className="px-5 py-3 font-semibold">{apt.time_slot}</td>
                      <td className="px-5 py-3">
                        {apt.patient?.first_name} {apt.patient?.last_name}
                      </td>
                      <td className="px-5 py-3">
                        Dr. {apt.doctor?.first_name} {apt.doctor?.last_name}
                      </td>
                      <td className="px-5 py-3">Room {apt.doctor?.room_number}</td>
                      <td className="px-5 py-3 text-slate-600 max-w-xs truncate">
                        {apt.reason_for_consultation}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={apt.status} type="appointment" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'queue' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Total Checked In</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {queueReport?.summary?.total || 0}
              </div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Completed</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {queueReport?.summary?.completed || 0}
              </div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Currently Waiting</span>
              <div className="text-2xl font-bold text-indigo-700 mt-1">
                {queueReport?.summary?.waiting || 0}
              </div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Skipped / No-Show</span>
              <div className="text-2xl font-bold text-amber-700 mt-1">
                {(queueReport?.summary?.skipped || 0) + (queueReport?.summary?.no_show || 0)}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Queue #</th>
                    <th className="px-5 py-3">Patient</th>
                    <th className="px-5 py-3">Doctor</th>
                    <th className="px-5 py-3">Check In</th>
                    <th className="px-5 py-3">Called At</th>
                    <th className="px-5 py-3">Completed At</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(queueReport?.queueItems || []).map((q: any) => (
                    <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-mono font-bold text-teal-800 text-sm">
                        {q.queue_number}
                      </td>
                      <td className="px-5 py-3 font-semibold">
                        {q.patient?.first_name} {q.patient?.last_name}
                      </td>
                      <td className="px-5 py-3">Dr. {q.doctor?.last_name}</td>
                      <td className="px-5 py-3 text-slate-500">{q.check_in_time}</td>
                      <td className="px-5 py-3 text-slate-500">{q.called_time || '—'}</td>
                      <td className="px-5 py-3 text-slate-500">{q.completed_time || '—'}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={q.status} type="queue" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'doctors' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="px-5 py-3">Physician</th>
                  <th className="px-5 py-3">Specialization</th>
                  <th className="px-5 py-3">Room</th>
                  <th className="px-5 py-3">Total Assigned</th>
                  <th className="px-5 py-3">Completed</th>
                  <th className="px-5 py-3">Cancelled</th>
                  <th className="px-5 py-3 text-right">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doctorPerformance.map((dp) => (
                  <tr key={dp.doctorId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{dp.doctorName}</td>
                    <td className="px-5 py-3.5 text-teal-700 font-medium">{dp.specialization}</td>
                    <td className="px-5 py-3.5">Room {dp.roomNumber}</td>
                    <td className="px-5 py-3.5 font-bold">{dp.totalAppointments}</td>
                    <td className="px-5 py-3.5 font-bold text-emerald-700">{dp.completed}</td>
                    <td className="px-5 py-3.5 text-rose-700">{dp.cancelled}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-teal-800 text-sm">
                      {dp.completionRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Overall Status Breakdown
            </h3>
            <div className="space-y-3">
              {Object.entries(stats?.byStatus || {}).map(([key, val]: any) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={key} type="appointment" />
                    <span className="capitalize font-medium text-slate-700">
                      {key.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 font-mono text-sm">{val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              System Totals
            </h3>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Cumulative Bookings</span>
                <span className="font-bold text-slate-900">{stats?.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Today's Scheduled Consultations</span>
                <span className="font-bold text-teal-800">{appointmentReport?.summary?.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Overall Completed Consultations</span>
                <span className="font-bold text-emerald-700">{stats?.byStatus?.completed || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
