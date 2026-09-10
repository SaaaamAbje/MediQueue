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
      {/* Isolated System Indicator */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-4 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-white shadow-2xs text-slate-700 border border-slate-200 inline-flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isPatient ? 'bg-teal-500' : isDoctor ? 'bg-sky-500' : 'bg-purple-500'}`} />
          <span>Isolated {isPatient ? 'Patient Portal' : isDoctor ? 'Doctor Workstation' : 'Admin Console'}</span>
        </span>
        {onSelectSystem && (
          <div className="flex items-center gap-1.5 text-xs">
            {!isPatient && (
              <button
                type="button"
                onClick={() => onSelectSystem('patient')}
                className="text-teal-700 hover:text-teal-900 font-medium hover:underline text-[11px]"
              >
                Patient
              </button>
            )}
            {!isDoctor && (
              <button
                type="button"
                onClick={() => onSelectSystem('doctor')}
                className="text-sky-700 hover:text-sky-900 font-medium hover:underline text-[11px]"
              >
                Doctor
              </button>
            )}
            {!isAdmin && (
              <button
                type="button"
                onClick={() => onSelectSystem('admin')}
                className="text-purple-700 hover:text-purple-900 font-medium hover:underline text-[11px]"
              >
                Admin
              </button>
            )}
          </div>
        )}
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
          {/* Quick Demo Login Bar for this System */}
          <div
            className={`mb-6 p-3.5 rounded-xl border ${
              isPatient
                ? 'bg-teal-50/80 border-teal-200 text-teal-900'
                : isDoctor
                ? 'bg-sky-50/80 border-sky-200 text-sky-900'
                : 'bg-purple-50/80 border-purple-200 text-purple-900'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                1-Click Instant Demo Sign-In
              </span>
              <Sparkles className="w-3.5 h-3.5" />
            </div>

            {isPatient && (
              <button
                type="button"
                onClick={() => handleQuickLogin('PATIENT')}
                disabled={isLoading}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-white border border-teal-200 text-teal-900 hover:bg-teal-100/70 hover:border-teal-300 transition-all text-xs font-semibold shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-teal-600 shrink-0" />
                  <div className="text-left">
                    <div>Enter as Maria Santos (Patient)</div>
                    <div className="text-[10px] text-teal-700 font-normal">
                      maria.santos@email.ph
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-teal-700" />
              </button>
            )}

            {isDoctor && (
              <button
                type="button"
                onClick={() => handleQuickLogin('DOCTOR')}
                disabled={isLoading}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-white border border-sky-200 text-sky-900 hover:bg-sky-100/70 hover:border-sky-300 transition-all text-xs font-semibold shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-sky-600 shrink-0" />
                  <div className="text-left">
                    <div>Enter as Dr. Sarah Ramos, MD (Cardiology)</div>
                    <div className="text-[10px] text-sky-700 font-normal">
                      dr.sarah.ramos@mediqueue.clinic • Room 102
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-sky-700" />
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN')}
                disabled={isLoading}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-white border border-purple-200 text-purple-900 hover:bg-purple-100/70 hover:border-purple-300 transition-all text-xs font-semibold shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-600 shrink-0" />
                  <div className="text-left">
                    <div>Enter as Clinic Operations Admin</div>
                    <div className="text-[10px] text-purple-700 font-normal">
                      admin@mediqueue.clinic • Full Access
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-purple-700" />
              </button>
            )}
          </div>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-500 font-medium">Or enter credentials</span>
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

          {/* Switch to other portals */}
          {onSelectSystem && (
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-1.5 text-center">
              <div className="text-[11px] text-slate-400 font-medium">Switch to a different isolated system:</div>
              <div className="flex items-center justify-center gap-3 text-xs">
                {!isPatient && (
                  <button
                    type="button"
                    onClick={() => onSelectSystem('patient')}
                    className="text-teal-600 hover:underline font-semibold"
                  >
                    Patient Portal
                  </button>
                )}
                {!isDoctor && (
                  <button
                    type="button"
                    onClick={() => onSelectSystem('doctor')}
                    className="text-sky-600 hover:underline font-semibold"
                  >
                    Doctor Workstation
                  </button>
                )}
                {!isAdmin && (
                  <button
                    type="button"
                    onClick={() => onSelectSystem('admin')}
                    className="text-purple-600 hover:underline font-semibold"
                  >
                    Admin Console
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
