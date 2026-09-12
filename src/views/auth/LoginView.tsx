import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  Stethoscope,
  Lock,
  Mail,
  ArrowRight,
  UserCheck,
  Shield,
  Heart,
  ArrowLeft,
  Building2,
  Sparkles,
} from 'lucide-react';

interface LoginViewProps {
  onNavigate: (view: string) => void;
  targetSystem?: 'patient' | 'doctor' | 'admin';
  onSelectSystem?: (system: 'patient' | 'doctor' | 'admin') => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onNavigate,
  targetSystem = 'patient',
  onSelectSystem,
}) => {
  const { login, quickSwitch, isLoading } = useAuth();
  const { showToast } = useNotifications();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    try {
      await login(email.trim(), password);
      showToast('success', 'Welcome Back', 'Logged in successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in.');
    }
  };

  const handleQuickLogin = async (role: 'PATIENT' | 'DOCTOR' | 'ADMIN') => {
    setError(null);
    try {
      await quickSwitch(role);
      showToast('success', 'System Access Granted', `Authenticated into ${role} subsystem.`);
    } catch (err: any) {
      setError(err.message || 'Quick login failed.');
    }
  };

  const isPatient = targetSystem === 'patient';
  const isDoctor = targetSystem === 'doctor';
  const isAdmin = targetSystem === 'admin';

  return (
    <div className="min-h-screen flex flex-col justify-center relative overflow-hidden bg-slate-50">
      {/* Light Professional Hospital Background */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/src/assets/images/hospital_login_bg_1789109420944.jpg" 
          alt="Hospital Background" 
          className="w-full h-full object-cover opacity-60"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-white/20" />
      </div>

      <div className="relative z-10 py-6 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          {/* Hospital Logo Asset */}
          <div className="mx-auto w-20 h-20 rounded-3xl bg-white p-3 shadow-xl mb-6 ring-1 ring-slate-100 overflow-hidden">
            <img 
              src="/src/assets/images/makati_medical_center_logo_1789222548043.jpg" 
              alt="Makati Medical Center Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
            Makati Medical Center
          </h2>
          <p className="mt-2 text-sm text-slate-600 font-medium">
            {isPatient && 'Patient Self-Service Portal'}
            {isDoctor && 'Physician Clinical Workstation'}
            {isAdmin && 'Hospital Operations & Admin Console'}
          </p>
        </div>
        <p className="mt-1 text-xs text-slate-500 text-center px-4">
          {isPatient && 'Book consultations, check live queue status, and access medical records'}
          {isDoctor && 'Room 102 outpatient queue, consultation room timer, and digital prescription builder'}
          {isAdmin && 'Central queue oversight, walk-in ticketing, doctor schedules, and audit trails'}
        </p>
      </div>

      <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-2xl shadow-slate-200/60 rounded-2xl border border-slate-100 sm:px-10">
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-500 font-medium">Authentication</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium text-slate-700">Account Email</label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@makatimed.ph"
                  required
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password')}
                  className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="mt-1 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg shadow-sm text-xs font-bold text-white transition-colors cursor-pointer disabled:opacity-50 ${
                isPatient
                  ? 'bg-blue-700 hover:bg-blue-800'
                  : isDoctor
                  ? 'bg-indigo-700 hover:bg-indigo-800'
                  : 'bg-slate-800 hover:bg-slate-900'
              }`}
            >
              {isLoading ? (
                'Authenticating...'
              ) : (
                <>
                  <span>Sign In to {isPatient ? 'Patient Portal' : isDoctor ? 'Doctor Workstation' : 'Admin Console'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {isPatient && (
            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-600">
                New patient at Makati Med?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('register')}
                  className="font-semibold text-teal-600 hover:text-teal-800"
                >
                  Register as Patient
                </button>
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
