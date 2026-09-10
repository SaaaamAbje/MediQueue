import React from 'react';
import { AppointmentStatus, QueueStatus, UserRole } from '../../types/index';

interface BadgeProps {
  status?: AppointmentStatus | QueueStatus | UserRole | string;
  type?: 'appointment' | 'queue' | 'role' | 'general';
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<BadgeProps> = ({ status, type = 'general', label, className = '' }) => {
  const s = (status || '').toLowerCase();
  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';
  let displayLabel = label || status || 'Unknown';

  if (type === 'role') {
    if (status === 'ADMIN') {
      colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
      displayLabel = 'Staff / Admin';
    } else if (status === 'DOCTOR') {
      colorClasses = 'bg-sky-50 text-sky-700 border-sky-200';
      displayLabel = 'Doctor';
    } else {
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      displayLabel = 'Patient';
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses} ${className}`}>
        {displayLabel}
      </span>
    );
  }

  // Appointment & Queue Statuses
  switch (s) {
    case 'pending':
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
      dotColor = 'bg-amber-500';
      displayLabel = 'Pending Confirmation';
      break;
    case 'confirmed':
      colorClasses = 'bg-blue-50 text-blue-800 border-blue-200';
      dotColor = 'bg-blue-500';
      displayLabel = 'Confirmed';
      break;
    case 'checked_in':
    case 'in_queue':
    case 'waiting':
      colorClasses = 'bg-indigo-50 text-indigo-800 border-indigo-200';
      dotColor = 'bg-indigo-500';
      displayLabel = s === 'waiting' ? 'Waiting in Queue' : 'In Queue';
      break;
    case 'called':
      colorClasses = 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse';
      dotColor = 'bg-amber-600';
      displayLabel = 'Now Calling';
      break;
    case 'in_consultation':
      colorClasses = 'bg-teal-50 text-teal-800 border-teal-200';
      dotColor = 'bg-teal-500';
      displayLabel = 'In Consultation';
      break;
    case 'completed':
      colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      dotColor = 'bg-emerald-500';
      displayLabel = 'Completed';
      break;
    case 'cancelled':
    case 'skipped':
      colorClasses = 'bg-rose-50 text-rose-800 border-rose-200';
      dotColor = 'bg-rose-400';
      displayLabel = s === 'cancelled' ? 'Cancelled' : 'Skipped';
      break;
    case 'no_show':
      colorClasses = 'bg-slate-100 text-slate-600 border-slate-300';
      dotColor = 'bg-slate-400';
      displayLabel = 'No Show';
      break;
    case 'active':
      colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      dotColor = 'bg-emerald-500';
      displayLabel = 'Active';
      break;
    case 'inactive':
      colorClasses = 'bg-slate-100 text-slate-600 border-slate-300';
      dotColor = 'bg-slate-400';
      displayLabel = 'Inactive';
      break;
    default:
      displayLabel = label || status || 'Normal';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {displayLabel}
    </span>
  );
};
