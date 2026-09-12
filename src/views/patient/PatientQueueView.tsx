import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/common/Badge';
import {
  Sparkles,
  Users,
  Clock,
  Volume2,
  Stethoscope,
  MapPin,
  RefreshCw,
  Info,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

interface PatientQueueViewProps {
  onNavigate: (view: string) => void;
}

export const PatientQueueView: React.FC<PatientQueueViewProps> = ({ onNavigate }) => {
  const [queueData, setQueueData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      const res = await api.getPatientQueueStatus();
      setQueueData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000); // 5s refresh
    return () => clearInterval(interval);
  }, []);

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.18); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.7);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.7);
    } catch {
      // AudioContext blocked
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-slate-500">Connecting to clinic queue stream...</div>;
  }

  if (!queueData || !queueData.hasTicket) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">No Active MMC Queue Ticket</h2>
        <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
          You are not currently in today's Makati Medical Center clinic queue. If you have an appointment scheduled for today, head over to your appointments to self-check-in.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('patient-appointments')}
            className="px-4 py-2 bg-blue-700 text-white text-xs font-semibold rounded-lg hover:bg-blue-800 shadow-sm"
          >
            Check In from My Appointments
          </button>
          <button
            onClick={() => onNavigate('patient-book')}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
          >
            Book New Appointment
          </button>
        </div>
      </div>
    );
  }

  const { ticket, nowServing, patientsAhead, estimatedWaitTime } = queueData;
  const isCalled = ticket?.status === 'called';
  const isInConsultation = ticket?.status === 'in_consultation';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-xl font-bold text-slate-900">Live Clinic Queue Display</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-refreshing queue updates for today's clinic appointments
          </p>
        </div>
        <button
          onClick={fetchQueue}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Hero Calling Banner if ticket is CALLED */}
      {isCalled && (
        <div className="p-6 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl text-slate-950 shadow-lg shadow-amber-500/20 border border-amber-400 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/30 rounded-xl">
                <Volume2 className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider">
                  Ticket Called — Please Proceed
                </span>
                <h3 className="text-2xl font-black">
                  Queue Ticket #{ticket.queue_number}
                </h3>
                <p className="text-xs font-semibold mt-0.5">
                  Please proceed immediately to Room {ticket.doctor?.room_number || '101'} for Dr. {ticket.doctor?.last_name}.
                </p>
              </div>
            </div>
            <button
              onClick={playChime}
              className="px-3 py-1.5 bg-slate-950 text-white rounded-lg text-xs font-bold shadow-xs hover:bg-slate-900"
            >
              Play Sound
            </button>
          </div>
        </div>
      )}

      {/* Main Board Ticket Visualizer */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="bg-slate-900 text-white p-6 text-center">
          <span className="text-xs uppercase tracking-widest text-blue-400 font-semibold">
            MMC Digital Queue Pass
          </span>
          <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight my-2 text-white">
            {ticket.queue_number}
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <StatusBadge status={ticket.status} type="queue" />
            <span className="text-xs text-slate-400">
              Issued at {ticket.check_in_time}
            </span>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-100">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-medium uppercase text-slate-500 block">
              Now Serving
            </span>
            <span className="text-3xl font-extrabold font-mono text-slate-900 mt-1 block">
              {nowServing || 'None'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-medium uppercase text-slate-500 block">
              Patients Ahead of You
            </span>
            <span className="text-3xl font-extrabold font-mono text-slate-900 mt-1 block">
              {patientsAhead ?? 0}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-medium uppercase text-slate-500 block">
              Est. Waiting Time
            </span>
            <span className="text-lg font-bold text-blue-800 mt-2 block">
              {estimatedWaitTime}
            </span>
          </div>
        </div>

        {/* Doctor & Room Info */}
        <div className="p-6 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Stethoscope className="w-4 h-4 text-blue-700" />
              Dr. {ticket.doctor?.first_name} {ticket.doctor?.last_name}
              <span className="font-normal text-slate-500">
                ({ticket.doctor?.specialization_name})
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Makati Med Room: {ticket.doctor?.room_number || '101'}
            </div>
          </div>

          <button
            onClick={playChime}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-100 self-start sm:self-auto"
          >
            <Volume2 className="w-4 h-4 text-blue-700" />
            Test Audio Chime
          </button>
        </div>
      </div>

      {/* Advisory Card */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3 text-xs text-blue-950">
        <Info className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-900">MMC Queue Etiquette &amp; Waiting Advisory</p>
          <p className="text-blue-800 leading-relaxed">
            Please remain in or near the Makati Medical Center waiting lounge. When your ticket number is called, a chime will sound and your status will change. If you step away, kindly notify the clinic desk nurse.
          </p>
        </div>
      </div>
    </div>
  );
};
