import React, { useState, useEffect } from 'react';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  Share2,
  MessageSquare,
  FileText,
  Send,
  User,
  Shield,
  Pill,
  Sparkles,
  ChevronRight,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import { TelemedSession, Patient, Doctor } from '../../types';

interface TelemedicineRoomViewProps {
  onLeaveCall?: () => void;
  userRole?: 'PATIENT' | 'DOCTOR' | 'ADMIN';
}

export const TelemedicineRoomView: React.FC<TelemedicineRoomViewProps> = ({
  onLeaveCall,
  userRole = 'DOCTOR',
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [activeSideTab, setActiveSideTab] = useState<'chat' | 'notes' | 'rx'>('notes');

  // Call duration counter
  const [secondsElapsed, setSecondsElapsed] = useState<number>(245); // start with an active session time

  // In-call chat
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: string; time: string; text: string; isDoctor: boolean }>
  >([
    { sender: 'Dr. Maria Santos', time: '10:02 AM', text: 'Good morning Juan, can you hear me clearly?', isDoctor: true },
    { sender: 'Juan Dela Cruz', time: '10:03 AM', text: 'Yes doc, loud and clear!', isDoctor: false },
  ]);
  const [chatInput, setChatInput] = useState<string>('');

  // Clinical notes (Doctor)
  const [clinicalNotes, setClinicalNotes] = useState<string>(
    'Patient reports improved morning blood pressure (averaging 124/80 mmHg). No ankle edema. Advised to maintain low sodium diet and continue Amlodipine 5mg once daily.'
  );

  // Digital Prescription
  const [rxText, setRxText] = useState<string>(
    '1. Amlodipine 5mg Tablet - #30 tabs (Sig: 1 tab OD every morning)\n2. Co-Amoxiclav 625mg - #14 tabs (Sig: 1 tab BID for 7 days)'
  );
  const [rxSent, setRxSent] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages([
      ...chatMessages,
      {
        sender: userRole === 'DOCTOR' ? 'Dr. Maria Santos' : 'Juan Dela Cruz',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: chatInput,
        isDoctor: userRole === 'DOCTOR',
      },
    ]);
    setChatInput('');
  };

  const handleSendRx = () => {
    setRxSent(true);
    setTimeout(() => setRxSent(false), 4000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-slate-950 text-white rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Top Telehealth Status Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Telemedicine Virtual Consultation Room
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
                SECURE-E2EE
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Session Code: <span className="font-mono text-slate-200">MEDIQUEUE-TEL-9981</span> • Duration: {formatDuration(secondsElapsed)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onLeaveCall && (
            <button
              onClick={onLeaveCall}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              End Consultation
            </button>
          )}
        </div>
      </div>

      {/* Main Split Interface */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Video Stage Area */}
        <div className="flex-1 bg-slate-900 p-4 flex flex-col justify-between relative overflow-hidden">
          {/* Main Remote Video (Patient if Doctor view, Doctor if Patient view) */}
          <div className="flex-1 rounded-xl bg-slate-800 border border-slate-700 relative overflow-hidden flex items-center justify-center">
            {isScreenSharing ? (
              <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
                <Share2 className="w-12 h-12 text-indigo-400 mb-3 animate-bounce" />
                <h3 className="text-lg font-bold text-white">Screen Sharing Active</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Displaying chest X-ray digital radiograph and lab findings to remote patient.
                </p>
              </div>
            ) : isVideoOff ? (
              <div className="flex flex-col items-center text-slate-400">
                <VideoOff className="w-12 h-12 mb-2" />
                <span className="text-sm">Video Feed Paused</span>
              </div>
            ) : (
              <div className="w-full h-full relative flex items-center justify-center bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950">
                {/* Simulated high-fidelity clinical video avatar */}
                <div className="flex flex-col items-center">
                  <div className="w-28 h-28 rounded-full border-4 border-indigo-500/30 flex items-center justify-center bg-indigo-950 text-indigo-200 text-3xl font-bold shadow-2xl mb-3">
                    {userRole === 'DOCTOR' ? 'JD' : 'DR'}
                  </div>
                  <h4 className="font-semibold text-white text-base">
                    {userRole === 'DOCTOR' ? 'Juan Dela Cruz (Patient)' : 'Dr. Maria Santos, MD'}
                  </h4>
                  <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Connected (720p HD)
                  </p>
                </div>

                {/* Self Picture-in-Picture feed (bottom right) */}
                <div className="absolute bottom-4 right-4 w-44 h-32 rounded-xl bg-slate-950 border-2 border-slate-700 shadow-2xl flex flex-col items-center justify-center p-2 text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs mb-1">
                    You
                  </div>
                  <span className="text-[11px] font-semibold text-slate-300">
                    {userRole === 'DOCTOR' ? 'Dr. Maria Santos' : 'Juan Dela Cruz'}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {isMuted ? 'Muted' : 'Mic Active'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Floating Call Controls */}
          <div className="pt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-3 rounded-full transition-colors ${
                isMuted ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-800 hover:bg-slate-700'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setIsVideoOff(!isVideoOff)}
              className={`p-3 rounded-full transition-colors ${
                isVideoOff ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-800 hover:bg-slate-700'
              }`}
              title={isVideoOff ? 'Start Video' : 'Stop Video'}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setIsScreenSharing(!isScreenSharing)}
              className={`p-3 rounded-full transition-colors ${
                isScreenSharing ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-700'
              }`}
              title="Share Screen"
            >
              <Share2 className="w-5 h-5" />
            </button>

            {onLeaveCall && (
              <button
                onClick={onLeaveCall}
                className="px-5 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-2 transition-colors ml-4"
              >
                <PhoneOff className="w-5 h-5" />
                Leave Call
              </button>
            )}
          </div>
        </div>

        {/* Clinical Side Panel (Chat, Notes, Rx) */}
        <div className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveSideTab('notes')}
              className={`flex-1 py-3 text-center transition-colors flex items-center justify-center gap-1.5 ${
                activeSideTab === 'notes'
                  ? 'border-b-2 border-indigo-500 text-indigo-400 bg-slate-800/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Clinical Notes
            </button>
            <button
              onClick={() => setActiveSideTab('rx')}
              className={`flex-1 py-3 text-center transition-colors flex items-center justify-center gap-1.5 ${
                activeSideTab === 'rx'
                  ? 'border-b-2 border-indigo-500 text-indigo-400 bg-slate-800/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              E-Prescription
            </button>
            <button
              onClick={() => setActiveSideTab('chat')}
              className={`flex-1 py-3 text-center transition-colors flex items-center justify-center gap-1.5 ${
                activeSideTab === 'chat'
                  ? 'border-b-2 border-indigo-500 text-indigo-400 bg-slate-800/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              In-Call Chat
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
            {activeSideTab === 'notes' && (
              <div className="space-y-4">
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700 space-y-1">
                  <span className="font-semibold text-slate-300 block">Patient Vitals Snapshot</span>
                  <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px] pt-1">
                    <div>BP: <strong className="text-white">124/80 mmHg</strong></div>
                    <div>Heart Rate: <strong className="text-white">72 bpm</strong></div>
                    <div>Temp: <strong className="text-white">36.7 °C</strong></div>
                    <div>SpO2: <strong className="text-white">99%</strong></div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300 block">
                    Attending Physician Live Notes
                  </label>
                  <textarea
                    rows={8}
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    className="w-full p-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs font-sans focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Notes will be synced automatically to the patient's Electronic Medical Record upon call completion.
                  </p>
                </div>
              </div>
            )}

            {activeSideTab === 'rx' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300 block">
                    Digital E-Prescription
                  </label>
                  <textarea
                    rows={6}
                    value={rxText}
                    onChange={(e) => setRxText(e.target.value)}
                    className="w-full p-3 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSendRx}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Sign & Issue E-Prescription to Patient
                </button>

                {rxSent && (
                  <div className="p-3 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-lg flex items-center gap-2 text-xs">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>Digital prescription sent to patient portal and pharmacy dispensing queue!</span>
                  </div>
                )}
              </div>
            )}

            {activeSideTab === 'chat' && (
              <div className="flex flex-col h-full justify-between">
                <div className="space-y-3 overflow-y-auto max-h-72 pr-1">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-lg text-xs space-y-0.5 ${
                        msg.isDoctor
                          ? 'bg-indigo-950/80 border border-indigo-800/60 ml-4'
                          : 'bg-slate-800 border border-slate-700 mr-4'
                      }`}
                    >
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-200">{msg.sender}</span>
                        <span>{msg.time}</span>
                      </div>
                      <p className="text-slate-100">{msg.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="pt-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="Type message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
