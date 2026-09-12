import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { StatusBadge } from '../common/Badge';
import { Clock, Users, Stethoscope, MapPin, Volume2, AlertCircle, RefreshCw } from 'lucide-react';

interface LiveQueueCardProps {
  onNavigateToQueue?: () => void;
}

export const LiveQueueCard: React.FC<LiveQueueCardProps> = ({ onNavigateToQueue }) => {
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const data = await api.getPatientQueueStatus();
      setQueueStatus(data);
    } catch (err: any) {
      console.error('Queue status fetch error:', err);
      // If unauthorized, the polling should probably stop or the UI should reflect session loss
      if (err.message?.includes('Session expired') || err.message?.includes('Authentication required')) {
        setQueueStatus({ error: 'Session expired' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(() => {
      // Only poll if not showing an error
      if (!queueStatus?.error) {
        fetchStatus();
      }
    }, 6000); // 6s poll for live queue
    return () => clearInterval(timer);
  }, [queueStatus?.error]);

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs animate-pulse">
        <div className="h-4 w-32 bg-slate-200 rounded mb-4" />
        <div className="h-8 w-48 bg-slate-200 rounded" />
      </div>
    );
  }

  if (queueStatus?.error === 'Session expired') {
    return (
      <div className="p-6 bg-rose-50 rounded-2xl border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-rose-100 rounded-lg">
            <AlertCircle className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-rose-900">Session Expired</h3>
            <p className="text-xs text-rose-700 mt-0.5">
              Your session has timed out or the server was updated. Please refresh the page to continue tracking your queue.
            </p>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-sm"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  if (!queueStatus || !queueStatus.hasTicket) {
    return (
      <div className="p-6 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider block mb-1">
            Live Clinic Queue
          </span>
          <h3 className="text-base font-bold text-slate-900">
            You are not currently in today's clinic queue
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            If you have an appointment scheduled for today, check in from your appointments list to receive your digital queue ticket.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStatus}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors"
            title="Refresh queue status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const { ticket, nowServing, patientsAhead, estimatedWaitTime } = queueStatus;
  const isCalled = ticket?.status === 'called';
  const isInConsultation = ticket?.status === 'in_consultation';

  // Audio announcement simulation
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch {
      // AudioContext not permitted in certain environments
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all ${
        isCalled
          ? 'bg-amber-50 border-amber-300 shadow-lg shadow-amber-500/10 ring-2 ring-amber-400'
          : isInConsultation
          ? 'bg-blue-50 border-blue-300 shadow-md'
          : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      {/* Call Alert Banner */}
      {isCalled && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 flex items-center justify-between text-xs font-bold animate-pulse">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-slate-950" />
            <span>ATTENTION: Your ticket has been called! Please proceed to Room {ticket.doctor?.room_number || '101'}.</span>
          </div>
          <button
            onClick={playChime}
            className="px-2 py-0.5 bg-slate-950 text-white rounded text-[11px] font-medium"
          >
            Chime
          </button>
        </div>
      )}

      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Today's Live Queue Ticket
            </span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={ticket?.status} type="queue" />
            <button
              onClick={fetchStatus}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-100">
          {/* Your Ticket */}
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-center">
            <span className="text-[10px] font-medium text-blue-700 uppercase">Your Queue #</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-900 font-mono tracking-tight">
              {ticket.queue_number}
            </div>
          </div>

          {/* Now Serving */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <span className="text-[10px] font-medium text-slate-500 uppercase">Now Serving</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {nowServing || 'None'}
            </div>
          </div>

          {/* Patients Ahead */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <span className="text-[10px] font-medium text-slate-500 uppercase flex items-center justify-center gap-1">
              <Users className="w-3 h-3 text-slate-400" />
              Ahead of You
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {patientsAhead ?? 0}
            </div>
          </div>

          {/* Estimated Wait */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <span className="text-[10px] font-medium text-slate-500 uppercase flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              Est. Waiting Time
            </span>
            <div className="text-sm sm:text-base font-bold text-slate-800 mt-1">
              {estimatedWaitTime}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
              Dr. {ticket.doctor?.first_name} {ticket.doctor?.last_name} ({ticket.doctor?.specialization_name})
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Room {ticket.doctor?.room_number || '101'}
            </span>
          </div>

          {onNavigateToQueue && (
            <button
              onClick={onNavigateToQueue}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline"
            >
              Open Live Queue View &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
