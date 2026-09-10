import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Bell,
  Clock,
  CheckCircle2,
  Users,
  Smartphone,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import { SmsLog, QueueItem } from '../../types';

export const AdminSmsDispatcherView: React.FC = () => {
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [autoDispatcherEnabled, setAutoDispatcherEnabled] = useState<boolean>(true);

  // Manual Dispatch Form State
  const [recipientPhone, setRecipientPhone] = useState<string>('+63 917 123 4567');
  const [recipientName, setRecipientName] = useState<string>('Juan Dela Cruz');
  const [messageText, setMessageText] = useState<string>(
    'MediQueue ALERT: You are next in line! Ticket #A002. Please proceed to Consultation Room 101.'
  );
  const [smsType, setSmsType] = useState<string>('queue_proximity');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [logsRes, queueRes] = await Promise.all([
        api.getSmsLogs(50),
        api.getTodayQueue(),
      ]);
      setLogs(logsRes.logs || []);
      setQueueItems(queueRes || []);
    } catch (err) {
      console.error('Failed to load SMS dispatcher data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, []);

  const handleSendManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientPhone || !messageText) return;

    setIsSending(true);
    setFeedback(null);
    try {
      await api.sendSms({
        recipient_phone: recipientPhone,
        recipient_name: recipientName,
        message: messageText,
        type: smsType,
      });
      setFeedback('SMS successfully dispatched and delivered to recipient phone.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch SMS');
    } finally {
      setIsSending(false);
    }
  };

  const setTemplate = (type: string) => {
    setSmsType(type);
    if (type === 'queue_proximity') {
      setMessageText('MediQueue ALERT: You are next in line! Ticket #A002. Please proceed to Consultation Room 101.');
    } else if (type === 'appointment_reminder') {
      setMessageText('MediQueue: Reminder for your clinic consultation tomorrow at 9:00 AM. Ref #APT-2026-0001. Reply C to cancel.');
    } else if (type === 'lab_ready') {
      setMessageText('MediQueue LAB: Your diagnostic test results have been certified and released. View them now on your portal.');
    } else if (type === 'urgent_call') {
      setMessageText('MediQueue URGENT: The physician is ready for you now in Room 101. Please proceed immediately.');
    }
  };

  const handleQuickProximitySend = async (patientName: string, phone: string, ticket: string, room: string) => {
    try {
      await api.sendSms({
        recipient_phone: phone || '+63 917 000 1122',
        recipient_name: patientName,
        message: `MediQueue ALERT: You are next in line! Ticket #${ticket}. Please proceed to Doctor's Room ${room}.`,
        type: 'queue_proximity',
      });
      fetchData();
      alert(`Proximity SMS sent to ${patientName}!`);
    } catch (err: any) {
      alert(err.message || 'Failed to send proximity alert');
    }
  };

  const waitingPatients = queueItems.filter((q) => q.status === 'waiting');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-violet-700 mb-1">
            <MessageSquare className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Automated Messaging Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">SMS & Queue Proximity Dispatcher</h1>
          <p className="text-sm text-slate-500">
            Dispatch proximity SMS notifications when patients are within 1–2 spots of being called, reducing lobby crowding.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-violet-50 px-3 py-1.5 rounded-lg border border-violet-200">
            <span className="text-xs font-semibold text-violet-900">Auto-Proximity Daemon:</span>
            <button
              onClick={() => setAutoDispatcherEnabled(!autoDispatcherEnabled)}
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase transition-colors ${
                autoDispatcherEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
              }`}
            >
              {autoDispatcherEnabled ? 'Active' : 'Paused'}
            </button>
          </div>
          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Queue Proximity Watchlist */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-600" />
                <h2 className="font-semibold text-slate-900">Live Waiting Patients (Proximity Target)</h2>
              </div>
              <span className="text-xs bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full font-semibold">
                {waitingPatients.length} Waiting
              </span>
            </div>

            {waitingPatients.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No patients currently waiting in the active queue.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {waitingPatients.slice(0, 6).map((q, index) => {
                  const isNextInLine = index < 2;
                  return (
                    <div
                      key={q.id}
                      className={`p-4 flex items-center justify-between transition-colors ${
                        isNextInLine ? 'bg-amber-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                            isNextInLine
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          #{q.queue_number}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-sm">
                              {q.patient ? `${q.patient.first_name} ${q.patient.last_name}` : 'Patient'}
                            </span>
                            {isNextInLine && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold uppercase tracking-wide">
                                Next in line ({index === 0 ? '1st' : '2nd'} spot)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            Dr. {q.doctor ? `${q.doctor.first_name} ${q.doctor.last_name}` : 'Doctor'} • Room {q.doctor?.room_number || '101'}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          handleQuickProximitySend(
                            q.patient ? `${q.patient.first_name} ${q.patient.last_name}` : 'Patient',
                            q.patient?.contact_number || '+63 917 123 4567',
                            q.queue_number,
                            q.doctor?.room_number || '101'
                          )
                        }
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 flex items-center gap-1.5 shadow-sm"
                      >
                        <Send className="w-3 h-3" />
                        Send Alert SMS
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SMS Dispatch History Logs */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">SMS Outbox & Delivery History</h2>
              <span className="text-xs text-slate-500">Last 50 dispatches</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-50 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-3.5 h-3.5 text-violet-600" />
                      <strong className="text-slate-900">{log.recipient_name}</strong>
                      <span className="text-slate-500 font-mono">({log.recipient_phone})</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] uppercase font-semibold">
                        {log.type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="capitalize">{log.status}</span>
                      <span className="text-slate-400 ml-1">
                        • {new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 font-mono text-[11px]">
                    "{log.message}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Manual Dispatch Console */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5 h-fit">
          <div className="flex items-center gap-2 text-slate-900 font-bold border-b pb-3">
            <Send className="w-5 h-5 text-violet-600" />
            <h2>Instant SMS Dispatcher</h2>
          </div>

          {feedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 block">Quick Template:</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setTemplate('queue_proximity')}
                className={`p-2 rounded-lg border text-left font-medium transition-colors ${
                  smsType === 'queue_proximity'
                    ? 'border-violet-500 bg-violet-50 text-violet-900'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                🔔 Next in Line
              </button>
              <button
                type="button"
                onClick={() => setTemplate('appointment_reminder')}
                className={`p-2 rounded-lg border text-left font-medium transition-colors ${
                  smsType === 'appointment_reminder'
                    ? 'border-violet-500 bg-violet-50 text-violet-900'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                📅 Appt Reminder
              </button>
              <button
                type="button"
                onClick={() => setTemplate('lab_ready')}
                className={`p-2 rounded-lg border text-left font-medium transition-colors ${
                  smsType === 'lab_ready'
                    ? 'border-violet-500 bg-violet-50 text-violet-900'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                🧪 Lab Results Ready
              </button>
              <button
                type="button"
                onClick={() => setTemplate('urgent_call')}
                className={`p-2 rounded-lg border text-left font-medium transition-colors ${
                  smsType === 'urgent_call'
                    ? 'border-violet-500 bg-violet-50 text-violet-900'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                🚨 Urgent Room Call
              </button>
            </div>
          </div>

          <form onSubmit={handleSendManual} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Recipient Mobile Number *</label>
              <input
                type="text"
                required
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="+63 917 123 4567"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Patient / Recipient Name</label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Juan Dela Cruz"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-slate-700">Message Content (SMS) *</label>
                <span className="text-[10px] text-slate-400">{messageText.length} / 160 chars</span>
              </div>
              <textarea
                rows={4}
                required
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Send className="w-4 h-4" />
              {isSending ? 'Transmitting via Telco Gateway...' : 'Send SMS Notification'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
