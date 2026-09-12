import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Doctor, Specialization } from '../../types/index';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import {
  Stethoscope,
  Calendar,
  Clock,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  MapPin,
  AlertCircle,
  User,
} from 'lucide-react';

interface BookAppointmentViewProps {
  onNavigate: (view: string) => void;
}

export const BookAppointmentView: React.FC<BookAppointmentViewProps> = ({ onNavigate }) => {
  const { user, patient } = useAuth();
  const { showToast } = useNotifications();

  const [step, setStep] = useState<number>(1);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('all');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  // Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [appointmentDate, setAppointmentDate] = useState<string>(todayStr);
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  // Status
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotMessage, setSlotMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookedAppointment, setBookedAppointment] = useState<any>(null);

  useEffect(() => {
    async function initData() {
      try {
        const [docs, specs] = await Promise.all([api.getDoctors({ status: 'active' }), api.getSpecializations()]);
        setDoctors(docs);
        setSpecializations(specs);
      } catch (err) {
        console.error('Failed to load doctors:', err);
      }
    }
    initData();
  }, []);

  // Fetch slots whenever doctor or date changes
  useEffect(() => {
    if (!selectedDoctor || !appointmentDate) return;

    async function fetchSlots() {
      setIsLoadingSlots(true);
      setSelectedSlot('');
      setSlotMessage(null);
      try {
        const data = await api.getAvailableSlots(selectedDoctor!.id, appointmentDate);
        setTimeSlots(data.availableSlots);
        setSlotMessage(data.message);
      } catch (err: any) {
        setSlotMessage(err.message || 'Error fetching available slots.');
        setTimeSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    }
    fetchSlots();
  }, [selectedDoctor, appointmentDate]);

  const filteredDoctors = doctors.filter((doc) => {
    if (selectedSpecialization === 'all') return true;
    return doc.specialization_id === selectedSpecialization;
  });

  const handleDoctorSelect = (doc: Doctor) => {
    setSelectedDoctor(doc);
    setStep(2);
  };

  const handleNextToSlots = () => {
    if (!appointmentDate) {
      showToast('warning', 'Date Required', 'Please select an appointment date.');
      return;
    }
    setStep(3);
  };

  const handleNextToReason = () => {
    if (!selectedSlot) {
      showToast('warning', 'Slot Required', 'Please choose a consultation time slot.');
      return;
    }
    setStep(4);
  };

  const handleNextToSummary = () => {
    if (!reason.trim()) {
      showToast('warning', 'Reason Required', 'Please provide a brief reason for your consultation.');
      return;
    }
    setStep(5);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !appointmentDate || !selectedSlot || !reason.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.bookAppointment({
        doctor_id: selectedDoctor.id,
        appointment_date: appointmentDate,
        time_slot: selectedSlot,
        reason_for_consultation: reason.trim(),
        schedule_id: selectedScheduleId,
      });

      setBookedAppointment(res.appointment);
      setStep(6);
      showToast('success', 'Booking Confirmed!', `Appointment Reference: ${res.appointment.appointment_reference || res.appointment.reference_number}`);
    } catch (err: any) {
      showToast('error', 'Booking Failed', err.message || 'Failed to confirm appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header & Step Tracker */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Book MMC Consultation</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Follow the steps to reserve your consultation with our Makati Medical Center specialists.
            </p>
          </div>
          {step < 6 && (
            <div className="text-xs font-semibold px-3 py-1 bg-blue-50 text-blue-800 rounded-full self-start sm:self-auto">
              Step {step} of 5
            </div>
          )}
        </div>

        {/* Step Progress Pills */}
        {step < 6 && (
          <div className="grid grid-cols-5 gap-2 text-center text-xs font-medium">
            <div className={`p-2 rounded-lg ${step >= 1 ? 'bg-blue-700 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
              1. Physician
            </div>
            <div className={`p-2 rounded-lg ${step >= 2 ? 'bg-blue-700 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
              2. Date
            </div>
            <div className={`p-2 rounded-lg ${step >= 3 ? 'bg-blue-700 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
              3. Schedule
            </div>
            <div className={`p-2 rounded-lg ${step >= 4 ? 'bg-blue-700 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
              4. Reason
            </div>
            <div className={`p-2 rounded-lg ${step >= 5 ? 'bg-blue-700 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
              5. Review
            </div>
          </div>
        )}
      </div>

      {/* Step 1: Select Doctor */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Specialization Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedSpecialization('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedSpecialization === 'all'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              All Specialties
            </button>
            {specializations.map((spec) => (
              <button
                key={spec.id}
                onClick={() => setSelectedSpecialization(spec.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedSpecialization === spec.id
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {spec.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredDoctors.map((doc) => (
              <div
                key={doc.id}
                onClick={() => handleDoctorSelect(doc)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white hover:border-blue-400 hover:shadow-md flex flex-col justify-between ${
                  selectedDoctor?.id === doc.id ? 'border-blue-700 ring-2 ring-blue-500/20' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-base mb-3">
                    {doc.first_name[0]}{doc.last_name[0]}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Dr. {doc.first_name} {doc.last_name}
                  </h3>
                  <p className="text-xs font-medium text-blue-700 mt-0.5">
                    {doc.specialization_name}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {doc.bio}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    Room {doc.room_number}
                  </span>
                  <span className="text-teal-700 font-semibold flex items-center gap-1">
                    Select Doctor &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Select Date */}
      {step === 2 && selectedDoctor && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/80 border border-blue-200">
            <div className="w-10 h-10 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold">
              {selectedDoctor.first_name[0]}{selectedDoctor.last_name[0]}
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}
              </h4>
              <p className="text-xs text-blue-700">
                {selectedDoctor.specialization_name} • Room {selectedDoctor.room_number}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1">
              Select Appointment Date
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Choose your preferred date. Consultations are available Mondays to Saturdays.
            </p>
            <input
              type="date"
              min={todayStr}
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              className="px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-w-xs"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" /> Change Doctor
            </button>
            <button
              onClick={handleNextToSlots}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 text-white text-xs font-semibold rounded-lg hover:bg-blue-800"
            >
              Next: Choose Schedule <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Select Time Slot */}
      {step === 3 && selectedDoctor && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Available Consultation Slots</h3>
              <p className="text-xs text-slate-500">
                Showing open slots for Dr. {selectedDoctor.last_name} on {appointmentDate}
              </p>
            </div>
          </div>

          {isLoadingSlots ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Loading available schedule slots...
            </div>
          ) : slotMessage && timeSlots.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{slotMessage} Please select another date when Dr. {selectedDoctor.last_name} holds clinic hours.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {timeSlots.map((slot) => {
                const isSelected = selectedSlot === slot.time;
                const isAvailable = slot.available;

                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => {
                      setSelectedSlot(slot.time);
                      setSelectedScheduleId(slot.scheduleId);
                    }}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col justify-between items-center ${
                      !isAvailable
                        ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                        : isSelected
                        ? 'bg-blue-700 text-white border-blue-800 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="font-bold text-sm font-mono">{slot.formattedTime}</div>
                    <div
                      className={`text-[10px] mt-1 font-medium ${
                        isSelected ? 'text-blue-100' : isAvailable ? 'text-blue-700' : 'text-slate-400'
                      }`}
                    >
                      {isAvailable ? `${slot.maxCapacity - slot.bookedCount} slots left` : 'Fully Booked'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" /> Change Date
            </button>
            <button
              onClick={handleNextToReason}
              disabled={!selectedSlot}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 text-white text-xs font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              Next: Enter Reason <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Reason for Consultation */}
      {step === 4 && selectedDoctor && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Reason for Consultation</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Please describe your symptoms, primary health concern, or purpose of visit.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Chief Complaint / Symptoms *
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Persistent cough for 4 days with slight fever, headache, and fatigue..."
              className="w-full p-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Slots
            </button>
            <button
              onClick={handleNextToSummary}
              disabled={!reason.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 text-white text-xs font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              Review Summary <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Appointment Summary & Confirmation */}
      {step === 5 && selectedDoctor && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Review Appointment Details</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Please confirm your booking details before reserving this time slot.
            </p>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <div className="py-2.5 flex justify-between text-xs">
              <span className="text-slate-500">Attending Physician:</span>
              <span className="font-bold text-slate-900">
                Dr. {selectedDoctor.first_name} {selectedDoctor.last_name} ({selectedDoctor.specialization_name})
              </span>
            </div>
            <div className="py-2.5 flex justify-between text-xs">
              <span className="text-slate-500">Clinic Room:</span>
              <span className="font-semibold text-slate-900">Room {selectedDoctor.room_number}</span>
            </div>
            <div className="py-2.5 flex justify-between text-xs">
              <span className="text-slate-500">Date:</span>
              <span className="font-bold text-slate-900">
                {new Date(appointmentDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="py-2.5 flex justify-between text-xs">
              <span className="text-slate-500">Time Slot:</span>
              <span className="font-bold text-blue-700">{selectedSlot}</span>
            </div>
            <div className="py-2.5 flex justify-between text-xs">
              <span className="text-slate-500">Patient:</span>
              <span className="font-semibold text-slate-900">
                {patient?.first_name} {patient?.last_name} ({patient?.patient_number})
              </span>
            </div>
            <div className="py-2.5 flex justify-between text-xs">
              <span className="text-slate-500">Reason for Visit:</span>
              <span className="font-medium text-slate-800 italic max-w-xs text-right">
                "{reason}"
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" /> Edit Details
            </button>
            <button
              onClick={handleConfirmBooking}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-blue-700 text-white text-xs font-bold rounded-xl hover:bg-blue-800 shadow-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Confirming Booking...' : 'Confirm & Book Appointment'}
            </button>
          </div>
        </div>
      )}

      {/* Step 6: Booking Success Screen */}
      {step === 6 && bookedAppointment && (
        <div className="bg-white rounded-2xl border border-blue-200 p-8 text-center space-y-6 shadow-md">
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="px-3 py-1 bg-blue-50 text-blue-800 text-xs font-bold rounded-full uppercase tracking-wider">
              Booking Confirmed
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mt-2">
              Appointment Successfully Reserved!
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Your Makati Medical Center appointment reference number has been generated.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-sm mx-auto">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Reference Number
            </span>
            <div className="text-xl font-mono font-extrabold text-blue-700 mt-0.5">
              {bookedAppointment.reference_number}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {bookedAppointment.appointment_date} at {bookedAppointment.time_slot}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => onNavigate('patient-appointments')}
              className="px-4 py-2.5 bg-blue-700 text-white text-xs font-semibold rounded-lg hover:bg-blue-800 shadow-sm"
            >
              View in My Appointments
            </button>
            <button
              onClick={() => onNavigate('patient-dashboard')}
              className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
