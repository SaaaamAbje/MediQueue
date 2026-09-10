import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastContainer } from './components/common/ToastContainer';
import { Navbar } from './components/layout/Navbar';
import { QueueItem } from './types/index';

// Auth Views
import { LoginView } from './views/auth/LoginView';
import { RegisterView } from './views/auth/RegisterView';
import { ForgotPasswordView } from './views/auth/ForgotPasswordView';

// Patient Views
import { PatientDashboardView } from './views/patient/PatientDashboardView';
import { BookAppointmentView } from './views/patient/BookAppointmentView';
import { MyAppointmentsView } from './views/patient/MyAppointmentsView';
import { PatientQueueView } from './views/patient/PatientQueueView';
import { PatientConsultationsView } from './views/patient/PatientConsultationsView';
import { PatientProfileView } from './views/patient/PatientProfileView';

// Doctor Views
import { DoctorDashboardView } from './views/doctor/DoctorDashboardView';
import { DoctorQueueView } from './views/doctor/DoctorQueueView';
import { DoctorConsultationRoomView } from './views/doctor/DoctorConsultationRoomView';
import { DoctorAppointmentsView } from './views/doctor/DoctorAppointmentsView';
import { DoctorPatientsView } from './views/doctor/DoctorPatientsView';
import { DoctorProfileView } from './views/doctor/DoctorProfileView';

// Admin Views
import { AdminDashboardView } from './views/admin/AdminDashboardView';
import { AdminQueueView } from './views/admin/AdminQueueView';
import { AdminAppointmentsView } from './views/admin/AdminAppointmentsView';
import { AdminPatientsView } from './views/admin/AdminPatientsView';
import { AdminDoctorsView } from './views/admin/AdminDoctorsView';
import { AdminSchedulesView } from './views/admin/AdminSchedulesView';
import { AdminReportsView } from './views/admin/AdminReportsView';
import { AdminAuditLogsView } from './views/admin/AdminAuditLogsView';
import { AdminSettingsView } from './views/admin/AdminSettingsView';
import { AdminBillingView } from './views/admin/AdminBillingView';
import { AdminPharmacyView } from './views/admin/AdminPharmacyView';
import { AdminLabWorkbenchView } from './views/admin/AdminLabWorkbenchView';
import { AdminSmsDispatcherView } from './views/admin/AdminSmsDispatcherView';
import { TelemedicineRoomView } from './views/telemedicine/TelemedicineRoomView';

// Display Views
import { PublicQueueTvView } from './views/display/PublicQueueTvView';

import { Heart, Stethoscope, Shield, ArrowRight } from 'lucide-react';

export type SystemType = 'patient' | 'doctor' | 'admin';

const detectInitialSystem = (): SystemType => {
  // 1. Inspect URL pathname or hash for direct deep links (/doctor, /admin, /patient)
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  if (path.includes('doctor') || hash.includes('doctor')) return 'doctor';
  if (path.includes('admin') || hash.includes('admin')) return 'admin';
  if (path.includes('patient') || hash.includes('patient')) return 'patient';

  // 2. Inspect persisted system choice
  const saved = localStorage.getItem('mq_active_system') as SystemType;
  if (saved && ['patient', 'doctor', 'admin'].includes(saved)) {
    return saved;
  }

  // 3. Direct default: Patient Portal (instant experience, no chooser screen)
  return 'patient';
};

const AppContent: React.FC = () => {
  const { user, role, isLoading, quickSwitch } = useAuth();

  // Active isolated system: 'patient' | 'doctor' | 'admin'
  const [activeSystem, setActiveSystem] = useState<SystemType>(detectInitialSystem);

  // Auth flow view
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot-password'>('login');

  // Main application view inside the active system
  const [currentView, setCurrentView] = useState<string>(() => {
    const sys = detectInitialSystem();
    if (sys === 'patient') return 'patient-dashboard';
    if (sys === 'doctor') return 'doctor-dashboard';
    return 'admin-dashboard';
  });

  // State shared for doctor consultation room
  const [selectedQueueItem, setSelectedQueueItem] = useState<QueueItem | null>(null);

  // Synchronize browser history / URL path
  const handleSelectSystem = async (system: SystemType) => {
    setActiveSystem(system);
    localStorage.setItem('mq_active_system', system);

    // Update URL path seamlessly
    try {
      window.history.pushState(null, '', `/${system}`);
    } catch {
      // ignore
    }

    // Set default initial view for the selected isolated system
    if (system === 'patient') {
      setCurrentView('patient-dashboard');
      if (role !== 'PATIENT') {
        await quickSwitch('PATIENT');
      }
    } else if (system === 'doctor') {
      setCurrentView('doctor-dashboard');
      if (role !== 'DOCTOR') {
        await quickSwitch('DOCTOR');
      }
    } else if (system === 'admin') {
      setCurrentView('admin-dashboard');
      if (role !== 'ADMIN') {
        await quickSwitch('ADMIN');
      }
    }
  };

  // Listen to browser Back / Forward buttons for URL synchronization
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if ((path.includes('doctor') || hash.includes('doctor')) && activeSystem !== 'doctor') {
        handleSelectSystem('doctor');
      } else if ((path.includes('admin') || hash.includes('admin')) && activeSystem !== 'admin') {
        handleSelectSystem('admin');
      } else if ((path.includes('patient') || hash.includes('patient')) && activeSystem !== 'patient') {
        handleSelectSystem('patient');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeSystem]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center font-bold text-2xl animate-bounce mb-4 shadow-lg shadow-teal-500/30">
          MQ
        </div>
        <p className="text-sm font-semibold tracking-wide text-slate-300">
          Initializing MediQueue Clinical Systems...
        </p>
      </div>
    );
  }

  // 1. ISOLATED SYSTEM AUTHENTICATION
  // If the user is unauthenticated or the authenticated role does not match the active system
  const systemRoleMismatch =
    (activeSystem === 'patient' && role !== 'PATIENT') ||
    (activeSystem === 'doctor' && role !== 'DOCTOR') ||
    (activeSystem === 'admin' && role !== 'ADMIN');

  if (!user || systemRoleMismatch) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <ToastContainer />
        <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-30 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            {/* System Branding */}
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm ${
                  activeSystem === 'patient'
                    ? 'bg-teal-600'
                    : activeSystem === 'doctor'
                    ? 'bg-sky-600'
                    : 'bg-purple-700'
                }`}
              >
                {activeSystem === 'patient' && <Heart className="w-5 h-5" />}
                {activeSystem === 'doctor' && <Stethoscope className="w-5 h-5" />}
                {activeSystem === 'admin' && <Shield className="w-5 h-5" />}
              </div>
              <div>
                <span className="font-bold text-base text-slate-900 tracking-tight">MediQueue</span>
                <span className="text-[10px] text-slate-500 font-semibold block -mt-1 uppercase">
                  {activeSystem === 'patient' && 'Patient Portal (Isolated)'}
                  {activeSystem === 'doctor' && 'Doctor Workstation (Isolated)'}
                  {activeSystem === 'admin' && 'Admin Console (Isolated)'}
                </span>
              </div>
            </div>

            {/* Direct Switch to Other Systems Tabs */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleSelectSystem('patient')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    activeSystem === 'patient'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Heart className="w-3 h-3" />
                  <span className="hidden sm:inline">Patient</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSystem('doctor')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    activeSystem === 'doctor'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Stethoscope className="w-3 h-3" />
                  <span className="hidden sm:inline">Doctor</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSystem('admin')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    activeSystem === 'admin'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Shield className="w-3 h-3" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              </div>

              {activeSystem === 'patient' && (
                <button
                  onClick={() => setAuthView(authView === 'register' ? 'login' : 'register')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    authView === 'register'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {authView === 'register' ? 'Sign In' : 'Register'}
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 py-6 px-4">
          {authView === 'login' && (
            <LoginView
              onNavigate={setAuthView}
              targetSystem={activeSystem}
              onSelectSystem={handleSelectSystem}
            />
          )}
          {authView === 'register' && <RegisterView onNavigate={setAuthView} />}
          {authView === 'forgot-password' && <ForgotPasswordView onNavigate={setAuthView} />}
        </main>

        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
          <p className="font-semibold text-slate-700">
            {activeSystem === 'patient' && 'MediQueue Patient Self-Service Portal'}
            {activeSystem === 'doctor' && 'MediQueue Physician Clinical Workstation'}
            {activeSystem === 'admin' && 'MediQueue Clinic Operations & Central Console'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Isolated clinical system. Switch systems instantly via the top system bar.
          </p>
        </footer>
      </div>
    );
  }

  // 2. ISOLATED SYSTEM ACTIVE INTERFACE
  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col justify-between">
      <ToastContainer />

      {/* Public Waiting Hall TV Mode Fullscreen Overlay */}
      {currentView === 'tv-display' && (
        <PublicQueueTvView onClose={() => setCurrentView(`${activeSystem}-dashboard`)} />
      )}

      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        currentSystem={activeSystem}
        onSwitchSystem={handleSelectSystem}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* PATIENT SYSTEM VIEWS */}
        {activeSystem === 'patient' && (
          <>
            {currentView === 'patient-dashboard' && (
              <PatientDashboardView onNavigate={setCurrentView} />
            )}
            {currentView === 'patient-book' && (
              <BookAppointmentView onNavigate={setCurrentView} />
            )}
            {currentView === 'patient-appointments' && (
              <MyAppointmentsView onNavigate={setCurrentView} />
            )}
            {currentView === 'patient-queue' && (
              <PatientQueueView onNavigate={setCurrentView} />
            )}
            {currentView === 'patient-consultations' && (
              <PatientConsultationsView />
            )}
            {currentView === 'patient-profile' && (
              <PatientProfileView />
            )}
            {currentView === 'patient-telemed' && (
              <TelemedicineRoomView
                userRole="PATIENT"
                onLeaveCall={() => setCurrentView('patient-dashboard')}
              />
            )}
          </>
        )}

        {/* DOCTOR SYSTEM VIEWS */}
        {activeSystem === 'doctor' && (
          <>
            {currentView === 'doctor-dashboard' && (
              <DoctorDashboardView
                onNavigate={setCurrentView}
                onSelectQueueItem={(item) => setSelectedQueueItem(item)}
              />
            )}
            {currentView === 'doctor-queue' && (
              <DoctorQueueView
                onNavigate={setCurrentView}
                onSelectQueueItem={(item) => setSelectedQueueItem(item)}
              />
            )}
            {currentView === 'doctor-consultation-room' && (
              <DoctorConsultationRoomView
                queueItem={selectedQueueItem}
                onNavigate={setCurrentView}
              />
            )}
            {currentView === 'doctor-telemed' && (
              <TelemedicineRoomView
                userRole="DOCTOR"
                onLeaveCall={() => setCurrentView('doctor-dashboard')}
              />
            )}
            {currentView === 'doctor-appointments' && (
              <DoctorAppointmentsView />
            )}
            {currentView === 'doctor-patients' && (
              <DoctorPatientsView />
            )}
            {currentView === 'doctor-profile' && (
              <DoctorProfileView />
            )}
          </>
        )}

        {/* ADMIN SYSTEM VIEWS */}
        {activeSystem === 'admin' && (
          <>
            {currentView === 'admin-dashboard' && (
              <AdminDashboardView onNavigate={setCurrentView} />
            )}
            {currentView === 'admin-queue' && (
              <AdminQueueView />
            )}
            {currentView === 'admin-appointments' && (
              <AdminAppointmentsView />
            )}
            {currentView === 'admin-patients' && (
              <AdminPatientsView />
            )}
            {currentView === 'admin-doctors' && (
              <AdminDoctorsView />
            )}
            {currentView === 'admin-schedules' && (
              <AdminSchedulesView />
            )}
            {currentView === 'admin-billing' && (
              <AdminBillingView />
            )}
            {currentView === 'admin-pharmacy' && (
              <AdminPharmacyView />
            )}
            {currentView === 'admin-labtech' && (
              <AdminLabWorkbenchView />
            )}
            {currentView === 'admin-sms' && (
              <AdminSmsDispatcherView />
            )}
            {currentView === 'admin-reports' && (
              <AdminReportsView />
            )}
            {currentView === 'admin-audit-logs' && (
              <AdminAuditLogsView />
            )}
            {currentView === 'admin-settings' && (
              <AdminSettingsView />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full animate-ping ${
                activeSystem === 'patient'
                  ? 'bg-teal-500'
                  : activeSystem === 'doctor'
                  ? 'bg-sky-500'
                  : 'bg-purple-500'
              }`}
            />
            <span className="font-semibold text-slate-700">
              {activeSystem === 'patient' && 'MediQueue Patient Portal Active'}
              {activeSystem === 'doctor' && 'MediQueue Physician Clinical Workstation Active'}
              {activeSystem === 'admin' && 'MediQueue Clinic Administration Console Active'}
            </span>
            <span className="text-slate-400">• Outpatient Terminal</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span>Switch to:</span>
            {activeSystem !== 'patient' && (
              <button
                onClick={() => handleSelectSystem('patient')}
                className="text-teal-700 hover:text-teal-900 font-semibold underline"
              >
                Patient Portal
              </button>
            )}
            {activeSystem !== 'doctor' && (
              <button
                onClick={() => handleSelectSystem('doctor')}
                className="text-sky-700 hover:text-sky-900 font-semibold underline"
              >
                Doctor Workstation
              </button>
            )}
            {activeSystem !== 'admin' && (
              <button
                onClick={() => handleSelectSystem('admin')}
                className="text-purple-700 hover:text-purple-900 font-semibold underline"
              >
                Admin Console
              </button>
            )}
            <span>•</span>
            <span>Support: +63 917 999 8888</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}
