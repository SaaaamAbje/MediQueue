import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AuditLog } from '../../types/index';
import { StatusBadge } from '../../components/common/Badge';
import { Shield, Search, Filter, Calendar, Clock, User } from 'lucide-react';

export const AdminAuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditLogs({
        module: moduleFilter !== 'ALL' ? moduleFilter : undefined,
        search: search || undefined,
      });
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [moduleFilter]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">System Security &amp; Audit Trail</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of user authentication, appointment scheduling, queue transitions, and medical consultations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search user, action, or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadLogs()}
              className="pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-white w-48 sm:w-64"
            />
          </div>

          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
          >
            <option value="ALL">All Modules</option>
            <option value="AUTH">AUTH</option>
            <option value="APPOINTMENTS">APPOINTMENTS</option>
            <option value="QUEUE">QUEUE</option>
            <option value="CONSULTATIONS">CONSULTATIONS</option>
            <option value="PATIENTS">PATIENTS</option>
            <option value="DOCTORS">DOCTORS</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">User &amp; Role</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Module</th>
                <th className="px-5 py-3">Details</th>
                <th className="px-5 py-3">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No logs found matching current search.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{log.user_email}</div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {log.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold font-mono text-slate-800">
                      {log.action}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        {log.module}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-md break-words">
                      {log.details}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-400">{log.ip_address}</td>
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
