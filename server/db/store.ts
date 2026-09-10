import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  Patient,
  Doctor,
  Specialization,
  DoctorSchedule,
  Appointment,
  AppointmentStatus,
  QueueItem,
  QueueStatus,
  Consultation,
  AuditLog,
  ClinicSettings,
  Notification,
  VitalSignRecord,
  LabOrder,
  BillingInvoice,
  DoctorWorkStatus,
  DoctorWorkStatusType,
  PreConsultationTriage,
  PharmacyItem,
  PrescriptionDispense,
  LabTestResult,
  SmsLog,
  TelemedSession,
  ClinicBranch,
  MedicalCertificate,
  DoctorReferral,
} from '../../src/types/index';
import { DatabaseState, getInitialSeedData } from './seed';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'mediqueue-db.json');

class DatabaseStore {
  private data: DatabaseState;

  constructor() {
    this.data = this.loadDatabase();
  }

  private loadDatabase(): DatabaseState {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        if (parsed.users && parsed.doctors && parsed.appointments) {
          const seed = getInitialSeedData();
          if (!parsed.vital_signs) parsed.vital_signs = seed.vital_signs;
          if (!parsed.lab_orders) parsed.lab_orders = seed.lab_orders;
          if (!parsed.billing_invoices) parsed.billing_invoices = seed.billing_invoices;
          if (!parsed.doctor_work_statuses) parsed.doctor_work_statuses = seed.doctor_work_statuses;
          if (!parsed.triages) parsed.triages = seed.triages;
          if (!parsed.pharmacy_items) parsed.pharmacy_items = seed.pharmacy_items;
          if (!parsed.dispense_records) parsed.dispense_records = seed.dispense_records;
          if (!parsed.lab_results) parsed.lab_results = seed.lab_results;
          if (!parsed.sms_logs) parsed.sms_logs = seed.sms_logs;
          if (!parsed.telemed_sessions) parsed.telemed_sessions = seed.telemed_sessions;
          if (!parsed.clinic_branches) parsed.clinic_branches = seed.clinic_branches;
          if (!parsed.medical_certificates) parsed.medical_certificates = seed.medical_certificates;
          if (!parsed.doctor_referrals) parsed.doctor_referrals = seed.doctor_referrals;
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Could not read existing database, reinitializing with seeds...', err);
    }

    const seed = getInitialSeedData();
    this.saveDatabase(seed);
    return seed;
  }

  private saveDatabase(dataToSave?: DatabaseState): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data = dataToSave || this.data;
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  public resetToSeed(): void {
    this.data = getInitialSeedData();
    this.saveDatabase();
  }

  // ==========================================
  // AUDIT LOGGING HELPER
  // ==========================================
  public logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const newLog: AuditLog = {
      id: `aud_${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      ...log,
    };
    this.data.audit_logs.unshift(newLog);
    this.saveDatabase();
    return newLog;
  }

  // ==========================================
  // NOTIFICATIONS HELPER
  // ==========================================
  public sendNotification(
    userId: string,
    title: string,
    message: string,
    type: 'appointment' | 'queue' | 'consultation' | 'system'
  ): Notification {
    const notif: Notification = {
      id: `notif_${crypto.randomUUID().slice(0, 8)}`,
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    this.data.notifications.unshift(notif);
    this.saveDatabase();
    return notif;
  }

  public getNotifications(userId: string): Notification[] {
    return this.data.notifications.filter((n) => n.user_id === userId);
  }

  public markNotificationRead(id: string, userId: string): boolean {
    const notif = this.data.notifications.find((n) => n.id === id && n.user_id === userId);
    if (notif) {
      notif.is_read = true;
      this.saveDatabase();
      return true;
    }
    return false;
  }

  public markAllNotificationsRead(userId: string): void {
    this.data.notifications.forEach((n) => {
      if (n.user_id === userId) n.is_read = true;
    });
    this.saveDatabase();
  }

  // ==========================================
  // USERS
  // ==========================================
  public findUserByEmail(email: string) {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string) {
    return this.data.users.find((u) => u.id === id);
  }

  public createUser(userData: {
    email: string;
    role: User['role'];
    password_hash: string;
    salt: string;
  }) {
    const newUser = {
      id: `usr_${crypto.randomUUID().slice(0, 8)}`,
      email: userData.email,
      role: userData.role,
      is_active: true,
      password_hash: userData.password_hash,
      salt: userData.salt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.users.push(newUser);
    this.saveDatabase();
    return newUser;
  }

  public updateUserPassword(userId: string, password_hash: string, salt: string) {
    const user = this.data.users.find((u) => u.id === userId);
    if (user) {
      user.password_hash = password_hash;
      user.salt = salt;
      user.updated_at = new Date().toISOString();
      this.saveDatabase();
      return true;
    }
    return false;
  }

  // ==========================================
  // PATIENTS
  // ==========================================
  public getPatients(search?: string, status?: string): Patient[] {
    let result = [...this.data.patients];
    if (status === 'active') {
      result = result.filter((p) => p.is_active);
    } else if (status === 'inactive') {
      result = result.filter((p) => !p.is_active);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.first_name.toLowerCase().includes(q) ||
          p.last_name.toLowerCase().includes(q) ||
          p.patient_number.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.contact_number.toLowerCase().includes(q)
      );
    }
    return result;
  }

  public getPatientById(id: string): Patient | undefined {
    return this.data.patients.find((p) => p.id === id);
  }

  public getPatientByUserId(userId: string): Patient | undefined {
    return this.data.patients.find((p) => p.user_id === userId);
  }

  public createPatient(patientData: Omit<Patient, 'id' | 'patient_number' | 'created_at' | 'updated_at'>): Patient {
    const count = this.data.patients.length + 1;
    const patientNumber = `PAT-2026-${String(count).padStart(3, '0')}`;
    const newPatient: Patient = {
      id: `pat_${crypto.randomUUID().slice(0, 8)}`,
      patient_number: patientNumber,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...patientData,
    };
    this.data.patients.push(newPatient);
    this.saveDatabase();
    return newPatient;
  }

  public updatePatient(id: string, updates: Partial<Patient>): Patient | null {
    const patient = this.data.patients.find((p) => p.id === id);
    if (!patient) return null;

    Object.assign(patient, updates, { updated_at: new Date().toISOString() });
    this.saveDatabase();
    return patient;
  }

  public togglePatientStatus(id: string): Patient | null {
    const patient = this.data.patients.find((p) => p.id === id);
    if (!patient) return null;

    patient.is_active = !patient.is_active;
    patient.updated_at = new Date().toISOString();

    const user = this.data.users.find((u) => u.id === patient.user_id);
    if (user) {
      user.is_active = patient.is_active;
      user.updated_at = new Date().toISOString();
    }

    this.saveDatabase();
    return patient;
  }

  // ==========================================
  // DOCTORS & SPECIALIZATIONS
  // ==========================================
  public getSpecializations(): Specialization[] {
    return this.data.specializations;
  }

  public getDoctors(filters?: { specializationId?: string; status?: string; search?: string }): Doctor[] {
    let result = [...this.data.doctors];
    if (filters?.specializationId) {
      result = result.filter((d) => d.specialization_id === filters.specializationId);
    }
    if (filters?.status) {
      result = result.filter((d) => d.status.toLowerCase() === filters.status?.toLowerCase());
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (d) =>
          d.first_name.toLowerCase().includes(q) ||
          d.last_name.toLowerCase().includes(q) ||
          d.specialization_name.toLowerCase().includes(q) ||
          d.doctor_code.toLowerCase().includes(q)
      );
    }
    return result;
  }

  public getDoctorById(id: string): Doctor | undefined {
    return this.data.doctors.find((d) => d.id === id);
  }

  public getDoctorByUserId(userId: string): Doctor | undefined {
    return this.data.doctors.find((d) => d.user_id === userId);
  }

  public createDoctor(doctorData: Omit<Doctor, 'id' | 'doctor_code' | 'created_at' | 'updated_at'>): Doctor {
    const count = this.data.doctors.length + 1;
    const doctorCode = `DOC-${String(count).padStart(3, '0')}`;
    const newDoctor: Doctor = {
      id: `doc_${crypto.randomUUID().slice(0, 8)}`,
      doctor_code: doctorCode,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...doctorData,
    };
    this.data.doctors.push(newDoctor);
    this.saveDatabase();
    return newDoctor;
  }

  public updateDoctor(id: string, updates: Partial<Doctor>): Doctor | null {
    const doctor = this.data.doctors.find((d) => d.id === id);
    if (!doctor) return null;

    Object.assign(doctor, updates, { updated_at: new Date().toISOString() });
    this.saveDatabase();
    return doctor;
  }

  // ==========================================
  // DOCTOR SCHEDULES & AVAILABLE SLOTS
  // ==========================================
  public getDoctorSchedules(doctorId?: string): DoctorSchedule[] {
    if (doctorId) {
      return this.data.doctor_schedules.filter((s) => s.doctor_id === doctorId);
    }
    return this.data.doctor_schedules;
  }

  public createDoctorSchedule(scheduleData: Omit<DoctorSchedule, 'id' | 'created_at' | 'updated_at'>): DoctorSchedule {
    const newSchedule: DoctorSchedule = {
      id: `sch_${crypto.randomUUID().slice(0, 8)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...scheduleData,
    };
    this.data.doctor_schedules.push(newSchedule);
    this.saveDatabase();
    return newSchedule;
  }

  public updateDoctorSchedule(id: string, updates: Partial<DoctorSchedule>): DoctorSchedule | null {
    const schedule = this.data.doctor_schedules.find((s) => s.id === id);
    if (!schedule) return null;

    Object.assign(schedule, updates, { updated_at: new Date().toISOString() });
    this.saveDatabase();
    return schedule;
  }

  public deleteDoctorSchedule(id: string): boolean {
    const idx = this.data.doctor_schedules.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.data.doctor_schedules.splice(idx, 1);
      this.saveDatabase();
      return true;
    }
    return false;
  }

  // Calculates slots for a doctor on a specific date (YYYY-MM-DD)
  public getAvailableSlots(doctorId: string, dateStr: string) {
    const doctor = this.getDoctorById(doctorId);
    if (!doctor || doctor.status !== 'Active') {
      return { availableSlots: [], message: 'Doctor is currently inactive or not available.' };
    }

    // Determine Day of Week for the date
    const dateObj = new Date(`${dateStr}T00:00:00`);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[dateObj.getDay()];

    const schedules = this.data.doctor_schedules.filter(
      (s) => s.doctor_id === doctorId && s.day_of_week === dayOfWeek && s.status === 'Active'
    );

    if (schedules.length === 0) {
      return {
        availableSlots: [],
        message: `Dr. ${doctor.last_name} has no scheduled clinic hours on ${dayOfWeek}s.`,
      };
    }

    // Existing active bookings for this doctor on this date (not cancelled)
    const existingAppointments = this.data.appointments.filter(
      (a) => a.doctor_id === doctorId && a.appointment_date === dateStr && a.status !== 'cancelled'
    );

    const generatedSlots: {
      time: string;
      formattedTime: string;
      available: boolean;
      bookedCount: number;
      maxCapacity: number;
      scheduleId: string;
    }[] = [];

    // Helper: format 24h "08:30" to 12h "08:30 AM"
    const formatTo12h = (time24: string) => {
      const [hStr, mStr] = time24.split(':');
      let h = parseInt(hStr, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      return `${String(h).padStart(2, '0')}:${mStr} ${ampm}`;
    };

    const now = new Date();
    const isToday = dateStr === now.toISOString().split('T')[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const sch of schedules) {
      const [startH, startM] = sch.start_time.split(':').map(Number);
      const [endH, endM] = sch.end_time.split(':').map(Number);

      let slotStart = startH * 60 + startM;
      const slotEnd = endH * 60 + endM;
      const duration = sch.slot_duration_minutes || 30;

      while (slotStart + duration <= slotEnd) {
        const h = Math.floor(slotStart / 60);
        const m = slotStart % 60;
        const time24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const time12 = formatTo12h(time24);

        const booked = existingAppointments.filter(
          (a) => a.time_slot === time12 || a.time_slot === time24
        ).length;

        // Rule 4: past time slots cannot be booked if date is today
        const isPastSlot = isToday && slotStart <= currentMinutes;
        const isAvailable = booked < (sch.max_patients_per_slot || 1) && !isPastSlot;

        generatedSlots.push({
          time: time24,
          formattedTime: time12,
          available: isAvailable,
          bookedCount: booked,
          maxCapacity: sch.max_patients_per_slot || 1,
          scheduleId: sch.id,
        });

        slotStart += duration;
      }
    }

    return { availableSlots: generatedSlots, message: null };
  }

  // ==========================================
  // APPOINTMENTS
  // ==========================================
  public getAppointments(filters?: {
    patientId?: string;
    doctorId?: string;
    date?: string;
    status?: string;
    search?: string;
  }): Appointment[] {
    let list = [...this.data.appointments];

    if (filters?.patientId) {
      list = list.filter((a) => a.patient_id === filters.patientId);
    }
    if (filters?.doctorId) {
      list = list.filter((a) => a.doctor_id === filters.doctorId);
    }
    if (filters?.date) {
      list = list.filter((a) => a.appointment_date === filters.date);
    }
    if (filters?.status && filters.status !== 'all') {
      list = list.filter((a) => a.status === filters.status);
    }

    // Populate joined records
    const enriched = list.map((apt) => ({
      ...apt,
      patient: this.data.patients.find((p) => p.id === apt.patient_id),
      doctor: this.data.doctors.find((d) => d.id === apt.doctor_id),
      queue_item: this.data.queue.find((q) => q.appointment_id === apt.id),
    }));

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      return enriched.filter(
        (a) =>
          a.appointment_reference.toLowerCase().includes(q) ||
          a.patient?.first_name.toLowerCase().includes(q) ||
          a.patient?.last_name.toLowerCase().includes(q) ||
          a.doctor?.first_name.toLowerCase().includes(q) ||
          a.doctor?.last_name.toLowerCase().includes(q)
      );
    }

    // Sort by date and time
    enriched.sort((a, b) => {
      const diff = new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime();
      return diff !== 0 ? diff : a.time_slot.localeCompare(b.time_slot);
    });

    return enriched;
  }

  public getAppointmentById(id: string): Appointment | undefined {
    const apt = this.data.appointments.find((a) => a.id === id || a.appointment_reference === id);
    if (!apt) return undefined;

    return {
      ...apt,
      patient: this.data.patients.find((p) => p.id === apt.patient_id),
      doctor: this.data.doctors.find((d) => d.id === apt.doctor_id),
      queue_item: this.data.queue.find((q) => q.appointment_id === apt.id),
    };
  }

  public createAppointment(data: {
    patient_id: string;
    doctor_id: string;
    appointment_date: string;
    time_slot: string;
    reason_for_consultation: string;
    schedule_id?: string;
  }): { appointment?: Appointment; error?: string } {
    // 1. Verify patient & doctor
    const patient = this.getPatientById(data.patient_id);
    if (!patient || !patient.is_active) {
      return { error: 'Patient not found or account is currently inactive.' };
    }
    const doctor = this.getDoctorById(data.doctor_id);
    if (!doctor || doctor.status !== 'Active') {
      return { error: 'Selected doctor is not active or unavailable.' };
    }

    // 2. Prevent past dates
    const today = new Date().toISOString().split('T')[0];
    if (data.appointment_date < today) {
      return { error: 'Cannot book appointments for past dates.' };
    }

    // 3. Rule 1: No double booking for same patient + same doctor at same time
    const existingPatientBooking = this.data.appointments.find(
      (a) =>
        a.patient_id === data.patient_id &&
        a.doctor_id === data.doctor_id &&
        a.appointment_date === data.appointment_date &&
        a.time_slot === data.time_slot &&
        a.status !== 'cancelled'
    );
    if (existingPatientBooking) {
      return { error: 'You already have an appointment with this doctor for the same time slot.' };
    }

    // 4. Verify slot availability & capacity
    const slotCheck = this.getAvailableSlots(data.doctor_id, data.appointment_date);
    const targetSlot = slotCheck.availableSlots.find(
      (s) => s.formattedTime === data.time_slot || s.time === data.time_slot
    );

    if (!targetSlot) {
      return { error: 'Selected time slot does not align with the doctor schedule.' };
    }
    if (!targetSlot.available) {
      return { error: 'This time slot is no longer available or has reached full capacity.' };
    }

    // 5. Generate unique reference number: APT-2026-XXXXXX
    const count = this.data.appointments.length + 101;
    const ref = `APT-2026-${String(count).padStart(6, '0')}`;

    const newAppointment: Appointment = {
      id: `apt_${crypto.randomUUID().slice(0, 8)}`,
      appointment_reference: ref,
      patient_id: data.patient_id,
      doctor_id: data.doctor_id,
      schedule_id: data.schedule_id || targetSlot.scheduleId,
      appointment_date: data.appointment_date,
      time_slot: targetSlot.formattedTime,
      reason_for_consultation: data.reason_for_consultation,
      status: 'confirmed', // Confirmed on booking
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.appointments.push(newAppointment);

    // Audit Log
    this.logAudit({
      user_id: patient.user_id,
      user_email: patient.email,
      user_role: 'PATIENT',
      action: 'Booked Appointment',
      module: 'Appointments',
      record_id: newAppointment.id,
      details: `Booked reference ${ref} with Dr. ${doctor.last_name} for ${data.appointment_date} at ${targetSlot.formattedTime}.`,
    });

    // Patient notification
    this.sendNotification(
      patient.user_id,
      'Appointment Confirmed',
      `Your appointment (${ref}) with Dr. ${doctor.first_name} ${doctor.last_name} is confirmed for ${data.appointment_date} at ${targetSlot.formattedTime}.`,
      'appointment'
    );

    this.saveDatabase();

    return {
      appointment: {
        ...newAppointment,
        patient,
        doctor,
      },
    };
  }

  public cancelAppointment(
    id: string,
    reason: string,
    cancelledBy: { id: string; email: string; role: 'PATIENT' | 'DOCTOR' | 'ADMIN' }
  ): { success: boolean; error?: string } {
    const appointment = this.data.appointments.find((a) => a.id === id);
    if (!appointment) return { success: false, error: 'Appointment not found.' };

    if (appointment.status === 'completed') {
      return { success: false, error: 'Completed appointments cannot be cancelled.' };
    }
    if (appointment.status === 'cancelled') {
      return { success: false, error: 'This appointment is already cancelled.' };
    }
    if (appointment.status === 'in_consultation') {
      return { success: false, error: 'Cannot cancel an appointment currently in consultation.' };
    }

    // Check if cancellation is allowed for patient (must be before completion/consultation)
    appointment.status = 'cancelled';
    appointment.cancellation_reason = reason || 'Patient requested cancellation';
    appointment.cancelled_by = cancelledBy.email;
    appointment.cancelled_at = new Date().toISOString();
    appointment.updated_at = new Date().toISOString();

    // If there was an active queue item, mark as skipped/cancelled
    const queueItem = this.data.queue.find((q) => q.appointment_id === appointment.id);
    if (queueItem && queueItem.status !== 'completed') {
      queueItem.status = 'skipped';
      queueItem.remarks = 'Cancelled by appointment cancellation';
      queueItem.updated_at = new Date().toISOString();
    }

    this.logAudit({
      user_id: cancelledBy.id,
      user_email: cancelledBy.email,
      user_role: cancelledBy.role,
      action: 'Cancelled Appointment',
      module: 'Appointments',
      record_id: appointment.id,
      details: `Cancelled appointment ${appointment.appointment_reference}. Reason: ${appointment.cancellation_reason}`,
    });

    // Notify patient
    const patient = this.getPatientById(appointment.patient_id);
    if (patient) {
      this.sendNotification(
        patient.user_id,
        'Appointment Cancelled',
        `Your appointment (${appointment.appointment_reference}) has been cancelled.`,
        'appointment'
      );
    }

    this.saveDatabase();
    return { success: true };
  }

  public updateAppointmentStatus(
    id: string,
    status: AppointmentStatus,
    user: { id: string; email: string; role: 'PATIENT' | 'DOCTOR' | 'ADMIN' }
  ): { success: boolean; appointment?: Appointment; error?: string } {
    const apt = this.data.appointments.find((a) => a.id === id);
    if (!apt) return { success: false, error: 'Appointment not found' };

    const oldStatus = apt.status;
    apt.status = status;
    apt.updated_at = new Date().toISOString();

    this.logAudit({
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      action: 'Updated Appointment Status',
      module: 'Appointments',
      record_id: apt.id,
      details: `Changed appointment ${apt.appointment_reference} status from ${oldStatus} to ${status}.`,
    });

    this.saveDatabase();
    return { success: true, appointment: this.getAppointmentById(id) };
  }

  public rescheduleAppointment(
    id: string,
    newDate: string,
    newSlot: string,
    user: { id: string; email: string; role: 'PATIENT' | 'DOCTOR' | 'ADMIN' }
  ): { success: boolean; appointment?: Appointment; error?: string } {
    const apt = this.data.appointments.find((a) => a.id === id);
    if (!apt) return { success: false, error: 'Appointment not found.' };

    if (apt.status === 'completed' || apt.status === 'in_consultation') {
      return { success: false, error: 'Cannot reschedule appointments that are already active or completed.' };
    }

    const slotCheck = this.getAvailableSlots(apt.doctor_id, newDate);
    const targetSlot = slotCheck.availableSlots.find(
      (s) => s.formattedTime === newSlot || s.time === newSlot
    );

    if (!targetSlot || !targetSlot.available) {
      return { success: false, error: 'The requested new slot is not available.' };
    }

    const oldDate = apt.appointment_date;
    const oldSlot = apt.time_slot;
    apt.appointment_date = newDate;
    apt.time_slot = targetSlot.formattedTime;
    apt.status = 'confirmed';
    apt.updated_at = new Date().toISOString();

    this.logAudit({
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      action: 'Rescheduled Appointment',
      module: 'Appointments',
      record_id: apt.id,
      details: `Rescheduled ${apt.appointment_reference} from ${oldDate} ${oldSlot} to ${newDate} ${targetSlot.formattedTime}.`,
    });

    const patient = this.getPatientById(apt.patient_id);
    if (patient) {
      this.sendNotification(
        patient.user_id,
        'Appointment Rescheduled',
        `Your appointment ${apt.appointment_reference} has been rescheduled to ${newDate} at ${targetSlot.formattedTime}.`,
        'appointment'
      );
    }

    this.saveDatabase();
    return { success: true, appointment: this.getAppointmentById(id) };
  }

  // ==========================================
  // CLINIC QUEUE SYSTEM
  // ==========================================
  public getTodayQueue(filters?: { doctorId?: string; status?: string }): QueueItem[] {
    const today = new Date().toISOString().split('T')[0];
    let list = this.data.queue.filter((q) => q.queue_date === today);

    if (filters?.doctorId) {
      list = list.filter((q) => q.doctor_id === filters.doctorId);
    }
    if (filters?.status && filters.status !== 'all') {
      list = list.filter((q) => q.status === filters.status);
    }

    const enriched = list.map((item) => ({
      ...item,
      patient: this.data.patients.find((p) => p.id === item.patient_id),
      doctor: this.data.doctors.find((d) => d.id === item.doctor_id),
      appointment: this.data.appointments.find((a) => a.id === item.appointment_id),
    }));

    // Sort order: In consultation -> Called -> Waiting -> Skipped -> Completed -> No Show
    const orderMap: Record<QueueStatus, number> = {
      in_consultation: 1,
      called: 2,
      waiting: 3,
      skipped: 4,
      completed: 5,
      no_show: 6,
    };

    enriched.sort((a, b) => {
      const diff = orderMap[a.status] - orderMap[b.status];
      if (diff !== 0) return diff;
      return a.queue_number.localeCompare(b.queue_number);
    });

    return enriched;
  }

  // Check in a patient (either with existing appointment or walk-in)
  public checkInPatient(data: {
    appointment_id?: string;
    patient_id: string;
    doctor_id: string;
    checkedInBy: { id: string; email: string; role: 'PATIENT' | 'DOCTOR' | 'ADMIN' };
  }): { success: boolean; queueItem?: QueueItem; error?: string } {
    const today = new Date().toISOString().split('T')[0];

    // Check appointment validity
    let appointment: Appointment | undefined;
    if (data.appointment_id) {
      appointment = this.data.appointments.find((a) => a.id === data.appointment_id);
      if (!appointment) return { success: false, error: 'Appointment not found.' };

      if (appointment.status === 'cancelled') {
        return { success: false, error: 'Cannot check in a cancelled appointment.' };
      }
      if (appointment.status === 'completed') {
        return { success: false, error: 'This appointment has already been completed.' };
      }
      if (appointment.status === 'no_show') {
        return { success: false, error: 'Cannot normally check in a no-show appointment.' };
      }
      if (appointment.appointment_date !== today) {
        return {
          success: false,
          error: `Appointment date (${appointment.appointment_date}) is not today (${today}). Check-in is only allowed on the appointment day.`,
        };
      }
    }

    // Rule 3: Patient cannot occupy multiple active queue positions for same appointment
    const existingQueue = this.data.queue.find(
      (q) =>
        q.queue_date === today &&
        ((appointment && q.appointment_id === appointment.id) ||
          (q.patient_id === data.patient_id &&
            q.doctor_id === data.doctor_id &&
            ['waiting', 'called', 'in_consultation'].includes(q.status)))
    );

    if (existingQueue) {
      return {
        success: false,
        error: `Patient already has an active queue ticket today (${existingQueue.queue_number}) with status '${existingQueue.status}'.`,
      };
    }

    // Generate next sequential queue number: A001, A002, etc.
    const todayItems = this.data.queue.filter((q) => q.queue_date === today);
    const prefix = this.data.clinic_settings.daily_queue_prefix || 'A';
    const nextSeq = todayItems.length + 1;
    const queueNumber = `${prefix}${String(nextSeq).padStart(3, '0')}`;

    const newQueueItem: QueueItem = {
      id: `que_${crypto.randomUUID().slice(0, 8)}`,
      queue_number: queueNumber,
      queue_date: today,
      appointment_id: appointment?.id,
      patient_id: data.patient_id,
      doctor_id: data.doctor_id,
      check_in_time: new Date().toISOString(),
      status: 'waiting',
      remarks: 'Checked in and waiting in queue.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.queue.push(newQueueItem);

    // Update appointment status if present
    if (appointment) {
      appointment.status = 'in_queue';
      appointment.updated_at = new Date().toISOString();
    }

    const patient = this.getPatientById(data.patient_id);
    const doctor = this.getDoctorById(data.doctor_id);

    this.logAudit({
      user_id: data.checkedInBy.id,
      user_email: data.checkedInBy.email,
      user_role: data.checkedInBy.role,
      action: 'Checked In Patient',
      module: 'Queue',
      record_id: newQueueItem.id,
      details: `Generated queue ticket ${queueNumber} for patient ${patient?.first_name} ${patient?.last_name} with Dr. ${doctor?.last_name}.`,
    });

    if (patient) {
      this.sendNotification(
        patient.user_id,
        'Checked In - In Queue',
        `You are now in the clinic queue! Your ticket number is ${queueNumber}. Please listen for announcements in the waiting area.`,
        'queue'
      );
    }

    this.saveDatabase();

    return {
      success: true,
      queueItem: {
        ...newQueueItem,
        patient,
        doctor,
        appointment,
      },
    };
  }

  // Doctor or Staff calls the next waiting patient
  public callNext(
    doctorId: string,
    calledBy: { id: string; email: string; role: 'PATIENT' | 'DOCTOR' | 'ADMIN' }
  ): { success: boolean; queueItem?: QueueItem; error?: string } {
    const today = new Date().toISOString().split('T')[0];

    // Find next waiting queue item for this doctor (or general if not specified)
    const nextWaiting = this.data.queue
      .filter((q) => q.queue_date === today && q.status === 'waiting' && (!doctorId || q.doctor_id === doctorId))
      .sort((a, b) => a.queue_number.localeCompare(b.queue_number))[0];

    if (!nextWaiting) {
      return { success: false, error: 'No waiting patients in queue for this doctor.' };
    }

    nextWaiting.status = 'called';
    nextWaiting.called_time = new Date().toISOString();
    nextWaiting.updated_at = new Date().toISOString();

    const doctor = this.getDoctorById(nextWaiting.doctor_id);
    const patient = this.getPatientById(nextWaiting.patient_id);

    this.logAudit({
      user_id: calledBy.id,
      user_email: calledBy.email,
      user_role: calledBy.role,
      action: 'Called Patient',
      module: 'Queue',
      record_id: nextWaiting.id,
      details: `Called queue ticket ${nextWaiting.queue_number} (${patient?.first_name} ${patient?.last_name}) to ${doctor?.room_number || 'Consultation Room'}.`,
    });

    if (patient) {
      this.sendNotification(
        patient.user_id,
        'Queue Number Called!',
        `Ticket ${nextWaiting.queue_number} is now being called! Please proceed immediately to ${doctor?.room_number || 'Consultation Room'} to see Dr. ${doctor?.first_name} ${doctor?.last_name}.`,
        'queue'
      );
    }

    this.saveDatabase();

    return {
      success: true,
      queueItem: {
        ...nextWaiting,
        patient,
        doctor,
      },
    };
  }

  // Recall a patient
  public recallPatient(
    queueId: string,
    user: { id: string; email: string; role: 'PATIENT' | 'DOCTOR' | 'ADMIN' }
  ): { success: boolean; queueItem?: QueueItem; error?: string } {
    const item = this.data.queue.find((q) => q.id === queueId);
    if (!item) return { success: false, error: 'Queue item not found.' };

    if (item.status === 'completed') {
      return { success: false, error: 'Cannot recall a patient whose consultation is already completed.' };
    }

    item.status = 'called';
    item.called_time = new Date().toISOString();
    item.updated_at = new Date().toISOString();

    const patient = this.getPatientById(item.patient_id);
    const doctor = this.getDoctorById(item.doctor_id);

    this.logAudit({
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      action: 'Recalled Patient',
      module: 'Queue',
      record_id: item.id,
      details: `Recalled queue ticket ${item.queue_number}.`,
    });

    if (patient) {
      this.sendNotification(
        patient.user_id,
        'Second Call: Proceed to Room',
        `Re-announcement for Queue Ticket ${item.queue_number}: Please proceed to ${doctor?.room_number || 'Consultation Room'}.`,
        'queue'
      );
    }

    this.saveDatabase();
    return { success: true, queueItem: item };
  }

  // Skip a patient
  public skipPatient(
    queueId: string,
    user: { id: string; email: string; role: 'PATIENT' | 'DOCTOR' | 'ADMIN' }
  ): { success: boolean; queueItem?: QueueItem; error?: string } {
    const item = this.data.queue.find((q) => q.id === queueId);
    if (!item) return { success: false, error: 'Queue item not found.' };

    if (item.status === 'completed') {
      return { success: false, error: 'A completed patient cannot be skipped.' };
    }

    item.status = 'skipped';
    item.remarks = 'Patient skipped by staff.';
    item.updated_at = new Date().toISOString();

    this.logAudit({
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      action: 'Skipped Patient',
      module: 'Queue',
      record_id: item.id,
      details: `Skipped queue ticket ${item.queue_number}.`,
    });

    this.saveDatabase();
    return { success: true, queueItem: item };
  }

  // Start Consultation
  public startConsultation(
    queueId: string,
    user: { id: string; email: string; role: 'PATIENT' | 'DOCTOR' | 'ADMIN' }
  ): { success: boolean; queueItem?: QueueItem; error?: string } {
    const item = this.data.queue.find((q) => q.id === queueId);
    if (!item) return { success: false, error: 'Queue item not found.' };

    if (item.status === 'completed') {
      return { success: false, error: 'Consultation has already been completed.' };
    }

    item.status = 'in_consultation';
    item.consultation_start_time = new Date().toISOString();
    item.updated_at = new Date().toISOString();

    if (item.appointment_id) {
      const apt = this.data.appointments.find((a) => a.id === item.appointment_id);
      if (apt) {
        apt.status = 'in_consultation';
        apt.updated_at = new Date().toISOString();
      }
    }

    const patient = this.getPatientById(item.patient_id);
    const doctor = this.getDoctorById(item.doctor_id);

    this.logAudit({
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      action: 'Started Consultation',
      module: 'Queue',
      record_id: item.id,
      details: `Started consultation with ${patient?.first_name} ${patient?.last_name} (Ticket ${item.queue_number}).`,
    });

    if (patient) {
      this.sendNotification(
        patient.user_id,
        'Consultation Started',
        `Your consultation with Dr. ${doctor?.first_name} ${doctor?.last_name} has started in ${doctor?.room_number || 'Room'}.`,
        'queue'
      );
    }

    this.saveDatabase();
    return { success: true, queueItem: item };
  }

  // Complete Consultation & Record Notes
  public completeConsultation(
    queueId: string,
    consultationData: {
      chief_complaint: string;
      symptoms: string;
      diagnosis: string;
      clinical_notes: string;
      prescription: string;
      recommendations: string;
      follow_up_date?: string;
    },
    user: { id: string; email: string; role: 'PATIENT' | 'DOCTOR' | 'ADMIN' }
  ): { success: boolean; consultation?: Consultation; error?: string } {
    const item = this.data.queue.find((q) => q.id === queueId);
    if (!item) return { success: false, error: 'Queue item not found.' };

    item.status = 'completed';
    item.completion_time = new Date().toISOString();
    item.updated_at = new Date().toISOString();

    if (item.appointment_id) {
      const apt = this.data.appointments.find((a) => a.id === item.appointment_id);
      if (apt) {
        apt.status = 'completed';
        apt.updated_at = new Date().toISOString();
      }
    }

    // Create or update consultation record
    const today = new Date().toISOString().split('T')[0];
    const newConsultation: Consultation = {
      id: `con_${crypto.randomUUID().slice(0, 8)}`,
      appointment_id: item.appointment_id,
      patient_id: item.patient_id,
      doctor_id: item.doctor_id,
      chief_complaint: consultationData.chief_complaint,
      symptoms: consultationData.symptoms,
      diagnosis: consultationData.diagnosis,
      clinical_notes: consultationData.clinical_notes,
      prescription: consultationData.prescription,
      recommendations: consultationData.recommendations,
      follow_up_date: consultationData.follow_up_date,
      consultation_date: today,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.consultations.push(newConsultation);

    const patient = this.getPatientById(item.patient_id);
    const doctor = this.getDoctorById(item.doctor_id);

    this.logAudit({
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      action: 'Completed Consultation',
      module: 'Consultations',
      record_id: newConsultation.id,
      details: `Completed consultation for ${patient?.first_name} ${patient?.last_name}. Diagnosis: ${consultationData.diagnosis}`,
    });

    if (patient) {
      this.sendNotification(
        patient.user_id,
        'Consultation Completed',
        `Your consultation with Dr. ${doctor?.last_name} is finished. You can view your clinical notes, diagnosis, and prescription in your Consultation History.`,
        'consultation'
      );
    }

    this.saveDatabase();
    return { success: true, consultation: newConsultation };
  }

  // Mark patient as No-Show
  public markNoShow(
    queueId: string,
    user: { id: string; email: string; role: 'PATIENT' | 'DOCTOR' | 'ADMIN' }
  ): { success: boolean; queueItem?: QueueItem; error?: string } {
    const item = this.data.queue.find((q) => q.id === queueId);
    if (!item) return { success: false, error: 'Queue item not found.' };

    item.status = 'no_show';
    item.remarks = 'Patient did not respond to calls and marked as no-show.';
    item.updated_at = new Date().toISOString();

    if (item.appointment_id) {
      const apt = this.data.appointments.find((a) => a.id === item.appointment_id);
      if (apt) {
        apt.status = 'no_show';
        apt.updated_at = new Date().toISOString();
      }
    }

    this.logAudit({
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      action: 'Marked No-Show',
      module: 'Queue',
      record_id: item.id,
      details: `Marked queue ticket ${item.queue_number} as No-Show.`,
    });

    this.saveDatabase();
    return { success: true, queueItem: item };
  }

  // Patient live queue screen metrics
  public getPatientQueueStatus(patientId: string) {
    const today = new Date().toISOString().split('T')[0];
    const myItem = this.data.queue
      .filter((q) => q.patient_id === patientId && q.queue_date === today)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

    if (!myItem) {
      return { hasTicket: false, message: 'You do not have an active queue ticket today.' };
    }

    const doctor = this.getDoctorById(myItem.doctor_id);

    // Current patient serving for this doctor
    const nowServingItem = this.data.queue.find(
      (q) =>
        q.queue_date === today &&
        q.doctor_id === myItem.doctor_id &&
        ['called', 'in_consultation'].includes(q.status)
    );

    // Count waiting patients ahead of this patient for the same doctor
    const waitingList = this.data.queue
      .filter(
        (q) =>
          q.queue_date === today &&
          q.doctor_id === myItem.doctor_id &&
          q.status === 'waiting'
      )
      .sort((a, b) => a.queue_number.localeCompare(b.queue_number));

    const myIndex = waitingList.findIndex((q) => q.id === myItem.id);
    const patientsAhead = myIndex >= 0 ? myIndex : 0;
    const avgConsultTime = this.data.clinic_settings.avg_consultation_time_minutes || 15;
    const estimatedMinutes = patientsAhead * avgConsultTime;

    return {
      hasTicket: true,
      ticket: {
        ...myItem,
        doctor,
      },
      nowServing: nowServingItem?.queue_number || 'None',
      nowServingStatus: nowServingItem?.status || 'idle',
      patientsAhead,
      estimatedWaitTime:
        myItem.status === 'in_consultation'
          ? 'Currently in room'
          : myItem.status === 'called'
          ? 'Calling now — please proceed inside'
          : patientsAhead === 0
          ? 'Next in line (Approximately 5–10 mins)'
          : `Approximately ${estimatedMinutes} minutes`,
    };
  }

  // ==========================================
  // CONSULTATIONS
  // ==========================================
  public getConsultations(patientId?: string, doctorId?: string): Consultation[] {
    let list = [...this.data.consultations];
    if (patientId) {
      list = list.filter((c) => c.patient_id === patientId);
    }
    if (doctorId) {
      list = list.filter((c) => c.doctor_id === doctorId);
    }

    return list
      .map((c) => ({
        ...c,
        patient: this.data.patients.find((p) => p.id === c.patient_id),
        doctor: this.data.doctors.find((d) => d.id === c.doctor_id),
        appointment: this.data.appointments.find((a) => a.id === c.appointment_id),
      }))
      .sort((a, b) => new Date(b.consultation_date).getTime() - new Date(a.consultation_date).getTime());
  }

  public getConsultationById(id: string): Consultation | undefined {
    const c = this.data.consultations.find((item) => item.id === id);
    if (!c) return undefined;

    return {
      ...c,
      patient: this.data.patients.find((p) => p.id === c.patient_id),
      doctor: this.data.doctors.find((d) => d.id === c.doctor_id),
      appointment: this.data.appointments.find((a) => a.id === c.appointment_id),
    };
  }

  // ==========================================
  // REPORTS
  // ==========================================
  public getDailyAppointmentReport(dateStr?: string) {
    const date = dateStr || new Date().toISOString().split('T')[0];
    const appointments = this.getAppointments({ date });

    const total = appointments.length;
    const completed = appointments.filter((a) => a.status === 'completed').length;
    const cancelled = appointments.filter((a) => a.status === 'cancelled').length;
    const noShow = appointments.filter((a) => a.status === 'no_show').length;
    const pending = appointments.filter((a) => a.status === 'pending').length;
    const confirmed = appointments.filter((a) => a.status === 'confirmed').length;

    return {
      date,
      total,
      completed,
      cancelled,
      noShow,
      pending,
      confirmed,
      appointments,
    };
  }

  public getDailyQueueReport(dateStr?: string) {
    const date = dateStr || new Date().toISOString().split('T')[0];
    const items = this.data.queue
      .filter((q) => q.queue_date === date)
      .map((q) => ({
        ...q,
        patient: this.data.patients.find((p) => p.id === q.patient_id),
        doctor: this.data.doctors.find((d) => d.id === q.doctor_id),
      }))
      .sort((a, b) => a.queue_number.localeCompare(b.queue_number));

    const total = items.length;
    const completed = items.filter((q) => q.status === 'completed').length;
    const skipped = items.filter((q) => q.status === 'skipped').length;
    const noShow = items.filter((q) => q.status === 'no_show').length;
    const waiting = items.filter((q) => q.status === 'waiting').length;

    return {
      date,
      total,
      completed,
      skipped,
      noShow,
      waiting,
      items,
    };
  }

  public getDoctorPerformanceReport() {
    return this.data.doctors.map((doc) => {
      const apts = this.data.appointments.filter((a) => a.doctor_id === doc.id);
      const total = apts.length;
      const completed = apts.filter((a) => a.status === 'completed').length;
      const cancelled = apts.filter((a) => a.status === 'cancelled').length;
      const noShow = apts.filter((a) => a.status === 'no_show').length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        doctor: doc,
        totalAppointments: total,
        completed,
        cancelled,
        noShow,
        completionRate,
      };
    });
  }

  public getAppointmentStatistics() {
    const total = this.data.appointments.length;
    const completed = this.data.appointments.filter((a) => a.status === 'completed').length;
    const cancelled = this.data.appointments.filter((a) => a.status === 'cancelled').length;
    const noShow = this.data.appointments.filter((a) => a.status === 'no_show').length;
    const pending = this.data.appointments.filter((a) => a.status === 'pending').length;
    const confirmed = this.data.appointments.filter((a) => a.status === 'confirmed').length;
    const inProgress = this.data.appointments.filter((a) =>
      ['checked_in', 'in_queue', 'in_consultation'].includes(a.status)
    ).length;

    return {
      total,
      completed,
      cancelled,
      noShow,
      pending,
      confirmed,
      inProgress,
    };
  }

  // ==========================================
  // AUDIT LOGS
  // ==========================================
  public getAuditLogs(filters?: { module?: string; userRole?: string; search?: string }): AuditLog[] {
    let list = [...this.data.audit_logs];

    if (filters?.module && filters.module !== 'all') {
      list = list.filter((l) => l.module.toLowerCase() === filters.module?.toLowerCase());
    }
    if (filters?.userRole && filters.userRole !== 'all') {
      list = list.filter((l) => l.user_role === filters.userRole);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.user_email.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // ==========================================
  // CLINIC SETTINGS
  // ==========================================
  public getSettings(): ClinicSettings {
    return this.data.clinic_settings;
  }

  public updateSettings(
    updates: Partial<ClinicSettings>,
    user: { id: string; email: string; role: 'PATIENT' | 'DOCTOR' | 'ADMIN' }
  ): ClinicSettings {
    Object.assign(this.data.clinic_settings, updates, { updated_at: new Date().toISOString() });

    this.logAudit({
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      action: 'Updated Clinic Settings',
      module: 'Settings',
      record_id: this.data.clinic_settings.id,
      details: 'Updated clinic contact, operating hours, or queue rules.',
    });

    this.saveDatabase();
    return this.data.clinic_settings;
  }

  // ==========================================
  // VITAL SIGNS & CLINICAL TRACKING
  // ==========================================
  public getPatientVitals(patientId: string): VitalSignRecord[] {
    return (this.data.vital_signs || [])
      .filter((v) => v.patient_id === patientId)
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
  }

  public addVitalSign(vital: Omit<VitalSignRecord, 'id' | 'recorded_at'>): VitalSignRecord {
    const newRecord: VitalSignRecord = {
      id: `vtl_${crypto.randomUUID().slice(0, 8)}`,
      recorded_at: new Date().toISOString(),
      ...vital,
    };
    if (!this.data.vital_signs) this.data.vital_signs = [];
    this.data.vital_signs.unshift(newRecord);
    this.saveDatabase();
    return newRecord;
  }

  // ==========================================
  // LAB & DIAGNOSTIC ORDERS
  // ==========================================
  public getLabOrders(filters?: { patientId?: string; doctorId?: string; status?: string }): LabOrder[] {
    let list = this.data.lab_orders || [];
    if (filters?.patientId) {
      list = list.filter((l) => l.patient_id === filters.patientId);
    }
    if (filters?.doctorId) {
      list = list.filter((l) => l.doctor_id === filters.doctorId);
    }
    if (filters?.status) {
      list = list.filter((l) => l.status === filters.status);
    }

    return list.map((order) => ({
      ...order,
      patient: this.data.patients.find((p) => p.id === order.patient_id),
      doctor: this.data.doctors.find((d) => d.id === order.doctor_id),
    })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public createLabOrder(
    data: Omit<LabOrder, 'id' | 'order_number' | 'created_at' | 'updated_at'>,
    user?: { id: string; email: string; role: 'PATIENT' | 'DOCTOR' | 'ADMIN' }
  ): LabOrder {
    const count = (this.data.lab_orders || []).length + 101;
    const newOrder: LabOrder = {
      id: `lab_${crypto.randomUUID().slice(0, 8)}`,
      order_number: `LAB-2026-${String(count).padStart(5, '0')}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...data,
    };

    if (!this.data.lab_orders) this.data.lab_orders = [];
    this.data.lab_orders.unshift(newOrder);

    // Also auto-generate a pending billing invoice item if patient has billing
    const totalLabPrice = newOrder.tests.reduce((acc, t) => acc + (t.standard_price || 0), 0);
    if (totalLabPrice > 0) {
      this.createInvoice({
        patient_id: newOrder.patient_id,
        doctor_id: newOrder.doctor_id,
        items: newOrder.tests.map((t) => ({
          id: `itm_${crypto.randomUUID().slice(0, 6)}`,
          description: `Laboratory: ${t.test_name} (${t.test_code})`,
          category: 'laboratory',
          quantity: 1,
          unit_price: t.standard_price,
          total: t.standard_price,
        })),
        subtotal: totalLabPrice,
        discount_amount: 0,
        discount_type: 'None',
        tax_amount: 0,
        total_amount: totalLabPrice,
        status: 'pending',
        amount_paid: 0,
        balance_due: totalLabPrice,
        remarks: `Auto-generated from Lab Order #${newOrder.order_number}`,
      });
    }

    if (user) {
      this.logAudit({
        user_id: user.id,
        user_email: user.email,
        user_role: user.role,
        action: 'Created Diagnostic Lab Order',
        module: 'Laboratory',
        record_id: newOrder.id,
        details: `Issued ${newOrder.tests.length} test(s) under order ${newOrder.order_number}.`,
      });
    }

    this.saveDatabase();
    return newOrder;
  }

  public updateLabOrderStatus(
    orderId: string,
    status: LabOrder['status'],
    resultsSummary?: string
  ): LabOrder | null {
    const order = (this.data.lab_orders || []).find((l) => l.id === orderId);
    if (!order) return null;

    order.status = status;
    if (resultsSummary) order.results_summary = resultsSummary;
    order.updated_at = new Date().toISOString();

    this.saveDatabase();
    return order;
  }

  // ==========================================
  // BILLING, CASHIER & HMO
  // ==========================================
  public getInvoices(filters?: { patientId?: string; status?: string }): BillingInvoice[] {
    let list = this.data.billing_invoices || [];
    if (filters?.patientId) {
      list = list.filter((i) => i.patient_id === filters.patientId);
    }
    if (filters?.status && filters.status !== 'all') {
      list = list.filter((i) => i.status === filters.status);
    }

    return list.map((inv) => ({
      ...inv,
      patient: this.data.patients.find((p) => p.id === inv.patient_id),
      doctor: inv.doctor_id ? this.data.doctors.find((d) => d.id === inv.doctor_id) : undefined,
    })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getInvoiceById(id: string): BillingInvoice | null {
    const inv = (this.data.billing_invoices || []).find((i) => i.id === id);
    if (!inv) return null;
    return {
      ...inv,
      patient: this.data.patients.find((p) => p.id === inv.patient_id),
      doctor: inv.doctor_id ? this.data.doctors.find((d) => d.id === inv.doctor_id) : undefined,
    };
  }

  public createInvoice(
    data: Omit<BillingInvoice, 'id' | 'invoice_number' | 'created_at' | 'updated_at'>,
    user?: { id: string; email: string; role: 'PATIENT' | 'DOCTOR' | 'ADMIN' }
  ): BillingInvoice {
    const count = (this.data.billing_invoices || []).length + 891;
    const newInvoice: BillingInvoice = {
      id: `inv_${crypto.randomUUID().slice(0, 8)}`,
      invoice_number: `INV-2026-${String(count).padStart(5, '0')}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...data,
    };

    if (!this.data.billing_invoices) this.data.billing_invoices = [];
    this.data.billing_invoices.unshift(newInvoice);

    if (user) {
      this.logAudit({
        user_id: user.id,
        user_email: user.email,
        user_role: user.role,
        action: 'Created Billing Statement',
        module: 'Billing',
        record_id: newInvoice.id,
        details: `Created invoice ${newInvoice.invoice_number} for ₱${newInvoice.total_amount}.`,
      });
    }

    this.saveDatabase();
    return newInvoice;
  }

  public payInvoice(
    id: string,
    payment: {
      payment_method: any;
      amount_paid: number;
      change_amount?: number;
      qr_payment_ref?: string;
      qr_payment_channel?: 'QR_PH' | 'GCASH' | 'MAYA';
      hmo_provider?: string;
      hmo_member_id?: string;
      hmo_approval_code?: string;
      hmo_coverage_amount?: number;
      patient_copay?: number;
      remarks?: string;
      cashier_name?: string;
    },
    user?: { id: string; email: string; role: 'PATIENT' | 'DOCTOR' | 'ADMIN' }
  ): BillingInvoice | null {
    const inv = (this.data.billing_invoices || []).find((i) => i.id === id);
    if (!inv) return null;

    inv.payment_method = payment.payment_method;
    inv.amount_paid = payment.amount_paid;
    inv.balance_due = Math.max(0, inv.total_amount - (payment.amount_paid + (payment.hmo_coverage_amount || 0)));
    inv.change_amount = payment.change_amount || 0;
    if (payment.qr_payment_ref) inv.qr_payment_ref = payment.qr_payment_ref;
    if (payment.qr_payment_channel) inv.qr_payment_channel = payment.qr_payment_channel;
    inv.hmo_provider = payment.hmo_provider;
    inv.hmo_member_id = payment.hmo_member_id;
    inv.hmo_approval_code = payment.hmo_approval_code;
    inv.hmo_coverage_amount = payment.hmo_coverage_amount;
    inv.patient_copay = payment.patient_copay;
    inv.cashier_name = payment.cashier_name || user?.email || 'Admin Cashier';
    inv.payment_date = new Date().toISOString();
    inv.receipt_number = `OR-2026-${String(Math.floor(10000 + Math.random() * 90000))}`;
    inv.status = inv.balance_due === 0 ? 'paid' : 'partially_paid';
    if (payment.remarks) inv.remarks = payment.remarks;
    inv.updated_at = new Date().toISOString();

    if (user) {
      this.logAudit({
        user_id: user.id,
        user_email: user.email,
        user_role: user.role,
        action: 'Processed Invoice Payment',
        module: 'Billing',
        record_id: inv.id,
        details: `Collected ₱${payment.amount_paid} via ${payment.payment_method.toUpperCase()} for ${inv.invoice_number}. Official Receipt: ${inv.receipt_number}`,
      });
    }

    this.saveDatabase();
    return inv;
  }

  // ==========================================
  // DOCTOR OPERATIONAL STATUS
  // ==========================================
  public getDoctorWorkStatuses(): (DoctorWorkStatus & { doctor?: Doctor })[] {
    const list = this.data.doctor_work_statuses || [];
    return this.data.doctors.map((doc) => {
      const found = list.find((s) => s.doctor_id === doc.id);
      return {
        doctor_id: doc.id,
        status: (found ? found.status : 'available') as DoctorWorkStatusType,
        status_message: found?.status_message || `${doc.room_number} Open for Patients`,
        break_minutes_remaining: found?.break_minutes_remaining,
        updated_at: found?.updated_at || new Date().toISOString(),
        doctor: doc,
      };
    });
  }

  public updateDoctorWorkStatus(
    doctorId: string,
    status: DoctorWorkStatusType,
    statusMessage?: string,
    breakMinutes?: number
  ): DoctorWorkStatus {
    if (!this.data.doctor_work_statuses) this.data.doctor_work_statuses = [];
    let item = this.data.doctor_work_statuses.find((s) => s.doctor_id === doctorId);
    if (!item) {
      item = {
        doctor_id: doctorId,
        status,
        status_message: statusMessage,
        break_minutes_remaining: breakMinutes,
        updated_at: new Date().toISOString(),
      };
      this.data.doctor_work_statuses.push(item);
    } else {
      item.status = status;
      item.status_message = statusMessage || item.status_message;
      item.break_minutes_remaining = breakMinutes;
      item.updated_at = new Date().toISOString();
    }

    this.saveDatabase();
    return item;
  }

  // ==========================================
  // PRE-CONSULTATION TRIAGE
  // ==========================================
  public getTriage(patientId: string, appointmentId?: string): PreConsultationTriage | null {
    const list = this.data.triages || [];
    if (appointmentId) {
      const match = list.find((t) => t.appointment_id === appointmentId);
      if (match) return match;
    }
    return list.find((t) => t.patient_id === patientId) || null;
  }

  public saveTriage(data: Omit<PreConsultationTriage, 'id' | 'submitted_at'>): PreConsultationTriage {
    if (!this.data.triages) this.data.triages = [];
    const newTriage: PreConsultationTriage = {
      id: `trg_${crypto.randomUUID().slice(0, 8)}`,
      submitted_at: new Date().toISOString(),
      ...data,
    };
    this.data.triages.unshift(newTriage);
    this.saveDatabase();
    return newTriage;
  }

  // ==========================================
  // PUBLIC WAITING ROOM TV / KIOSK DISPLAY
  // ==========================================
  public getPublicDisplayData() {
    const today = new Date().toISOString().split('T')[0];
    const todayQueue = (this.data.queue || []).filter((q) => q.queue_date === today);

    // Active rooms / doctors currently serving
    const doctors = this.data.doctors.filter((d) => d.status === 'Active');
    const doctorStatuses = this.getDoctorWorkStatuses();

    const roomStatusList = doctors.map((doc) => {
      const docStatus = doctorStatuses.find((s) => s.doctor_id === doc.id);
      // Finding currently called or in_consultation
      const currentPatient = todayQueue.find(
        (q) => q.doctor_id === doc.id && (q.status === 'called' || q.status === 'in_consultation')
      );
      // Upcoming waiting queue for this doctor
      const waitingList = todayQueue
        .filter((q) => q.doctor_id === doc.id && q.status === 'waiting')
        .sort((a, b) => a.queue_number.localeCompare(b.queue_number));

      let patientNameMasked = 'Ready for Patient';
      if (currentPatient) {
        const p = this.data.patients.find((pat) => pat.id === currentPatient.patient_id);
        if (p) {
          patientNameMasked = `${p.first_name} ${p.last_name.charAt(0)}.`;
        }
      }

      return {
        room_number: doc.room_number,
        doctor_id: doc.id,
        doctor_name: `Dr. ${doc.first_name} ${doc.last_name}`,
        specialization: doc.specialization_name,
        current_ticket: currentPatient ? currentPatient.queue_number : null,
        current_patient_name: patientNameMasked,
        current_status: currentPatient?.status || 'waiting',
        doctor_work_status: docStatus?.status || 'available',
        doctor_status_message: docStatus?.status_message,
        waiting_count: waitingList.length,
        next_tickets: waitingList.slice(0, 4).map((w) => w.queue_number),
      };
    });

    // Recent calls for audible chimes / ticker
    const recentCalled = todayQueue
      .filter((q) => q.status === 'called' || q.status === 'in_consultation')
      .sort((a, b) => new Date(b.called_time || b.updated_at).getTime() - new Date(a.called_time || a.updated_at).getTime())
      .slice(0, 8)
      .map((q) => {
        const doc = this.data.doctors.find((d) => d.id === q.doctor_id);
        const pat = this.data.patients.find((p) => p.id === q.patient_id);
        return {
          queue_number: q.queue_number,
          room_number: doc?.room_number || '101',
          doctor_name: doc ? `Dr. ${doc.first_name} ${doc.last_name}` : 'Doctor',
          patient_name: pat ? `${pat.first_name} ${pat.last_name.charAt(0)}.` : 'Patient',
          time: q.called_time || q.updated_at,
        };
      });

    return {
      clinic_name: this.data.clinic_settings.clinic_name,
      tagline: this.data.clinic_settings.tagline,
      date_formatted: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      room_status_list: roomStatusList,
      recent_called: recentCalled,
      total_waiting: todayQueue.filter((q) => q.status === 'waiting').length,
      total_serving: todayQueue.filter((q) => q.status === 'called' || q.status === 'in_consultation').length,
      total_completed: todayQueue.filter((q) => q.status === 'completed').length,
    };
  }

  // ==========================================
  // PHARMACY & MEDICATION DISPENSING
  // ==========================================
  public getPharmacyItems(query?: { search?: string; lowStockOnly?: boolean }): PharmacyItem[] {
    let items = [...(this.data.pharmacy_items || [])];
    if (query?.search) {
      const s = query.search.toLowerCase();
      items = items.filter(
        (i) => i.medicine_name.toLowerCase().includes(s) || i.generic_name.toLowerCase().includes(s)
      );
    }
    if (query?.lowStockOnly) {
      items = items.filter((i) => i.stock_quantity <= i.reorder_level);
    }
    return items;
  }

  public addPharmacyItem(itemData: Partial<PharmacyItem>, user?: User): PharmacyItem {
    const newItem: PharmacyItem = {
      id: `med_${crypto.randomBytes(4).toString('hex')}`,
      medicine_name: itemData.medicine_name || 'Medication',
      generic_name: itemData.generic_name || 'Generic Name',
      dosage_form: itemData.dosage_form || 'Tablet',
      strength: itemData.strength || '500mg',
      unit_price: Number(itemData.unit_price) || 10,
      stock_quantity: Number(itemData.stock_quantity) || 100,
      reorder_level: Number(itemData.reorder_level) || 20,
      expiration_date: itemData.expiration_date || '2028-12-31',
      batch_number: itemData.batch_number || `BAT-${Date.now().toString().slice(-6)}`,
      manufacturer: itemData.manufacturer || 'Licensed Pharmaceutical',
      is_active: itemData.is_active !== undefined ? itemData.is_active : true,
    };

    if (!this.data.pharmacy_items) this.data.pharmacy_items = [];
    this.data.pharmacy_items.push(newItem);
    this.saveDatabase();

    this.logAudit({
      user_id: user?.id || 'system',
      user_email: user?.email || 'Pharmacist',
      user_role: user?.role || 'ADMIN',
      action: 'Created Pharmacy Item',
      module: 'Pharmacy',
      record_id: newItem.id,
      details: `Added ${newItem.medicine_name} (${newItem.strength}) with initial stock ${newItem.stock_quantity}.`,
    });

    return newItem;
  }

  public updatePharmacyStock(id: string, delta: number, user?: User): PharmacyItem | null {
    const item = (this.data.pharmacy_items || []).find((i) => i.id === id);
    if (!item) return null;
    item.stock_quantity = Math.max(0, item.stock_quantity + delta);
    this.saveDatabase();
    return item;
  }

  public getDispenseRecords(filters?: { status?: string; patientId?: string }): PrescriptionDispense[] {
    let list = [...(this.data.dispense_records || [])];
    if (filters?.status) {
      list = list.filter((d) => d.status === filters.status);
    }
    if (filters?.patientId) {
      list = list.filter((d) => d.patient_id === filters.patientId);
    }

    return list.map((d) => ({
      ...d,
      patient: this.data.patients.find((p) => p.id === d.patient_id),
      doctor: this.data.doctors.find((doc) => doc.id === d.doctor_id),
    }));
  }

  public createDispenseRecord(data: Partial<PrescriptionDispense>, user?: User): PrescriptionDispense {
    const newDispense: PrescriptionDispense = {
      id: `dsp_${crypto.randomBytes(4).toString('hex')}`,
      consultation_id: data.consultation_id,
      patient_id: data.patient_id!,
      doctor_id: data.doctor_id!,
      prescription_text: data.prescription_text || '',
      items: data.items || [],
      status: 'pending',
      counseling_notes: data.counseling_notes,
      created_at: new Date().toISOString(),
    };

    if (!this.data.dispense_records) this.data.dispense_records = [];
    this.data.dispense_records.unshift(newDispense);
    this.saveDatabase();

    return {
      ...newDispense,
      patient: this.data.patients.find((p) => p.id === newDispense.patient_id),
      doctor: this.data.doctors.find((doc) => doc.id === newDispense.doctor_id),
    };
  }

  public updateDispenseStatus(
    id: string,
    status: 'pending' | 'prepared' | 'dispensed' | 'cancelled',
    dispensedBy?: string,
    counselingNotes?: string
  ): PrescriptionDispense | null {
    const record = (this.data.dispense_records || []).find((d) => d.id === id);
    if (!record) return null;

    record.status = status;
    if (counselingNotes) record.counseling_notes = counselingNotes;
    if (status === 'dispensed') {
      record.dispensed_by = dispensedBy || 'Staff Pharmacist';
      record.dispensed_at = new Date().toISOString();

      // Deduct inventory stock if matched
      for (const item of record.items) {
        if (item.pharmacy_item_id) {
          this.updatePharmacyStock(item.pharmacy_item_id, -item.quantity);
        }
      }
    }

    this.saveDatabase();
    return {
      ...record,
      patient: this.data.patients.find((p) => p.id === record.patient_id),
      doctor: this.data.doctors.find((doc) => doc.id === record.doctor_id),
    };
  }

  // ==========================================
  // LABORATORY RESULTS ENTRY
  // ==========================================
  public getLabResults(filters?: { patientId?: string; labOrderId?: string }): LabTestResult[] {
    let list = [...(this.data.lab_results || [])];
    if (filters?.patientId) {
      list = list.filter((r) => r.patient_id === filters.patientId);
    }
    if (filters?.labOrderId) {
      list = list.filter((r) => r.lab_order_id === filters.labOrderId);
    }

    return list.map((r) => ({
      ...r,
      patient: this.data.patients.find((p) => p.id === r.patient_id),
      doctor: this.data.doctors.find((doc) => doc.id === r.doctor_id),
    }));
  }

  public getLabResultById(id: string): LabTestResult | null {
    const r = (this.data.lab_results || []).find((item) => item.id === id);
    if (!r) return null;
    return {
      ...r,
      patient: this.data.patients.find((p) => p.id === r.patient_id),
      doctor: this.data.doctors.find((doc) => doc.id === r.doctor_id),
    };
  }

  public saveLabResult(resultData: Partial<LabTestResult>, user?: User): LabTestResult {
    if (!this.data.lab_results) this.data.lab_results = [];

    const existingIdx = this.data.lab_results.findIndex((r) => r.id === resultData.id);
    const now = new Date().toISOString();

    if (existingIdx >= 0) {
      this.data.lab_results[existingIdx] = {
        ...this.data.lab_results[existingIdx],
        ...resultData,
      } as LabTestResult;
      this.saveDatabase();
      return this.getLabResultById(resultData.id!)!;
    } else {
      const newResult: LabTestResult = {
        id: `lres_${crypto.randomBytes(4).toString('hex')}`,
        lab_order_id: resultData.lab_order_id || `ord_${Date.now()}`,
        patient_id: resultData.patient_id!,
        doctor_id: resultData.doctor_id!,
        test_name: resultData.test_name || 'Laboratory Analysis',
        category: resultData.category || 'General Diagnostics',
        sample_drawn_at: resultData.sample_drawn_at || now,
        performed_by: resultData.performed_by || (user?.email ? user.email.split('@')[0] : 'Lab Technologist'),
        verified_by: resultData.verified_by,
        result_date: resultData.result_date || now,
        status: resultData.status || 'released',
        parameters: resultData.parameters || [],
        clinical_interpretation: resultData.clinical_interpretation,
        created_at: now,
      };

      this.data.lab_results.unshift(newResult);

      // Also update matching lab order status to 'completed'
      if (resultData.lab_order_id) {
        this.updateLabOrderStatus(resultData.lab_order_id, 'completed', 'Test analysis verified and released.');
      }

      this.saveDatabase();
      return {
        ...newResult,
        patient: this.data.patients.find((p) => p.id === newResult.patient_id),
        doctor: this.data.doctors.find((doc) => doc.id === newResult.doctor_id),
      };
    }
  }

  // ==========================================
  // SMS & NOTIFICATION DISPATCHER
  // ==========================================
  public getSmsLogs(limit: number = 50): SmsLog[] {
    return [...(this.data.sms_logs || [])]
      .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
      .slice(0, limit);
  }

  public sendSms(
    recipientPhone: string,
    recipientName: string,
    message: string,
    type: 'queue_proximity' | 'appointment_reminder' | 'urgent_call' | 'general' = 'general'
  ): SmsLog {
    const newLog: SmsLog = {
      id: `sms_${crypto.randomBytes(4).toString('hex')}`,
      recipient_phone: recipientPhone,
      recipient_name: recipientName,
      message,
      type,
      status: 'delivered',
      sent_at: new Date().toISOString(),
    };

    if (!this.data.sms_logs) this.data.sms_logs = [];
    this.data.sms_logs.unshift(newLog);
    this.saveDatabase();
    return newLog;
  }

  // ==========================================
  // TELEMEDICINE SESSIONS
  // ==========================================
  public getTelemedSessions(filters?: { patientId?: string; doctorId?: string }): TelemedSession[] {
    let list = [...(this.data.telemed_sessions || [])];
    if (filters?.patientId) list = list.filter((s) => s.patient_id === filters.patientId);
    if (filters?.doctorId) list = list.filter((s) => s.doctor_id === filters.doctorId);

    return list.map((s) => ({
      ...s,
      patient: this.data.patients.find((p) => p.id === s.patient_id),
      doctor: this.data.doctors.find((d) => d.id === s.doctor_id),
    }));
  }

  public createTelemedSession(data: Partial<TelemedSession>): TelemedSession {
    const session: TelemedSession = {
      id: `tel_${crypto.randomBytes(4).toString('hex')}`,
      appointment_id: data.appointment_id || `apt_${Date.now()}`,
      patient_id: data.patient_id!,
      doctor_id: data.doctor_id!,
      room_code: `MEDIQUEUE-TEL-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'scheduled',
      doctor_notes: data.doctor_notes,
    };

    if (!this.data.telemed_sessions) this.data.telemed_sessions = [];
    this.data.telemed_sessions.unshift(session);
    this.saveDatabase();

    return {
      ...session,
      patient: this.data.patients.find((p) => p.id === session.patient_id),
      doctor: this.data.doctors.find((d) => d.id === session.doctor_id),
    };
  }

  public updateTelemedSession(
    id: string,
    status: 'scheduled' | 'active' | 'ended',
    notes?: string
  ): TelemedSession | null {
    const s = (this.data.telemed_sessions || []).find((item) => item.id === id);
    if (!s) return null;
    s.status = status;
    if (notes !== undefined) s.doctor_notes = notes;
    if (status === 'active' && !s.started_at) s.started_at = new Date().toISOString();
    if (status === 'ended') s.ended_at = new Date().toISOString();

    this.saveDatabase();
    return {
      ...s,
      patient: this.data.patients.find((p) => p.id === s.patient_id),
      doctor: this.data.doctors.find((d) => d.id === s.doctor_id),
    };
  }

  // ==========================================
  // CLINIC SATELLITE BRANCHES
  // ==========================================
  public getClinicBranches(): ClinicBranch[] {
    return [...(this.data.clinic_branches || [])];
  }

  public saveClinicBranch(branchData: Partial<ClinicBranch>): ClinicBranch {
    if (!this.data.clinic_branches) this.data.clinic_branches = [];

    const existingIdx = this.data.clinic_branches.findIndex((b) => b.id === branchData.id);
    if (existingIdx >= 0) {
      this.data.clinic_branches[existingIdx] = {
        ...this.data.clinic_branches[existingIdx],
        ...branchData,
      } as ClinicBranch;
      this.saveDatabase();
      return this.data.clinic_branches[existingIdx];
    } else {
      const newBranch: ClinicBranch = {
        id: `brn_${crypto.randomBytes(3).toString('hex')}`,
        branch_code: branchData.branch_code || `BRN-${Date.now().toString().slice(-4)}`,
        name: branchData.name || 'MediQueue Satellite Clinic',
        address: branchData.address || 'Clinic Address',
        city: branchData.city || 'Metro Manila',
        contact_number: branchData.contact_number || '+63 (02) 8000-0000',
        email: branchData.email || 'clinic@mediqueue.ph',
        operating_hours: branchData.operating_hours || 'Mon-Sat 8:00 AM - 5:00 PM',
        is_active: branchData.is_active !== undefined ? branchData.is_active : true,
      };

      this.data.clinic_branches.push(newBranch);
      this.saveDatabase();
      return newBranch;
    }
  }

  // -------------------------------------------------------------
  // DIGITAL MEDICAL CERTIFICATES & CLEARANCES
  // -------------------------------------------------------------
  getMedicalCertificates(filter?: { patient_id?: string; doctor_id?: string }): MedicalCertificate[] {
    let certs = this.data.medical_certificates || [];
    if (filter?.patient_id) {
      certs = certs.filter((c) => c.patient_id === filter.patient_id);
    }
    if (filter?.doctor_id) {
      certs = certs.filter((c) => c.doctor_id === filter.doctor_id);
    }

    return certs.map((c) => ({
      ...c,
      patient: this.data.patients.find((p) => p.id === c.patient_id),
      doctor: this.data.doctors.find((d) => d.id === c.doctor_id),
    }));
  }

  getMedicalCertificateById(id: string): MedicalCertificate | null {
    const cert = (this.data.medical_certificates || []).find((c) => c.id === id);
    if (!cert) return null;
    return {
      ...cert,
      patient: this.data.patients.find((p) => p.id === cert.patient_id),
      doctor: this.data.doctors.find((d) => d.id === cert.doctor_id),
    };
  }

  verifyMedicalCertificate(code: string): MedicalCertificate | null {
    const cleanCode = code.trim().toUpperCase();
    const cert = (this.data.medical_certificates || []).find(
      (c) => c.qr_verification_code.toUpperCase() === cleanCode || c.certificate_number.toUpperCase() === cleanCode
    );
    if (!cert) return null;
    return {
      ...cert,
      patient: this.data.patients.find((p) => p.id === cert.patient_id),
      doctor: this.data.doctors.find((d) => d.id === cert.doctor_id),
    };
  }

  createMedicalCertificate(
    data: Partial<MedicalCertificate>,
    user?: { id: string; email: string; role: 'PATIENT' | 'DOCTOR' | 'ADMIN' }
  ): MedicalCertificate {
    const randomCode = Math.floor(10000 + Math.random() * 90000);
    const doctor = this.data.doctors.find((d) => d.id === data.doctor_id);

    const newCert: MedicalCertificate = {
      id: `mc_${crypto.randomBytes(3).toString('hex')}`,
      certificate_number: `MC-2026-${String(randomCode)}`,
      patient_id: data.patient_id || '',
      doctor_id: data.doctor_id || doctor?.id || '',
      consultation_id: data.consultation_id,
      appointment_id: data.appointment_id,
      certificate_type: data.certificate_type || 'sick_leave',
      title: data.title || 'Official Medical Certificate',
      diagnosis: data.diagnosis || 'Clinical evaluation and physical examination',
      icd10_code: data.icd10_code || 'R69',
      findings_summary: data.findings_summary || '',
      recommendations: data.recommendations || 'Fit to resume regular activities.',
      rest_days: data.rest_days !== undefined ? Number(data.rest_days) : 0,
      effective_date: data.effective_date || new Date().toISOString().split('T')[0],
      expiry_date: data.expiry_date,
      physician_credentials: {
        name: data.physician_credentials?.name || (doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : 'Physician on Duty'),
        specialization: data.physician_credentials?.specialization || doctor?.specialization_name || 'General Medicine',
        prc_license: data.physician_credentials?.prc_license || doctor?.license_number || 'PRC-0000000',
        ptr_number: data.physician_credentials?.ptr_number || doctor?.ptr_number || 'PTR-AVAILABLE',
        s2_license: data.physician_credentials?.s2_license || doctor?.s2_license,
      },
      qr_verification_code: `VERIFY-MC-${randomCode}`,
      verification_hash: `sha256-${crypto.randomBytes(6).toString('hex')}`,
      remarks: data.remarks,
      is_valid: true,
      created_at: new Date().toISOString(),
    };

    if (!this.data.medical_certificates) {
      this.data.medical_certificates = [];
    }
    this.data.medical_certificates.unshift(newCert);
    this.saveDatabase();

    if (user) {
      this.logAudit({
        user_id: user.id,
        user_email: user.email,
        user_role: user.role,
        action: 'Issued Medical Certificate',
        module: 'Clinical',
        record_id: newCert.id,
        details: `Issued ${newCert.certificate_number} (${newCert.certificate_type}) for patient ${newCert.patient_id}. QR Verification: ${newCert.qr_verification_code}`,
      });
    }

    return {
      ...newCert,
      patient: this.data.patients.find((p) => p.id === newCert.patient_id),
      doctor: this.data.doctors.find((d) => d.id === newCert.doctor_id),
    };
  }

  // -------------------------------------------------------------
  // FORMAL SPECIALIST REFERRAL LETTERS
  // -------------------------------------------------------------
  getDoctorReferrals(filter?: { patient_id?: string; doctor_id?: string }): DoctorReferral[] {
    let refs = this.data.doctor_referrals || [];
    if (filter?.patient_id) {
      refs = refs.filter((r) => r.patient_id === filter.patient_id);
    }
    if (filter?.doctor_id) {
      refs = refs.filter((r) => r.referring_doctor_id === filter.doctor_id);
    }

    return refs.map((r) => ({
      ...r,
      patient: this.data.patients.find((p) => p.id === r.patient_id),
      referring_doctor: this.data.doctors.find((d) => d.id === r.referring_doctor_id),
    }));
  }

  getDoctorReferralById(id: string): DoctorReferral | null {
    const ref = (this.data.doctor_referrals || []).find((r) => r.id === id);
    if (!ref) return null;
    return {
      ...ref,
      patient: this.data.patients.find((p) => p.id === ref.patient_id),
      referring_doctor: this.data.doctors.find((d) => d.id === ref.referring_doctor_id),
    };
  }

  createDoctorReferral(
    data: Partial<DoctorReferral>,
    user?: { id: string; email: string; role: 'PATIENT' | 'DOCTOR' | 'ADMIN' }
  ): DoctorReferral {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const newRef: DoctorReferral = {
      id: `ref_${crypto.randomBytes(3).toString('hex')}`,
      referral_number: `REF-2026-${String(randomNum)}`,
      patient_id: data.patient_id || '',
      referring_doctor_id: data.referring_doctor_id || '',
      consultation_id: data.consultation_id,
      receiving_specialty: data.receiving_specialty || 'Internal Medicine',
      receiving_doctor_name: data.receiving_doctor_name,
      receiving_clinic_branch: data.receiving_clinic_branch || 'MediQueue Main Flagship Center',
      priority: data.priority || 'Routine',
      reason_for_referral: data.reason_for_referral || '',
      clinical_summary: data.clinical_summary || '',
      relevant_vitals: data.relevant_vitals,
      attached_medications: data.attached_medications,
      attached_lab_results: data.attached_lab_results,
      status: 'pending',
      valid_until: data.valid_until || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };

    if (!this.data.doctor_referrals) {
      this.data.doctor_referrals = [];
    }
    this.data.doctor_referrals.unshift(newRef);
    this.saveDatabase();

    if (user) {
      this.logAudit({
        user_id: user.id,
        user_email: user.email,
        user_role: user.role,
        action: 'Created Specialist Referral Letter',
        module: 'Clinical',
        record_id: newRef.id,
        details: `Referred patient ${newRef.patient_id} to ${newRef.receiving_specialty} (${newRef.priority} priority). Ref #${newRef.referral_number}`,
      });
    }

    return {
      ...newRef,
      patient: this.data.patients.find((p) => p.id === newRef.patient_id),
      referring_doctor: this.data.doctors.find((d) => d.id === newRef.referring_doctor_id),
    };
  }

  updateDoctorReferralStatus(
    id: string,
    status: 'pending' | 'accepted' | 'completed' | 'cancelled',
    user?: { id: string; email: string; role: 'PATIENT' | 'DOCTOR' | 'ADMIN' }
  ): DoctorReferral | null {
    const ref = (this.data.doctor_referrals || []).find((r) => r.id === id);
    if (!ref) return null;
    ref.status = status;
    this.saveDatabase();

    if (user) {
      this.logAudit({
        user_id: user.id,
        user_email: user.email,
        user_role: user.role,
        action: `Updated Referral Status to ${status.toUpperCase()}`,
        module: 'Clinical',
        record_id: ref.id,
        details: `Specialist referral #${ref.referral_number} status changed to ${status}`,
      });
    }

    return {
      ...ref,
      patient: this.data.patients.find((p) => p.id === ref.patient_id),
      referring_doctor: this.data.doctors.find((d) => d.id === ref.referring_doctor_id),
    };
  }
}

export const db = new DatabaseStore();
