import React, { useState } from 'react';
import { api } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { Stethoscope, Mail, Lock, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface ForgotPasswordViewProps {
  onNavigate: (view: any) => void;
}

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({ onNavigate }) => {
  const { showToast } = useNotifications();

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await api.forgotPassword(email);
      setHint(res.reset_hint || 'Use reset code: MMC-RESET-2026');
      setResetCode('MMC-RESET-2026');
      setStep('reset');
      showToast('info', 'Reset Dispatched', 'Reset code has been generated for demo purposes.');
    } catch (err: any) {
      setError(err.message || 'Failed to process password reset request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      await api.resetPassword({
        email,
        reset_code: resetCode,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      showToast('success', 'Password Updated', 'You can now sign in with your new password.');
      onNavigate('login');
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center py-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-white flex items-center justify-center overflow-hidden shadow-lg shadow-blue-600/10 mb-3 ring-1 ring-slate-100">
          <img 
            src="/assets/images/mmc_logo.jpg" 
            alt="Makati Medical Center Logo" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Reset Password
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Recover access to your Makati Medical Center patient or clinic account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200 sm:px-10">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          {step === 'request' ? (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">Registered Email Address</label>
                <div className="mt-1 relative rounded-md shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.ph"
                    required
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {hint && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg flex items-center gap-2 text-xs text-teal-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-600" />
                  <span>{hint}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700">Reset Verification Code</label>
                <div className="mt-1 relative rounded-md shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="MMC-RESET-2026"
                    required
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">New Password</label>
                <div className="mt-1 relative rounded-md shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Confirm New Password</label>
                <div className="mt-1 relative rounded-md shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Updating Password...' : 'Save New Password'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
