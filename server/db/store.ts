import crypto from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '../lib/firebase-admin';
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

class FirestoreStore {
  private db = adminDb;

  // Helper to convert Firestore timestamp to ISO string
  private fromFirestore(data: any) {
    if (!data) return data;
    const result = { ...data };
    for (const key in result) {
      if (result[key] instanceof Timestamp) {
        result[key] = result[key].toDate().toISOString();
      }
    }
    return result;
  }

  // ==========================================
  // AUDIT LOGGING
  // ==========================================
  public async logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const id = `aud_${crypto.randomUUID().slice(0, 8)}`;
    const newLog: AuditLog = {
      id,
      timestamp: new Date().toISOString(),
      ...log,
    };
    await this.db.collection('audit_logs').doc(id).set(newLog);
    return newLog;
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  public async sendNotification(
    userId: string,
    title: string,
    message: string,
    type: 'appointment' | 'queue' | 'consultation' | 'system'
  ): Promise<Notification> {
    const id = `notif_${crypto.randomUUID().slice(0, 8)}`;
    const notif: Notification = {
      id,
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    await this.db.collection('notifications').doc(id).set(notif);
    return notif;
  }

  public async getNotifications(userId: string): Promise<Notification[]> {
    const snapshot = await this.db.collection('notifications')
      .where('user_id', '==', userId)
      .orderBy('created_at', 'desc')
      .get();
    return snapshot.docs.map(doc => this.fromFirestore(doc.data()) as Notification);
  }

  public async markNotificationRead(id: string, userId: string): Promise<boolean> {
    const docRef = this.db.collection('notifications').doc(id);
    const doc = await docRef.get();
    if (doc.exists && doc.data()?.user_id === userId) {
      await docRef.update({ is_read: true });
      return true;
    }
    return false;
  }

  // ==========================================
  // USERS
  // ==========================================
  public async findUserByEmail(email: string): Promise<(User & { password_hash: string; salt: string }) | undefined> {
    const snapshot = await this.db.collection('users')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();
    if (snapshot.empty) return undefined;
    return this.fromFirestore(snapshot.docs[0].data()) as (User & { password_hash: string; salt: string });
  }

  public async findUserById(id: string): Promise<User | undefined> {
    const doc = await this.db.collection('users').doc(id).get();
    if (!doc.exists) return undefined;
    return this.fromFirestore(doc.data()) as User;
  }

  public async getUsers(): Promise<User[]> {
    const snapshot = await this.db.collection('users').get();
    return snapshot.docs.map(doc => this.fromFirestore(doc.data()) as User);
  }

  public async createUser(userData: {
    email: string;
    role: User['role'];
    password_hash: string;
    salt: string;
  }) {
    const id = `usr_${crypto.randomUUID().slice(0, 8)}`;
    const newUser = {
      id,
      email: userData.email.toLowerCase(),
      role: userData.role,
      is_active: true,
      password_hash: userData.password_hash,
      salt: userData.salt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await this.db.collection('users').doc(id).set(newUser);
    return newUser;
  }

  // ==========================================
  // PATIENTS
  // ==========================================
  public async getPatients(search?: string, status?: string): Promise<Patient[]> {
    let query: any = this.db.collection('patients');
    
    if (status === 'active') {
      query = query.where('is_active', '==', true);
    } else if (status === 'inactive') {
      query = query.where('is_active', '==', false);
    }

    const snapshot = await query.get();
    let result = snapshot.docs.map((doc: any) => this.fromFirestore(doc.data()) as Patient);

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

  public async getPatientById(id: string): Promise<Patient | undefined> {
    const doc = await this.db.collection('patients').doc(id).get();
    if (!doc.exists) return undefined;
    return this.fromFirestore(doc.data()) as Patient;
  }

  public async getPatientByUserId(userId: string): Promise<Patient | undefined> {
    const snapshot = await this.db.collection('patients')
      .where('user_id', '==', userId)
      .limit(1)
      .get();
    if (snapshot.empty) return undefined;
    return this.fromFirestore(snapshot.docs[0].data()) as Patient;
  }

  public async createPatient(patientData: Omit<Patient, 'id' | 'patient_number' | 'created_at' | 'updated_at'>): Promise<Patient> {
    const snapshot = await this.db.collection('patients').count().get();
    const count = snapshot.data().count + 1;
    const patientNumber = `PAT-2026-${String(count).padStart(3, '0')}`;
    const id = `pat_${crypto.randomUUID().slice(0, 8)}`;
    
    const newPatient: Patient = {
      id,
      patient_number: patientNumber,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...patientData,
    };
    await this.db.collection('patients').doc(id).set(newPatient);
    return newPatient;
  }

  // ==========================================
  // DOCTORS
  // ==========================================
  public async getDoctors(filters?: { specializationId?: string; status?: string; search?: string }): Promise<Doctor[]> {
    let query: any = this.db.collection('doctors');
    
    if (filters?.specializationId) {
      query = query.where('specialization_id', '==', filters.specializationId);
    }
    if (filters?.status) {
      query = query.where('status', '==', filters.status);
    }

    const snapshot = await query.get();
    let result = snapshot.docs.map((doc: any) => this.fromFirestore(doc.data()) as Doctor);

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

  public async getDoctorById(id: string): Promise<Doctor | undefined> {
    const doc = await this.db.collection('doctors').doc(id).get();
    if (!doc.exists) return undefined;
    return this.fromFirestore(doc.data()) as Doctor;
  }

  public async getDoctorByUserId(userId: string): Promise<Doctor | undefined> {
    const snapshot = await this.db.collection('doctors')
      .where('user_id', '==', userId)
      .limit(1)
      .get();
    if (snapshot.empty) return undefined;
    return this.fromFirestore(snapshot.docs[0].data()) as Doctor;
  }

  // ==========================================
  // APPOINTMENTS
  // ==========================================
  public async getAppointments(filters?: {
    patientId?: string;
    doctorId?: string;
    date?: string;
    status?: string;
    search?: string;
  }): Promise<Appointment[]> {
    let query: any = this.db.collection('appointments');

    if (filters?.patientId) {
      query = query.where('patient_id', '==', filters.patientId);
    }
    if (filters?.doctorId) {
      query = query.where('doctor_id', '==', filters.doctorId);
    }
    if (filters?.date) {
      query = query.where('appointment_date', '==', filters.date);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.where('status', '==', filters.status);
    }

    const snapshot = await query.get();
    let list = snapshot.docs.map((doc: any) => this.fromFirestore(doc.data()) as Appointment);

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      // Since we need to join for search, we'll filter in memory or do more complex queries
      // For now, simple in-memory filtering for search
      list = list.filter(a => a.appointment_reference.toLowerCase().includes(q));
    }

    // Sort by date and time
    list.sort((a, b) => {
      const diff = new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime();
      return diff !== 0 ? diff : a.time_slot.localeCompare(b.time_slot);
    });

    return list;
  }

  public async getAppointmentById(id: string): Promise<Appointment | undefined> {
    const doc = await this.db.collection('appointments').doc(id).get();
    if (doc.exists) return this.fromFirestore(doc.data()) as Appointment;
    
    // Also check by reference
    const snapshot = await this.db.collection('appointments')
      .where('appointment_reference', '==', id)
      .limit(1)
      .get();
    if (!snapshot.empty) return this.fromFirestore(snapshot.docs[0].data()) as Appointment;
    
    return undefined;
  }

  public async cancelAppointment(
    id: string,
    reason: string,
    cancelledBy: { id: string; email: string; role: 'PATIENT' | 'DOCTOR' | 'ADMIN' }
  ): Promise<{ success: boolean; error?: string }> {
    const appointment = await this.getAppointmentById(id);
    if (!appointment) return { success: false, error: 'Appointment not found.' };

    if (appointment.status === 'completed') {
      return { success: false, error: 'Completed appointments cannot be cancelled.' };
    }
    if (appointment.status === 'cancelled') {
      return { success: false, error: 'This appointment is already cancelled.' };
    }

    await this.db.collection('appointments').doc(appointment.id).update({
      status: 'cancelled',
      cancellation_reason: reason || 'Cancelled by ' + cancelledBy.role,
      cancelled_by: cancelledBy.email,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await this.logAudit({
      user_id: cancelledBy.id,
      user_email: cancelledBy.email,
      user_role: cancelledBy.role,
      action: 'Cancelled Appointment',
      module: 'Appointments',
      record_id: appointment.id,
      details: `Cancelled appointment ${appointment.appointment_reference}.`,
    });

    return { success: true };
  }

  public async updateAppointmentStatus(
    id: string,
    status: AppointmentStatus,
    user: { id: string; email: string; role: 'PATIENT' | 'DOCTOR' | 'ADMIN' }
  ): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
    const apt = await this.getAppointmentById(id);
    if (!apt) return { success: false, error: 'Appointment not found' };

    await this.db.collection('appointments').doc(apt.id).update({
      status,
      updated_at: new Date().toISOString(),
    });

    await this.logAudit({
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      action: 'Updated Appointment Status',
      module: 'Appointments',
      record_id: apt.id,
      details: `Changed appointment ${apt.appointment_reference} status to ${status}.`,
    });

    return { success: true, appointment: await this.getAppointmentById(id) };
  }

  public async createAppointment(data: any): Promise<{ appointment?: Appointment; error?: string }> {
    const id = `apt_${crypto.randomUUID().slice(0, 8)}`;
    const snapshot = await this.db.collection('appointments').count().get();
    const count = snapshot.data().count + 101;
    const ref = `APT-2026-${String(count).padStart(6, '0')}`;

    const newAppointment: Appointment = {
      id,
      appointment_reference: ref,
      status: 'confirmed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...data,
    };

    await this.db.collection('appointments').doc(id).set(newAppointment);
    return { appointment: newAppointment };
  }

  // ==========================================
  // QUEUE SYSTEM
  // ==========================================
  public async getTodayQueue(filters?: { doctorId?: string; status?: string }): Promise<QueueItem[]> {
    const today = new Date().toISOString().split('T')[0];
    let query: any = this.db.collection('queue').where('queue_date', '==', today);

    if (filters?.doctorId) {
      query = query.where('doctor_id', '==', filters.doctorId);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.where('status', '==', filters.status);
    }

    const snapshot = await query.get();
    let list = snapshot.docs.map((doc: any) => this.fromFirestore(doc.data()) as QueueItem);

    const orderMap: Record<QueueStatus, number> = {
      in_consultation: 1,
      called: 2,
      waiting: 3,
      skipped: 4,
      completed: 5,
      no_show: 6,
    };

    list.sort((a, b) => {
      const diff = orderMap[a.status] - orderMap[b.status];
      if (diff !== 0) return diff;
      return a.queue_number.localeCompare(b.queue_number);
    });

    return list;
  }

  public async getPatientQueueStatus(patientId: string): Promise<{
    hasTicket: boolean;
    ticket?: QueueItem;
    position?: number;
    estimatedWaitTime?: number;
    doctorName?: string;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const snapshot = await this.db.collection('queue')
      .where('patient_id', '==', patientId)
      .where('queue_date', '==', today)
      .where('status', 'in', ['waiting', 'called', 'in_consultation'])
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { hasTicket: false };
    }

    const ticket = this.fromFirestore(snapshot.docs[0].data()) as QueueItem;
    
    // Get position for that specific doctor
    const doctorSnapshot = await this.db.collection('queue')
      .where('doctor_id', '==', ticket.doctor_id)
      .where('queue_date', '==', today)
      .where('status', '==', 'waiting')
      .orderBy('queue_number', 'asc')
      .get();

    const waitingItems = doctorSnapshot.docs.map(doc => doc.data() as QueueItem);
    const position = waitingItems.findIndex(i => i.id === ticket.id) + 1;
    
    const doctor = await this.getDoctorById(ticket.doctor_id);
    const doctorName = doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : 'Unknown Doctor';

    return {
      hasTicket: true,
      ticket,
      position: position > 0 ? position : 0,
      estimatedWaitTime: (position > 0 ? position : 0) * 15, // 15 mins per patient rough estimate
      doctorName,
    };
  }

  public async checkInPatient(data: {
    appointment_id?: string;
    patient_id: string;
    doctor_id: string;
    checkedInBy: { id: string; email: string; role: any };
  }): Promise<{ success: boolean; queueItem?: QueueItem; error?: string }> {
    const today = new Date().toISOString().split('T')[0];

    // Check if already checked in today for this doctor
    const existing = await this.db.collection('queue')
      .where('patient_id', '==', data.patient_id)
      .where('doctor_id', '==', data.doctor_id)
      .where('queue_date', '==', today)
      .where('status', 'not-in', ['completed', 'cancelled', 'no_show'])
      .get();

    if (!existing.empty) {
      return { success: false, error: 'Patient is already in the queue for this doctor today.' };
    }

    // Get next queue number for this doctor
    const doctorQueue = await this.db.collection('queue')
      .where('doctor_id', '==', data.doctor_id)
      .where('queue_date', '==', today)
      .get();
    
    const nextNum = doctorQueue.size + 1;
    const doctor = await this.getDoctorById(data.doctor_id);
    const prefix = doctor?.doctor_code || 'DOC';
    const queueNumber = `${prefix}-${String(nextNum).padStart(3, '0')}`;

    const id = `q_${crypto.randomUUID().slice(0, 8)}`;
    const newQueueItem: QueueItem = {
      id,
      patient_id: data.patient_id,
      doctor_id: data.doctor_id,
      appointment_id: data.appointment_id || undefined,
      queue_number: queueNumber,
      queue_date: today,
      check_in_time: new Date().toISOString(),
      status: 'waiting',
      priority: 'regular', // Default
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await this.db.collection('queue').doc(id).set(newQueueItem);

    await this.logAudit({
      user_id: data.checkedInBy.id,
      user_email: data.checkedInBy.email,
      user_role: data.checkedInBy.role,
      action: 'Check-in Patient',
      module: 'Queue',
      record_id: id,
      details: `Checked in patient to queue with ticket ${queueNumber}.`,
    });

    return { success: true, queueItem: newQueueItem };
  }

  public async callNext(doctorId: string, user: { id: string; email: string; role: any }): Promise<{ success: boolean; queueItem?: QueueItem; error?: string }> {
    const today = new Date().toISOString().split('T')[0];
    
    // Find first waiting patient
    const waiting = await this.db.collection('queue')
      .where('doctor_id', '==', doctorId)
      .where('queue_date', '==', today)
      .where('status', '==', 'waiting')
      .orderBy('queue_number', 'asc')
      .limit(1)
      .get();

    if (waiting.empty) {
      return { success: false, error: 'No patients waiting in queue.' };
    }

    const item = this.fromFirestore(waiting.docs[0].data()) as QueueItem;
    await this.db.collection('queue').doc(item.id).update({
      status: 'called',
      called_time: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await this.logAudit({
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      action: 'Called Patient',
      module: 'Queue',
      record_id: item.id,
      details: `Called patient with ticket ${item.queue_number}.`,
    });

    return { success: true, queueItem: await this.getQueueItemById(item.id) };
  }

  public async getQueueItemById(id: string): Promise<QueueItem | undefined> {
    const doc = await this.db.collection('queue').doc(id).get();
    if (!doc.exists) return undefined;
    return this.fromFirestore(doc.data()) as QueueItem;
  }

  public async recallPatient(id: string, user: { id: string; email: string; role: any }): Promise<{ success: boolean; queueItem?: QueueItem; error?: string }> {
    const item = await this.getQueueItemById(id);
    if (!item) return { success: false, error: 'Queue item not found.' };

    await this.db.collection('queue').doc(id).update({
      status: 'called',
      called_time: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await this.logAudit({
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      action: 'Recalled Patient',
      module: 'Queue',
      record_id: id,
      details: `Recalled patient with ticket ${item.queue_number}.`,
    });

    return { success: true, queueItem: await this.getQueueItemById(id) };
  }

  public async skipPatient(id: string, user: { id: string; email: string; role: any }): Promise<{ success: boolean; queueItem?: QueueItem; error?: string }> {
    const item = await this.getQueueItemById(id);
    if (!item) return { success: false, error: 'Queue item not found.' };

    await this.db.collection('queue').doc(id).update({
      status: 'skipped',
      updated_at: new Date().toISOString(),
    });

    await this.logAudit({
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      action: 'Skipped Patient',
      module: 'Queue',
      record_id: id,
      details: `Skipped patient with ticket ${item.queue_number}.`,
    });

    return { success: true, queueItem: await this.getQueueItemById(id) };
  }

  public async startConsultation(id: string, user: { id: string; email: string; role: any }): Promise<{ success: boolean; queueItem?: QueueItem; error?: string }> {
    const item = await this.getQueueItemById(id);
    if (!item) return { success: false, error: 'Queue item not found.' };

    await this.db.collection('queue').doc(id).update({
      status: 'in_consultation',
      updated_at: new Date().toISOString(),
    });

    await this.logAudit({
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      action: 'Started Consultation',
      module: 'Queue',
      record_id: id,
      details: `Started consultation for ticket ${item.queue_number}.`,
    });

    return { success: true, queueItem: await this.getQueueItemById(id) };
  }

  public async completeConsultation(
    queueId: string,
    consultationData: any,
    user: { id: string; email: string; role: any }
  ): Promise<{ success: boolean; consultation?: Consultation; error?: string }> {
    const queueItem = await this.getQueueItemById(queueId);
    if (!queueItem) return { success: false, error: 'Queue item not found.' };

    const consultationId = `cons_${crypto.randomUUID().slice(0, 8)}`;
    const newConsultation: Consultation = {
      id: consultationId,
      appointment_id: queueItem.appointment_id || '',
      patient_id: queueItem.patient_id,
      doctor_id: queueItem.doctor_id,
      consultation_date: new Date().toISOString().split('T')[0],
      ...consultationData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await this.db.collection('consultations').doc(consultationId).set(newConsultation);
    
    await this.db.collection('queue').doc(queueId).update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    });

    // Update appointment status if exists
    if (queueItem.appointment_id) {
      await this.db.collection('appointments').doc(queueItem.appointment_id).update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      });
    }

    await this.logAudit({
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      action: 'Completed Consultation',
      module: 'Consultations',
      record_id: consultationId,
      details: `Completed consultation for patient ${queueItem.patient_id}.`,
    });

    return { success: true, consultation: newConsultation };
  }

  public async getConsultations(filters?: { patientId?: string; doctorId?: string; date?: string }): Promise<Consultation[]> {
    let query: any = this.db.collection('consultations');
    if (filters?.patientId) query = query.where('patient_id', '==', filters.patientId);
    if (filters?.doctorId) query = query.where('doctor_id', '==', filters.doctorId);
    if (filters?.date) query = query.where('consultation_date', '==', filters.date);
    const snapshot = await query.get();
    return snapshot.docs.map((doc: any) => this.fromFirestore(doc.data()) as Consultation);
  }

  public async getConsultationById(id: string): Promise<Consultation | undefined> {
    const doc = await this.db.collection('consultations').doc(id).get();
    if (!doc.exists) return undefined;
    return this.fromFirestore(doc.data()) as Consultation;
  }

  public async updatePatient(id: string, data: Partial<Patient>): Promise<Patient | undefined> {
    await this.db.collection('patients').doc(id).update({
      ...data,
      updated_at: new Date().toISOString(),
    });
    return this.getPatientById(id);
  }

  public async togglePatientStatus(id: string): Promise<Patient | undefined> {
    const p = await this.getPatientById(id);
    if (!p) return undefined;
    return this.updatePatient(id, { is_active: !p.is_active });
  }

  public async getSpecializations(): Promise<Specialization[]> {
    const snapshot = await this.db.collection('specializations').get();
    return snapshot.docs.map((doc: any) => this.fromFirestore(doc.data()) as Specialization);
  }

  public async createDoctor(data: any): Promise<Doctor> {
    const id = `doc_${crypto.randomUUID().slice(0, 8)}`;
    const snapshot = await this.db.collection('doctors').count().get();
    const count = snapshot.data().count + 1;
    const doctorCode = `DOC-2026-${String(count).padStart(3, '0')}`;
    
    const newDoctor: Doctor = {
      id,
      doctor_code: doctorCode,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...data,
    };
    await this.db.collection('doctors').doc(id).set(newDoctor);
    return newDoctor;
  }

  public async updateDoctor(id: string, data: Partial<Doctor>): Promise<Doctor | undefined> {
    await this.db.collection('doctors').doc(id).update({
      ...data,
      updated_at: new Date().toISOString(),
    });
    return this.getDoctorById(id);
  }

  public async getDoctorSchedules(doctorId: string): Promise<DoctorSchedule[]> {
    const snapshot = await this.db.collection('doctor_schedules')
      .where('doctor_id', '==', doctorId)
      .get();
    return snapshot.docs.map((doc: any) => this.fromFirestore(doc.data()) as DoctorSchedule);
  }

  public async getAllDoctorSchedules(): Promise<DoctorSchedule[]> {
    const snapshot = await this.db.collection('doctor_schedules').get();
    return snapshot.docs.map((doc: any) => this.fromFirestore(doc.data()) as DoctorSchedule);
  }

  public async createDoctorSchedule(data: any): Promise<DoctorSchedule> {
    const id = `sch_${crypto.randomUUID().slice(0, 8)}`;
    const newSchedule: DoctorSchedule = {
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...data,
    };
    await this.db.collection('doctor_schedules').doc(id).set(newSchedule);
    return newSchedule;
  }

  public async updateDoctorSchedule(id: string, data: Partial<DoctorSchedule>): Promise<DoctorSchedule | undefined> {
    await this.db.collection('doctor_schedules').doc(id).update({
      ...data,
      updated_at: new Date().toISOString(),
    });
    const doc = await this.db.collection('doctor_schedules').doc(id).get();
    return this.fromFirestore(doc.data()) as DoctorSchedule;
  }

  public async deleteDoctorSchedule(id: string): Promise<boolean> {
    await this.db.collection('doctor_schedules').doc(id).delete();
    return true;
  }

  public async getClinicBranches(): Promise<ClinicBranch[]> {
    const snapshot = await this.db.collection('clinic_branches').get();
    return snapshot.docs.map((doc: any) => this.fromFirestore(doc.data()) as ClinicBranch);
  }

  public async saveClinicBranch(data: any): Promise<ClinicBranch> {
    const id = data.id || `br_${crypto.randomUUID().slice(0, 8)}`;
    const newBranch = { ...data, id, updated_at: new Date().toISOString() };
    await this.db.collection('clinic_branches').doc(id).set(newBranch);
    return newBranch;
  }

  public async getAvailableSlots(doctorId: string, date: string): Promise<string[]> {
    // Basic implementation: get schedule for that day of week, then subtract existing appointments
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    const schedules = await this.db.collection('doctor_schedules')
      .where('doctor_id', '==', doctorId)
      .where('day_of_week', '==', dayOfWeek)
      .where('is_active', '==', true)
      .get();
    
    if (schedules.empty) return [];
    const schedule = schedules.docs[0].data() as DoctorSchedule;
    
    // Generate slots from start to end (assuming 30 min slots for simplicity)
    const slots: string[] = [];
    let current = schedule.start_time;
    while (current < schedule.end_time) {
      slots.push(current);
      const [h, m] = current.split(':').map(Number);
      const nextM = m + 30;
      const nextH = h + Math.floor(nextM / 60);
      current = `${String(nextH).padStart(2, '0')}:${String(nextM % 60).padStart(2, '0')}`;
    }

    const appointments = await this.getAppointments({ doctorId, date });
    const bookedSlots = appointments.map(a => a.time_slot);
    
    return slots.filter(s => !bookedSlots.includes(s));
  }

  public async markNoShow(id: string, user: { id: string; email: string; role: any }): Promise<{ success: boolean; queueItem?: QueueItem; error?: string }> {
    const item = await this.getQueueItemById(id);
    if (!item) return { success: false, error: 'Queue item not found.' };

    await this.db.collection('queue').doc(id).update({
      status: 'no_show',
      updated_at: new Date().toISOString(),
    });

    await this.logAudit({
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      action: 'Marked No-Show',
      module: 'Queue',
      record_id: id,
      details: `Marked ticket ${item.queue_number} as no-show.`,
    });

    return { success: true, queueItem: await this.getQueueItemById(id) };
  }

  public async getPatientVitals(patientId: string): Promise<VitalSignRecord[]> {
    const snapshot = await this.db.collection('vital_signs')
      .where('patient_id', '==', patientId)
      .orderBy('timestamp', 'desc')
      .get();
    return snapshot.docs.map(doc => this.fromFirestore(doc.data()) as VitalSignRecord);
  }

  public async addVitalSign(data: any): Promise<VitalSignRecord> {
    const id = `vit_${crypto.randomUUID().slice(0, 8)}`;
    const newRecord: VitalSignRecord = {
      id,
      timestamp: new Date().toISOString(),
      ...data,
    };
    await this.db.collection('vital_signs').doc(id).set(newRecord);
    return newRecord;
  }

  public async getLabOrders(filters?: { patientId?: string; status?: string; doctorId?: string }): Promise<LabOrder[]> {
    let query: any = this.db.collection('lab_orders');
    if (filters?.patientId) query = query.where('patient_id', '==', filters.patientId);
    if (filters?.doctorId) query = query.where('doctor_id', '==', filters.doctorId);
    if (filters?.status) query = query.where('status', '==', filters.status);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => this.fromFirestore(doc.data()) as LabOrder);
  }

  public async createLabOrder(data: any): Promise<LabOrder> {
    const id = `lab_${crypto.randomUUID().slice(0, 8)}`;
    const newOrder: LabOrder = {
      id,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...data,
    };
    await this.db.collection('lab_orders').doc(id).set(newOrder);
    return newOrder;
  }

  public async updateLabOrderStatus(id: string, status: LabOrder['status']): Promise<boolean> {
    await this.db.collection('lab_orders').doc(id).update({
      status,
      updated_at: new Date().toISOString(),
    });
    return true;
  }

  public async getDoctorWorkStatuses(): Promise<DoctorWorkStatus[]> {
    const snapshot = await this.db.collection('doctor_work_statuses').get();
    return snapshot.docs.map(doc => this.fromFirestore(doc.data()) as DoctorWorkStatus);
  }

  public async updateDoctorWorkStatus(doctorId: string, status: DoctorWorkStatus['status']): Promise<boolean> {
    await this.db.collection('doctor_work_statuses').doc(doctorId).set({
      doctor_id: doctorId,
      status,
      last_update: new Date().toISOString(),
    }, { merge: true });
    return true;
  }

  public async getTriage(patientId: string, date?: string): Promise<PreConsultationTriage[]> {
    let query: any = this.db.collection('triage').where('patient_id', '==', patientId);
    if (date) query = query.where('created_at', '>=', date);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => this.fromFirestore(doc.data()) as PreConsultationTriage);
  }

  public async saveTriage(data: any): Promise<PreConsultationTriage> {
    const id = `tr_${crypto.randomUUID().slice(0, 8)}`;
    const newTriage = { id, created_at: new Date().toISOString(), ...data };
    await this.db.collection('triage').doc(id).set(newTriage);
    return newTriage;
  }

  public async getMedicalCertificates(patientId?: string): Promise<MedicalCertificate[]> {
    let query: any = this.db.collection('medical_certificates');
    if (patientId) query = query.where('patient_id', '==', patientId);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => this.fromFirestore(doc.data()) as MedicalCertificate);
  }

  public async verifyMedicalCertificate(certNumber: string): Promise<MedicalCertificate | undefined> {
    const snapshot = await this.db.collection('medical_certificates')
      .where('certificate_number', '==', certNumber)
      .limit(1)
      .get();
    if (snapshot.empty) return undefined;
    return this.fromFirestore(snapshot.docs[0].data()) as MedicalCertificate;
  }

  public async getMedicalCertificateById(id: string): Promise<MedicalCertificate | undefined> {
    const doc = await this.db.collection('medical_certificates').doc(id).get();
    if (!doc.exists) return undefined;
    return this.fromFirestore(doc.data()) as MedicalCertificate;
  }

  public async createMedicalCertificate(data: any): Promise<MedicalCertificate> {
    const id = `mc_${crypto.randomUUID().slice(0, 8)}`;
    const newCert = { id, created_at: new Date().toISOString(), ...data };
    await this.db.collection('medical_certificates').doc(id).set(newCert);
    return newCert;
  }

  public async getDoctorReferrals(doctorId?: string, patientId?: string): Promise<DoctorReferral[]> {
    let query: any = this.db.collection('doctor_referrals');
    if (doctorId) query = query.where('doctor_id', '==', doctorId);
    if (patientId) query = query.where('patient_id', '==', patientId);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => this.fromFirestore(doc.data()) as DoctorReferral);
  }

  public async getDoctorReferralById(id: string): Promise<DoctorReferral | undefined> {
    const doc = await this.db.collection('doctor_referrals').doc(id).get();
    if (!doc.exists) return undefined;
    return this.fromFirestore(doc.data()) as DoctorReferral;
  }

  public async createDoctorReferral(data: any): Promise<DoctorReferral> {
    const id = `ref_${crypto.randomUUID().slice(0, 8)}`;
    const newRef = { id, created_at: new Date().toISOString(), ...data };
    await this.db.collection('doctor_referrals').doc(id).set(newRef);
    return newRef;
  }

  public async updateDoctorReferralStatus(id: string, status: DoctorReferral['status']): Promise<boolean> {
    await this.db.collection('doctor_referrals').doc(id).update({ status });
    return true;
  }

  public async getLabResults(patientId?: string): Promise<LabTestResult[]> {
    let query: any = this.db.collection('lab_results');
    if (patientId) query = query.where('patient_id', '==', patientId);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => this.fromFirestore(doc.data()) as LabTestResult);
  }

  public async getLabResultById(id: string): Promise<LabTestResult | undefined> {
    const doc = await this.db.collection('lab_results').doc(id).get();
    if (!doc.exists) return undefined;
    return this.fromFirestore(doc.data()) as LabTestResult;
  }

  public async saveLabResult(data: any): Promise<LabTestResult> {
    const id = `lr_${crypto.randomUUID().slice(0, 8)}`;
    const newResult = { id, created_at: new Date().toISOString(), ...data };
    await this.db.collection('lab_results').doc(id).set(newResult);
    return newResult;
  }

  public async getPharmacyItems(category?: string): Promise<PharmacyItem[]> {
    let query: any = this.db.collection('pharmacy_items');
    if (category) query = query.where('category', '==', category);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => this.fromFirestore(doc.data()) as PharmacyItem);
  }

  public async addPharmacyItem(data: any): Promise<PharmacyItem> {
    const id = `phi_${crypto.randomUUID().slice(0, 8)}`;
    const newItem = { id, created_at: new Date().toISOString(), ...data };
    await this.db.collection('pharmacy_items').doc(id).set(newItem);
    return newItem;
  }

  public async updatePharmacyStock(id: string, change: number): Promise<boolean> {
    const docRef = this.db.collection('pharmacy_items').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return false;
    const current = doc.data()?.stock_quantity || 0;
    await docRef.update({ stock_quantity: current + change });
    return true;
  }

  public async getDispenseRecords(status?: string): Promise<PrescriptionDispense[]> {
    let query: any = this.db.collection('dispense_records');
    if (status) query = query.where('status', '==', status);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => this.fromFirestore(doc.data()) as PrescriptionDispense);
  }

  public async createDispenseRecord(data: any): Promise<PrescriptionDispense> {
    const id = `dis_${crypto.randomUUID().slice(0, 8)}`;
    const newRecord = { id, created_at: new Date().toISOString(), ...data };
    await this.db.collection('dispense_records').doc(id).set(newRecord);
    return newRecord;
  }

  public async updateDispenseStatus(id: string, status: PrescriptionDispense['status']): Promise<boolean> {
    await this.db.collection('dispense_records').doc(id).update({ status });
    return true;
  }

  public async getSmsLogs(patientId?: string): Promise<SmsLog[]> {
    let query: any = this.db.collection('sms_logs');
    if (patientId) query = query.where('patient_id', '==', patientId);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => this.fromFirestore(doc.data()) as SmsLog);
  }

  public async sendSms(patientId: string, message: string): Promise<boolean> {
    const patient = await this.getPatientById(patientId);
    const id = `sms_${crypto.randomUUID().slice(0, 8)}`;
    const log: SmsLog = {
      id,
      patient_id: patientId,
      recipient_phone: patient?.contact_number || 'Unknown',
      recipient_name: patient ? `${patient.first_name} ${patient.last_name}` : 'Patient',
      message,
      type: 'general',
      sent_at: new Date().toISOString(),
      status: 'sent',
    };
    await this.db.collection('sms_logs').doc(id).set(log);
    return true;
  }

  public async getTelemedSessions(filters?: { patientId?: string; doctorId?: string }): Promise<TelemedSession[]> {
    let query: any = this.db.collection('telemed_sessions');
    if (filters?.patientId) query = query.where('patient_id', '==', filters.patientId);
    if (filters?.doctorId) query = query.where('doctor_id', '==', filters.doctorId);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => this.fromFirestore(doc.data()) as TelemedSession);
  }

  public async createTelemedSession(data: any): Promise<TelemedSession> {
    const id = `tel_${crypto.randomUUID().slice(0, 8)}`;
    const newSession = { id, created_at: new Date().toISOString(), ...data };
    await this.db.collection('telemed_sessions').doc(id).set(newSession);
    return newSession;
  }

  public async updateTelemedSession(id: string, data: Partial<TelemedSession>): Promise<boolean> {
    await this.db.collection('telemed_sessions').doc(id).update(data);
    return true;
  }

  public async getDailyAppointmentReport(date: string) {
    const appointments = await this.getAppointments({ date });
    return {
      date,
      total: appointments.length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
      completed: appointments.filter(a => a.status === 'completed').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length,
    };
  }

  public async getDailyQueueReport(date: string) {
    const snapshot = await this.db.collection('queue').where('queue_date', '==', date).get();
    const items = snapshot.docs.map(doc => doc.data() as QueueItem);
    return {
      date,
      total: items.length,
      completed: items.filter(i => i.status === 'completed').length,
      no_show: items.filter(i => i.status === 'no_show').length,
    };
  }

  public async getDoctorPerformanceReport() {
    const doctors = await this.getDoctors();
    const result = [];
    for (const d of doctors) {
      const appointments = await this.getAppointments({ doctorId: d.id });
      result.push({
        doctor_id: d.id,
        doctor_name: `${d.first_name} ${d.last_name}`,
        total_appointments: appointments.length,
        completed: appointments.filter(a => a.status === 'completed').length,
      });
    }
    return result;
  }

  public async getAppointmentStatistics() {
    const appointments = await this.getAppointments();
    return {
      total: appointments.length,
      status_breakdown: {
        confirmed: appointments.filter(a => a.status === 'confirmed').length,
        completed: appointments.filter(a => a.status === 'completed').length,
        cancelled: appointments.filter(a => a.status === 'cancelled').length,
      }
    };
  }

  public async getPublicDisplayData() {
    const queue = await this.getTodayQueue();
    return {
      now_calling: queue.filter(i => i.status === 'called' || i.status === 'in_consultation'),
      waiting_count: queue.filter(i => i.status === 'waiting').length,
    };
  }

  public async markAllNotificationsRead(userId: string): Promise<boolean> {
    const snapshot = await this.db.collection('notifications')
      .where('user_id', '==', userId)
      .where('is_read', '==', false)
      .get();
    
    const batch = this.db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { is_read: true });
    });
    await batch.commit();
    return true;
  }

  public async rescheduleAppointment(
    id: string,
    newDate: string,
    newSlot: string,
    user: { id: string; email: string; role: 'PATIENT' | 'DOCTOR' | 'ADMIN' }
  ): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
    const apt = await this.getAppointmentById(id);
    if (!apt) return { success: false, error: 'Appointment not found.' };

    await this.db.collection('appointments').doc(apt.id).update({
      appointment_date: newDate,
      time_slot: newSlot,
      status: 'confirmed',
      updated_at: new Date().toISOString(),
    });

    await this.logAudit({
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      action: 'Rescheduled Appointment',
      module: 'Appointments',
      record_id: apt.id,
      details: `Rescheduled ${apt.appointment_reference} to ${newDate} at ${newSlot}.`,
    });

    return { success: true, appointment: await this.getAppointmentById(id) };
  }

  public async getAuditLogs(filters: { module?: string; userRole?: string; search?: string }): Promise<AuditLog[]> {
    let query: any = this.db.collection('audit_logs');
    if (filters.module) query = query.where('module', '==', filters.module);
    if (filters.userRole) query = query.where('user_role', '==', filters.userRole);
    const snapshot = await query.get();
    let logs = snapshot.docs.map(doc => this.fromFirestore(doc.data()) as AuditLog);
    if (filters.search) {
      const search = filters.search.toLowerCase();
      logs = logs.filter(l => l.details.toLowerCase().includes(search) || l.action.toLowerCase().includes(search));
    }
    return logs;
  }

  public async getSettings(): Promise<ClinicSettings> {
    const doc = await this.db.collection('settings').doc('clinic').get();
    if (doc.exists) return this.fromFirestore(doc.data()) as ClinicSettings;
    return {
      id: 'clinic',
      clinic_name: 'MediQueue Clínica',
      tagline: 'Modern Clinical Queue Management',
      contact_number: '+63 912 345 6789',
      email: 'info@mediqueue.ph',
      address: 'Lipa City, Batangas, Philippines',
      operating_days: 'Monday - Saturday',
      opening_time: '08:00 AM',
      closing_time: '05:00 PM',
      daily_queue_prefix: 'Q',
      avg_consultation_time_minutes: 15,
      emergency_contact: '911',
      updated_at: new Date().toISOString(),
    };
  }

  public async updateSettings(data: Partial<ClinicSettings>): Promise<ClinicSettings> {
    const updated = { ...data, updated_at: new Date().toISOString() };
    await this.db.collection('settings').doc('clinic').set(updated, { merge: true });
    return this.getSettings();
  }

  public async getInvoices(filters: { patientId?: string; status?: string }): Promise<BillingInvoice[]> {
    let query: any = this.db.collection('invoices');
    if (filters.patientId) query = query.where('patient_id', '==', filters.patientId);
    if (filters.status) query = query.where('status', '==', filters.status);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => this.fromFirestore(doc.data()) as BillingInvoice);
  }

  public async getInvoiceById(id: string): Promise<BillingInvoice | null> {
    const doc = await this.db.collection('invoices').doc(id).get();
    return doc.exists ? this.fromFirestore(doc.data()) as BillingInvoice : null;
  }

  public async createInvoice(data: any): Promise<BillingInvoice> {
    const id = `inv_${crypto.randomUUID().slice(0, 8)}`;
    const newInvoice = {
      id,
      invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...data
    };
    await this.db.collection('invoices').doc(id).set(newInvoice);
    return newInvoice;
  }

  public async payInvoice(id: string, data: any): Promise<BillingInvoice | null> {
    const inv = await this.getInvoiceById(id);
    if (!inv) return null;
    const updated = {
      ...inv,
      ...data,
      status: 'paid',
      payment_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await this.db.collection('invoices').doc(id).set(updated);
    return updated;
  }

  public async resetToSeed(): Promise<void> {
    const collections = ['users', 'patients', 'doctors', 'doctor_schedules', 'specializations', 'appointments', 'queue', 'consultations', 'audit_logs', 'notifications', 'settings', 'vital_signs', 'lab_orders', 'lab_results', 'invoices', 'pharmacy_items', 'clinic_branches', 'medical_certificates', 'doctor_referrals', 'sessions', 'sms_logs', 'telemed_sessions'];
    for (const col of collections) {
      const snapshot = await this.db.collection(col).get();
      const batch = this.db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
  }

  public async seedDatabase(seed: any): Promise<void> {
    console.log('Seeding Firestore from internal data...');
    
    const collections = [
      { name: 'users', data: seed.users },
      { name: 'patients', data: seed.patients },
      { name: 'doctors', data: seed.doctors },
      { name: 'doctor_schedules', data: seed.doctor_schedules },
      { name: 'specializations', data: seed.specializations },
      { name: 'appointments', data: seed.appointments },
      { name: 'queue', data: seed.queue },
      { name: 'consultations', data: seed.consultations },
      { name: 'audit_logs', data: seed.audit_logs },
      { name: 'notifications', data: seed.notifications },
      { name: 'settings', data: [seed.clinic_settings] },
      { name: 'vital_signs', data: seed.vital_signs },
      { name: 'lab_orders', data: seed.lab_orders },
      { name: 'lab_results', data: seed.lab_results },
      { name: 'invoices', data: seed.billing_invoices },
      { name: 'pharmacy_items', data: seed.pharmacy_items },
      { name: 'clinic_branches', data: seed.clinic_branches },
      { name: 'medical_certificates', data: seed.medical_certificates },
      { name: 'doctor_referrals', data: seed.doctor_referrals },
    ];

    for (const col of collections) {
      if (!col.data || col.data.length === 0) continue;
      
      const chunks = [];
      for (let i = 0; i < col.data.length; i += 500) {
        chunks.push(col.data.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = this.db.batch();
        for (const item of chunk) {
          let docId = (item as any).id || (item as any).email || undefined;
          if (col.name === 'settings') docId = 'clinic';
          const ref = docId ? this.db.collection(col.name).doc(String(docId)) : this.db.collection(col.name).doc();
          batch.set(ref, item);
        }
        await batch.commit();
      }
    }
  }
}

export const db = new FirestoreStore();
