import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Clock,
  Activity,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Hospital,
} from 'lucide-react';
import { api } from '../../services/api';

interface PublicQueueTvViewProps {
  onClose?: () => void;
}

export const PublicQueueTvView: React.FC<PublicQueueTvViewProps> = ({ onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastAnnouncedTicket, setLastAnnouncedTicket] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play clinic chime sound using Web Audio API synthesized harmonics
  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;

      const now = ctx.currentTime;
      // High chime tone 1 (G5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(783.99, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Harmonious chime tone 2 (C6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.5, now + 0.25);
      gain2.gain.setValueAtTime(0.35, now + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.25);
      osc2.stop(now + 1.2);
    } catch (e) {
      console.warn('Audio Context error:', e);
    }
  };

  // Announce with Web Speech Synthesis if available
  const announceTicket = (ticket: string, room: string, doctor: string) => {
    if (!soundEnabled) return;
    playChime();

    if ('speechSynthesis' in window) {
      setTimeout(() => {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(
            `Calling ticket ${ticket}. Please proceed to Room ${room}, with ${doctor}.`
          );
          utterance.rate = 0.95;
          utterance.pitch = 1.05;
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn('Speech synthesis error:', err);
        }
      }, 500);
    }
  };

  const fetchBoard = async () => {
    try {
      const res = await api.getPublicDisplayData();
      setData(res);

      // Check if new ticket is actively called
      const newestCall = res.recent_called?.[0];
      if (newestCall && newestCall.queue_number !== lastAnnouncedTicket) {
        if (lastAnnouncedTicket !== null) {
          announceTicket(newestCall.queue_number, newestCall.room_number, newestCall.doctor_name);
        }
        setLastAnnouncedTicket(newestCall.queue_number);
      }
    } catch (err) {
      console.error('Failed to fetch display data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
    const interval = setInterval(fetchBoard, 4000); // 4-second real-time poll
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, [lastAnnouncedTicket, soundEnabled]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col select-none overflow-hidden font-sans">
      {/* Top TV Header */}
      <header className="px-8 py-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-5">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
              title="Return to regular view"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/20">
              <Hospital className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                {data?.clinic_name || 'Makati Medical Center'}
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Lobby Signage
                </span>
              </h1>
              <p className="text-sm text-slate-400 font-medium">
                {data?.tagline || 'Makati Med Outpatient Consultation & Diagnostic Queue'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Audio Chime & Speech Alert Control */}
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) playChime();
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 border transition-all ${
              soundEnabled
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            <span className="hidden md:inline">{soundEnabled ? 'MMC Voice Alert: ON' : 'Audio: Muted'}</span>
          </button>

          {/* Test Sound Button */}
          <button
            onClick={() => announceTicket('A001', '101', 'Dr. Maria Santos')}
            className="hidden lg:flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/80 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            Test Chime
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Toggle TV Fullscreen Mode"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          {/* Live Digital Clock */}
          <div className="text-right border-l border-slate-800 pl-6">
            <div className="text-2xl font-mono font-bold tracking-wider text-blue-400">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-xs text-slate-400 font-medium">
              {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Board Grid */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <RefreshCw className="w-10 h-10 text-blue-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {data?.room_status_list?.map((room: any) => {
              const isServing = Boolean(room.current_ticket);
              const isOnBreak = room.doctor_work_status === 'on_break';
              const isEmergency = room.doctor_work_status === 'emergency';

              return (
                <div
                  key={room.room_number}
                  className={`rounded-3xl p-6 transition-all duration-300 border flex flex-col justify-between ${
                    isOnBreak
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : isEmergency
                      ? 'bg-rose-950/20 border-rose-500/40'
                      : isServing
                      ? 'bg-slate-900 border-blue-500/50 shadow-2xl shadow-blue-500/10'
                      : 'bg-slate-900/60 border-slate-800 opacity-90'
                  }`}
                >
                  {/* Room Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl font-extrabold text-white">Room {room.room_number}</span>
                        {isOnBreak && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            On Break
                          </span>
                        )}
                        {isEmergency && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                            Emergency
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-blue-400 mt-0.5">{room.doctor_name}</div>
                      <div className="text-xs text-slate-400">{room.specialization}</div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">Waiting</span>
                      <span className="text-xl font-bold font-mono text-slate-200">{room.waiting_count}</span>
                    </div>
                  </div>

                  {/* Big Glowing Now Serving Ticket Box */}
                  <div className="my-6 py-6 px-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-center flex flex-col items-center justify-center">
                    <span className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">
                      {isServing ? 'Now Serving' : 'Room Status'}
                    </span>

                    {isOnBreak ? (
                      <div className="py-2">
                        <div className="text-2xl font-bold text-amber-400">DOCTOR ON BREAK</div>
                        <p className="text-xs text-slate-400 mt-1">Resuming consultations shortly</p>
                      </div>
                    ) : isEmergency ? (
                      <div className="py-2">
                        <div className="text-2xl font-bold text-rose-400">EMERGENCY CASE</div>
                        <p className="text-xs text-slate-400 mt-1">Room temporarily restricted</p>
                      </div>
                    ) : isServing ? (
                      <div>
                        <div className="text-6xl md:text-7xl font-mono font-black tracking-tight text-blue-300 drop-shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                          {room.current_ticket}
                        </div>
                        <div className="text-base font-semibold text-slate-300 mt-2">
                          {room.current_patient_name}
                        </div>
                      </div>
                    ) : (
                      <div className="py-3">
                        <div className="text-xl font-bold text-slate-500">READY FOR NEXT PATIENT</div>
                        <p className="text-xs text-slate-500 mt-1">Please stand by</p>
                      </div>
                    )}
                  </div>

                  {/* Next Up Queue Numbers */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Next In Line:</span>
                    <div className="flex items-center gap-2">
                      {room.next_tickets?.length > 0 ? (
                        room.next_tickets.map((t: string) => (
                          <span
                            key={t}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono font-bold border border-slate-700"
                          >
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 italic">No waiting tickets</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Bottom Ticker & Clinic Status Strip */}
      <footer className="bg-slate-900 border-t border-slate-800 px-8 py-3.5 flex items-center justify-between text-sm shadow-inner">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />
            <span className="font-semibold text-xs uppercase tracking-wider text-slate-400">Hospital Status:</span>
            <span className="font-medium text-blue-300">Live & Operating</span>
          </div>

          <div className="hidden md:flex items-center gap-5 text-xs text-slate-400 font-medium border-l border-slate-800 pl-6">
            <span>
              Total In Queue: <strong className="text-slate-200 font-mono">{data?.total_waiting || 0}</strong>
            </span>
            <span>
              Now Serving: <strong className="text-blue-400 font-mono">{data?.total_serving || 0}</strong>
            </span>
            <span>
              Completed Today: <strong className="text-emerald-400 font-mono">{data?.total_completed || 0}</strong>
            </span>
          </div>
        </div>

        {/* Scrolling News / Notice Ticker */}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="hidden sm:inline">
            Please prepare your government ID, HMO card, or Senior / PWD booklet upon entering the doctor's room.
          </span>
          <span className="sm:hidden">Keep your queue pass ready.</span>
        </div>
      </footer>
    </div>
  );
};
