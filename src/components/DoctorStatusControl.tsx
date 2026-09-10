import React, { useState, useEffect } from 'react';
import {
  Coffee,
  CheckCircle2,
  AlertTriangle,
  Moon,
  Clock,
  Activity,
  ChevronDown,
} from 'lucide-react';
import { DoctorWorkStatusType } from '../types/index';
import { api } from '../services/api';

interface DoctorStatusControlProps {
  doctorId: string;
  initialStatus?: DoctorWorkStatusType;
  onStatusChanged?: (status: DoctorWorkStatusType) => void;
}

export const DoctorStatusControl: React.FC<DoctorStatusControlProps> = ({
  doctorId,
  initialStatus = 'available',
  onStatusChanged,
}) => {
  const [currentStatus, setCurrentStatus] = useState<DoctorWorkStatusType>(initialStatus);
  const [loading, setLoading] = useState(false);
  const [breakTimer, setBreakTimer] = useState<number | null>(null);

  // Status options definition
  const STATUS_OPTIONS: {
    id: DoctorWorkStatusType;
    label: string;
    sublabel: string;
    color: string;
    badgeBg: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'available',
      label: 'Available',
      sublabel: 'Room Open for Patients',
      color: 'text-emerald-700',
      badgeBg: 'bg-emerald-50 border-emerald-300',
      icon: CheckCircle2,
    },
    {
      id: 'in_consultation',
      label: 'In Consultation',
      sublabel: 'Active Patient In Room',
      color: 'text-teal-700',
      badgeBg: 'bg-teal-50 border-teal-300',
      icon: Activity,
    },
    {
      id: 'on_break',
      label: '15-Min Break',
      sublabel: 'Temporary Clinical Recess',
      color: 'text-amber-700',
      badgeBg: 'bg-amber-50 border-amber-300',
      icon: Coffee,
    },
    {
      id: 'emergency',
      label: 'Emergency Case',
      sublabel: 'Urgent Triage Stat',
      color: 'text-rose-700',
      badgeBg: 'bg-rose-50 border-rose-300',
      icon: AlertTriangle,
    },
    {
      id: 'off_duty',
      label: 'Off Duty',
      sublabel: 'Clinic Hours Closed',
      color: 'text-slate-600',
      badgeBg: 'bg-slate-100 border-slate-300',
      icon: Moon,
    },
  ];

  // Countdown timer for 15-minute break
  useEffect(() => {
    let interval: any = null;
    if (currentStatus === 'on_break' && breakTimer !== null && breakTimer > 0) {
      interval = setInterval(() => {
        setBreakTimer((prev) => {
          if (prev && prev > 1) return prev - 1;
          // Auto resume to available when break ends!
          changeStatus('available');
          return null;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentStatus, breakTimer]);

  const changeStatus = async (newStatus: DoctorWorkStatusType) => {
    try {
      setLoading(true);
      const isBreak = newStatus === 'on_break';
      const breakMinutes = isBreak ? 15 : undefined;

      await api.updateDoctorWorkStatus({
        doctor_id: doctorId,
        status: newStatus,
        status_message:
          newStatus === 'on_break'
            ? 'Doctor on 15-min break. Queue resuming shortly.'
            : newStatus === 'emergency'
            ? 'Doctor handling emergency triage.'
            : newStatus === 'available'
            ? 'Room open for next queued patient.'
            : 'In consultation',
        break_minutes_remaining: breakMinutes,
      });

      setCurrentStatus(newStatus);
      if (isBreak) {
        setBreakTimer(15 * 60); // 15 minutes in seconds
      } else {
        setBreakTimer(null);
      }

      if (onStatusChanged) onStatusChanged(newStatus);
    } catch (err: any) {
      alert(err.message || 'Failed to update operational status.');
    } finally {
      setLoading(false);
    }
  };

  const activeOption = STATUS_OPTIONS.find((s) => s.id === currentStatus) || STATUS_OPTIONS[0];
  const ActiveIcon = activeOption.icon;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs">
        <ActiveIcon className={`w-4 h-4 ${activeOption.color} ${currentStatus === 'emergency' ? 'animate-pulse' : ''}`} />
        <span className="text-xs font-bold text-slate-800">
          Status: <span className={activeOption.color}>{activeOption.label}</span>
        </span>
        {currentStatus === 'on_break' && breakTimer !== null && (
          <span className="ml-1 text-xs font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1">
            <Clock className="w-3 h-3" /> {formatTimer(breakTimer)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {STATUS_OPTIONS.map((opt) => {
          const isSelected = currentStatus === opt.id;
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              disabled={loading || isSelected}
              onClick={() => changeStatus(opt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isSelected
                  ? `${opt.badgeBg} ${opt.color} shadow-xs font-bold ring-1 ring-slate-300`
                  : 'text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent'
              }`}
              title={opt.sublabel}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
