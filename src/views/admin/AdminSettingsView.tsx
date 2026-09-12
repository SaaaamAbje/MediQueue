import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  Settings,
  Building,
  Clock,
  RotateCcw,
  Save,
  Volume2,
  Bell,
  ShieldAlert,
  MapPin,
  Plus,
  CheckCircle,
} from 'lucide-react';
import { ClinicBranch } from '../../types';

export const AdminSettingsView: React.FC = () => {
  const { showToast } = useNotifications();

  const [settings, setSettings] = useState<any>({
    clinic_name: 'Makati Medical Center',
    tagline: 'Trusted healthcare at the heart of Makati',
    address: '2 Amorsolo Street, Legaspi Village, Makati City, Metro Manila 1229',
    contact_phone: '+63 2 8888 8999',
    emergency_phone: '+63 2 8888 8911',
    operating_hours: 'Monday to Sunday, 24/7 Operations',
    queue_prefix: 'M',
    avg_consultation_minutes: 30,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [branches, setBranches] = useState<ClinicBranch[]>([]);
  const [showAddBranch, setShowAddBranch] = useState<boolean>(false);
  const [newBranch, setNewBranch] = useState<Partial<ClinicBranch>>({
    name: '',
    code: '',
    address: '',
    city: 'Metro Manila',
    contact_phone: '+63 2 8000 1111',
    operating_hours: '8:00 AM - 5:00 PM',
    is_main: false,
    is_active: true,
  });

  useEffect(() => {
    api.getClinicSettings().then(setSettings).catch(console.error);
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await api.getBranches();
      setBranches(res.branches || []);
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const handleSaveNewBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveBranch(newBranch);
      showToast('success', 'Branch Added', `Satellite branch ${newBranch.name} saved.`);
      setShowAddBranch(false);
      setNewBranch({
        name: '',
        code: '',
        address: '',
        city: 'Metro Manila',
        contact_phone: '+63 2 8000 1111',
        operating_hours: '8:00 AM - 5:00 PM',
        is_main: false,
        is_active: true,
      });
      fetchBranches();
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'Failed to save branch');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateClinicSettings(settings);
      showToast('success', 'Settings Saved', 'Clinic configuration updated.');
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSeed = async () => {
    setIsResetting(true);
    try {
      const res = await api.resetSeedData();
      showToast('success', 'Database Reset', res.message);
      setIsResetConfirmOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      showToast('error', 'Reset Failed', err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const playTestChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.3); // G5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
      showToast('info', 'Audio Chime', 'Playing patient call notification chime.');
    } catch {
      showToast('warning', 'Audio', 'Audio context blocked by browser.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Clinic General Settings</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure clinic identity, contact channels, queue generation rules, and database seed
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={playTestChime}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-100"
          >
            <Volume2 className="w-4 h-4 text-blue-600" />
            Test Audio Chime
          </button>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          Clinic Profile &amp; Location
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Clinic Name</label>
            <input
              type="text"
              name="clinic_name"
              value={settings.clinic_name || ''}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Clinic Slogan / Tagline</label>
            <input
              type="text"
              name="tagline"
              value={settings.tagline || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Reception Phone</label>
            <input
              type="text"
              name="contact_phone"
              value={settings.contact_phone || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Emergency Hot Line</label>
            <input
              type="text"
              name="emergency_phone"
              value={settings.emergency_phone || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Clinic Address</label>
          <input
            type="text"
            name="address"
            value={settings.address || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Official Operating Hours</label>
          <input
            type="text"
            name="operating_hours"
            value={settings.operating_hours || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
          />
        </div>

        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 pt-2">
          Queue System Configuration
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Queue Ticket Prefix</label>
            <input
              type="text"
              name="queue_prefix"
              value={settings.queue_prefix || 'A'}
              onChange={handleChange}
              maxLength={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">Generated ticket format: [Prefix]001, [Prefix]002...</p>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Estimated Consultation Time (Minutes)
            </label>
            <input
              type="number"
              name="avg_consultation_minutes"
              min={5}
              max={120}
              value={settings.avg_consultation_minutes || 20}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">Used to compute estimated wait time on patient tickets</p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Satellite Branch Network Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Makati Med Health Network</h3>
              <p className="text-xs text-slate-500">Multi-location satellite clinics and specialized medical centers</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddBranch(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Satellite Branch
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map((b) => (
            <div
              key={b.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 relative"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    {b.name}
                    {b.is_main && (
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold uppercase">
                        Main Flagship
                      </span>
                    )}
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                    Code: {b.code}
                  </span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    b.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {b.is_active ? 'Operational' : 'Inactive'}
                </span>
              </div>

              <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-200">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Address:</span> {b.address}, {b.city}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Phone:</span> {b.contact_phone}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Hours:</span> {b.operating_hours}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal for adding a new branch */}
        {showAddBranch && (
          <div className="p-4 border border-blue-200 bg-blue-50/40 rounded-xl space-y-3">
            <h4 className="font-bold text-blue-900 text-xs">Register New Satellite Branch</h4>
            <form onSubmit={handleSaveNewBranch} className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Branch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Makati Med Satellite Pasay"
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Branch Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MMC-PASAY"
                  value={newBranch.code}
                  onChange={(e) => setNewBranch({ ...newBranch, code: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit 204 South Wing, Commercial Hub"
                  value={newBranch.address}
                  onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="+63 2 8999 0000"
                  value={newBranch.contact_phone}
                  onChange={(e) => setNewBranch({ ...newBranch, contact_phone: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Operating Hours</label>
                <input
                  type="text"
                  placeholder="8:00 AM - 5:00 PM"
                  value={newBranch.operating_hours}
                  onChange={(e) => setNewBranch({ ...newBranch, operating_hours: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                />
              </div>
              <div className="col-span-2 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBranch(false)}
                  className="px-3 py-1.5 rounded bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
                >
                  Save Satellite Branch
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Danger Zone: Reset Seed Data */}
      <div className="bg-white rounded-2xl border border-rose-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
          <ShieldAlert className="w-5 h-5" />
          Clinic Demo &amp; Factory Reset
        </div>
        <p className="text-xs text-slate-600">
          Reset all tables, seed users, demo patients, doctors, sample appointments, and live queue tickets back to their fresh baseline demo state.
        </p>
        <button
          type="button"
          onClick={() => setIsResetConfirmOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg hover:bg-rose-100"
        >
          <RotateCcw className="w-4 h-4" /> Reset to Initial Demo Data
        </button>
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetSeed}
        title="Reset Entire Database to Seed State"
        message="This will reset all appointments, queue items, notifications, and reset demo credentials back to initial seed data. Do you want to continue?"
        isDestructive={true}
        confirmText={isResetting ? 'Resetting...' : 'Reset All Data'}
      />
    </div>
  );
};
