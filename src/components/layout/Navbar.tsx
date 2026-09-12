import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { StatusBadge } from '../common/Badge';
import {
  Activity,
  Calendar,
  Clock,
  FileText,
  User,
  Users,
  UserCheck,
  BarChart3,
  Shield,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  Stethoscope,
  ChevronDown,
  Sparkles,
  Heart,
  Grid,
  Building2,
  Layers,
  ArrowRight,
  Receipt,
  Tv,
  Pill,
  FlaskConical,
  MessageSquare,
  Video,
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentSystem: 'patient' | 'doctor' | 'admin';
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  currentSystem,
}) => {
  const { user, patient, doctor, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Navigation tabs for the active isolated system
  const getNavLinks = () => {
    if (currentSystem === 'patient') {
      return [
        { id: 'patient-dashboard', label: 'Dashboard', icon: Activity },
        { id: 'patient-book', label: 'Book Appointment', icon: Calendar },
        { id: 'patient-appointments', label: 'My Appointments', icon: Clock },
        { id: 'patient-queue', label: 'Live Queue Pass', icon: Sparkles },
        { id: 'patient-consultations', label: 'Consultations & Rx', icon: FileText },
        { id: 'patient-telemed', label: 'Telemedicine', icon: Video },
        { id: 'patient-profile', label: 'My Profile', icon: User },
      ];
    }

    if (currentSystem === 'doctor') {
      return [
        { id: 'doctor-dashboard', label: 'Dashboard', icon: Activity },
        { id: 'doctor-queue', label: 'Queue Board', icon: Clock },
        { id: 'doctor-consultation-room', label: 'Consultation Room', icon: Stethoscope },
        { id: 'doctor-telemed', label: 'Teleconsult Room', icon: Video },
        { id: 'doctor-appointments', label: 'Appointments', icon: Calendar },
        { id: 'doctor-patients', label: 'Patient Records', icon: Users },
        { id: 'doctor-profile', label: 'Profile', icon: User },
      ];
    }

    // Admin / Staff
    return [
      { id: 'admin-dashboard', label: 'Overview', icon: Activity },
      { id: 'admin-queue', label: 'Queue Manager', icon: Clock },
      { id: 'admin-appointments', label: 'Appointments', icon: Calendar },
      { id: 'admin-patients', label: 'Patients', icon: Users },
      { id: 'admin-doctors', label: 'Doctors', icon: UserCheck },
      { id: 'admin-schedules', label: 'Duty Shifts', icon: Clock },
      { id: 'admin-billing', label: 'Billing & HMO', icon: Receipt },
      { id: 'admin-pharmacy', label: 'Pharmacy', icon: Pill },
      { id: 'admin-labtech', label: 'Lab Workbench', icon: FlaskConical },
      { id: 'admin-sms', label: 'SMS Alerts', icon: MessageSquare },
      { id: 'admin-reports', label: 'Reports', icon: BarChart3 },
      { id: 'admin-audit-logs', label: 'Audit Trail', icon: Shield },
      { id: 'admin-settings', label: 'Settings', icon: Settings },
    ];
  };

  const navLinks = getNavLinks();

  const handleNavClick = (viewId: string) => {
    onNavigate(viewId);
    setIsMobileMenuOpen(false);
  };

  const isPatient = currentSystem === 'patient';
  const isDoctor = currentSystem === 'doctor';
  const isAdmin = currentSystem === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
      {/* SYSTEM HEADER BANNER */}
      <div
        className={`text-white text-xs px-4 py-1.5 flex items-center justify-between transition-colors ${
          isPatient
            ? 'bg-blue-900 border-b border-blue-800'
            : isDoctor
            ? 'bg-indigo-900 border-b border-indigo-800'
            : 'bg-slate-900 border-b border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2">
          {isPatient && (
            <>
              <Heart className="w-3.5 h-3.5 text-blue-300" />
              <span className="font-semibold text-blue-100">MMC PATIENT SELF-SERVICE SYSTEM</span>
              <span className="hidden sm:inline text-blue-200/70">• Online Appointments &amp; Live Queue</span>
            </>
          )}
          {isDoctor && (
            <>
              <Stethoscope className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-semibold text-sky-100">MMC PHYSICIAN CLINICAL WORKSTATION</span>
              <span className="hidden sm:inline text-sky-300/70">
                • {doctor ? `Room ${doctor.room_number}` : 'Room 102'} • MMC Outpatient Terminal
              </span>
            </>
          )}
          {isAdmin && (
            <>
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-semibold text-purple-100">MMC HOSPITAL OPERATIONS &amp; ADMIN CONSOLE</span>
              <span className="hidden sm:inline text-purple-300/70">• Central Reception &amp; Management</span>
            </>
          )}
        </div>
      </div>

      {/* MAIN SYSTEM NAVIGATION */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* System Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (isPatient) onNavigate('patient-dashboard');
                else if (isDoctor) onNavigate('doctor-dashboard');
                else onNavigate('admin-dashboard');
              }}
              className="flex items-center gap-2.5 text-left focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden bg-white shadow-sm ring-1 ring-slate-200">
                <img 
                  src="/src/assets/images/makati_medical_center_logo_1789222548043.jpg" 
                  alt="Makati Medical Center Logo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight">
                  Makati Medical Center
                </span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Hospital Systems
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = currentView === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? isPatient
                        ? 'bg-teal-50 text-teal-800 font-bold border border-teal-200'
                        : isDoctor
                        ? 'bg-sky-50 text-sky-800 font-bold border border-sky-200'
                        : 'bg-purple-50 text-purple-800 font-bold border border-purple-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? isPatient
                          ? 'text-teal-600'
                          : isDoctor
                          ? 'text-sky-600'
                          : 'text-purple-600'
                        : 'text-slate-400'
                    }`}
                  />
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons & User Info */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Bell with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popup */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-teal-600 hover:text-teal-800 font-medium cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={`p-3 text-left transition-colors cursor-pointer hover:bg-slate-50 ${
                            !n.is_read ? 'bg-teal-50/50' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                            {!n.is_read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="hidden md:block text-right">
                  <div className="text-xs font-semibold text-slate-900">
                    {isPatient && patient
                      ? `${patient.first_name} ${patient.last_name}`
                      : isDoctor && doctor
                      ? `Dr. ${doctor.last_name}`
                      : 'Hospital Admin'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {isPatient && (patient?.patient_number || 'Patient Account')}
                    {isDoctor && (doctor?.specialization_name || 'Physician')}
                    {isAdmin && 'System Administrator'}
                  </div>
                </div>

                <StatusBadge status={user.role} type="role" className="hidden sm:inline-flex" />

                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Sign out of this system"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg focus:outline-none"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg animate-in slide-in-from-top-2">
          {user && (
            <div className="p-3 mb-2 bg-slate-50 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  {isPatient && patient
                    ? `${patient.first_name} ${patient.last_name}`
                    : isDoctor && doctor
                    ? `Dr. ${doctor.first_name} ${doctor.last_name}`
                    : 'System Administrator'}
                </p>
                <p className="text-[11px] text-slate-500">{user.email}</p>
              </div>
              <StatusBadge status={user.role} type="role" />
            </div>
          )}

          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = currentView === link.id;
            return (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-teal-50 text-teal-800 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                {link.label}
              </button>
            );
          })}

          <div className="pt-3 mt-3 border-t border-slate-100 space-y-2">
            <div className="pt-2 flex justify-end">
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
