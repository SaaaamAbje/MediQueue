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
}

export const LoginView: React.FC<LoginViewProps> = ({
  onNavigate,
  targetSystem = 'patient',
}) => {
  const { login, quickSwitch, isLoading } = useAuth();
  const { showToast } = useNotifications();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);

  // Set default credentials based on targetSystem
  useEffect(() => {
    if (targetSystem === 'patient') {
      setEmail('maria.santos@email.ph');
      setPassword('password123');
    } else if (targetSystem === 'doctor') {
      setEmail('dr.sarah.ramos@mediqueue.clinic');
      setPassword('password123');
    } else if (targetSystem === 'admin') {
      setEmail('admin@mediqueue.clinic');
      setPassword('password123');
    }
  }, [targetSystem]);

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
    <div className="min-h-[80vh] flex flex-col justify-center py-6 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-4 flex items-center justify-center">
        <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-white shadow-2xs text-slate-700 border border-slate-200 inline-flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isPatient ? 'bg-teal-500' : isDoctor ? 'bg-sky-500' : 'bg-purple-500'}`} />
          <span>{isPatient ? 'Patient Portal' : isDoctor ? 'Doctor Workstation' : 'Admin Console'}</span>
        </span>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* System-specific Icon & Badge */}
        {isPatient && (
          <div className="mx-auto w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-600/30 mb-3">
            <Heart className="w-7 h-7" />
          </div>
        )}
        {isDoctor && (
          <div className="mx-auto w-14 h-14 rounded-2xl bg-sky-600 flex items-center justify-center text-white shadow-lg shadow-sky-600/30 mb-3">
            <Stethoscope className="w-7 h-7" />
          </div>
        )}
        {isAdmin && (
          <div className="mx-auto w-14 h-14 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30 mb-3">
            <Shield className="w-7 h-7" />
          </div>
        )}

        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          {isPatient && 'Patient Self-Service Portal'}
          {isDoctor && 'Physician Clinical Workstation'}
          {isAdmin && 'Clinic Operations & Admin Console'}
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          {isPatient && 'Book consultations, check live queue status, and access medical records'}
          {isDoctor && 'Room 102 outpatient queue, consultation room timer, and digital prescription builder'}
          {isAdmin && 'Central queue oversight, walk-in ticketing, doctor schedules, and audit trails'}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200 sm:px-10">
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
                  placeholder="user@mediqueue.clinic"
                  required
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white font-medium"
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
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg shadow-sm text-xs font-bold text-white transition-colors cursor-pointer disabled:opacity-50 ${
                isPatient
                  ? 'bg-teal-600 hover:bg-teal-700'
                  : isDoctor
                  ? 'bg-sky-600 hover:bg-sky-700'
                  : 'bg-purple-700 hover:bg-purple-800'
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
                New patient at MediQueue?{' '}
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

          {/* Unified Login Label */}
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-1.5 text-center">
            <div className="text-[11px] text-slate-400 font-medium italic">
              Secure institutional access requires specific verified credentials.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
