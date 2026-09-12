import {
  User,
  Patient,
  Doctor,
  Specialization,
  DoctorSchedule,
  Appointment,
  AppointmentStatus,
  QueueItem,
  Consultation,
  AuditLog,
  ClinicSettings,
  Notification,
  VitalSignRecord,
  LabOrder,
  LabTestItem,
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
} from '../types/index';

const API_BASE = '/api';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('mmc_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    // Dispatch global event for auth failure
    window.dispatchEvent(new CustomEvent('mmc-auth-failure'));
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'An unexpected error occurred.');
  }
  return data;
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<{ token: string; user: User; patient?: Patient; doctor?: Doctor }>(res);
  },

  async register(data: {
    first_name: string;
    last_name: string;
    email: string;
    contact_number: string;
    date_of_birth: string;
    sex: string;
    address: string;
    password: string;
    confirm_password: string;
  }) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<{ token: string; user: User; patient?: Patient }>(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    return handleResponse<{ user: User; patient?: Patient; doctor?: Doctor }>(res);
  },

  async forgotPassword(email: string) {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse<{ message: string; reset_hint?: string }>(res);
  },

  async resetPassword(data: { email: string; reset_code: string; new_password: string; confirm_password: string }) {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string }>(res);
  },

  async logout() {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: getHeaders(),
    });
  },

  // Doctors & Specializations
  async getSpecializations(): Promise<Specialization[]> {
    const res = await fetch(`${API_BASE}/doctors/specializations`);
    return handleResponse<Specialization[]>(res);
  },

  async getDoctors(filters?: { specializationId?: string; status?: string; search?: string }): Promise<Doctor[]> {
    const params = new URLSearchParams();
    if (filters?.specializationId) params.append('specializationId', filters.specializationId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const res = await fetch(`${API_BASE}/doctors?${params.toString()}`);
    return handleResponse<Doctor[]>(res);
  },

  async getDoctor(id: string): Promise<Doctor> {
    const res = await fetch(`${API_BASE}/doctors/${id}`);
    return handleResponse<Doctor>(res);
  },

  async getDoctorSchedules(doctorId: string): Promise<DoctorSchedule[]> {
    const res = await fetch(`${API_BASE}/doctors/${doctorId}/schedules`);
    return handleResponse<DoctorSchedule[]>(res);
  },

  async getAvailableSlots(doctorId: string, date: string): Promise<{
    availableSlots: {
      time: string;
      formattedTime: string;
      available: boolean;
      bookedCount: number;
      maxCapacity: number;
      scheduleId: string;
    }[];
    message: string | null;
  }> {
    const res = await fetch(`${API_BASE}/doctors/${doctorId}/available-slots?date=${date}`);
    return handleResponse(res);
  },

  async createDoctor(data: Partial<Doctor>): Promise<Doctor> {
    const res = await fetch(`${API_BASE}/doctors`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Doctor>(res);
  },

  async updateDoctor(id: string, data: Partial<Doctor>): Promise<Doctor> {
    const res = await fetch(`${API_BASE}/doctors/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Doctor>(res);
  },

  async toggleDoctorStatus(id: string): Promise<Doctor> {
    const res = await fetch(`${API_BASE}/doctors/${id}/toggle-status`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<Doctor>(res);
  },

  async getAllSchedules(): Promise<DoctorSchedule[]> {
    const res = await fetch(`${API_BASE}/doctors/schedules/all`, {
      headers: getHeaders(),
    });
    return handleResponse<DoctorSchedule[]>(res);
  },

  async createSchedule(data: Partial<DoctorSchedule>): Promise<DoctorSchedule> {
    const res = await fetch(`${API_BASE}/doctors/schedules/create`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<DoctorSchedule>(res);
  },

  async updateSchedule(id: string, data: Partial<DoctorSchedule>): Promise<DoctorSchedule> {
    const res = await fetch(`${API_BASE}/doctors/schedules/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<DoctorSchedule>(res);
  },

  async deleteSchedule(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/doctors/schedules/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Appointments
  async getAppointments(filters?: {
    patientId?: string;
    doctorId?: string;
    date?: string;
    status?: string;
    search?: string;
  }): Promise<Appointment[]> {
    const params = new URLSearchParams();
    if (filters?.patientId) params.append('patientId', filters.patientId);
    if (filters?.doctorId) params.append('doctorId', filters.doctorId);
    if (filters?.date) params.append('date', filters.date);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const res = await fetch(`${API_BASE}/appointments?${params.toString()}`, {
      headers: getHeaders(),
    });
    return handleResponse<Appointment[]>(res);
  },

  async getAppointment(id: string): Promise<Appointment> {
    const res = await fetch(`${API_BASE}/appointments/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse<Appointment>(res);
  },

  async bookAppointment(data: {
    patient_id?: string;
    doctor_id: string;
    appointment_date: string;
    time_slot: string;
    reason_for_consultation: string;
    schedule_id?: string;
  }): Promise<{ message: string; appointment: Appointment }> {
    const res = await fetch(`${API_BASE}/appointments/book`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async cancelAppointment(id: string, reason: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/appointments/${id}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    return handleResponse(res);
  },

  async updateAppointment(id: string, data: Partial<Appointment>): Promise<{ message: string; appointment: Appointment }> {
    if (data.status) {
      return this.updateAppointmentStatus(id, data.status);
    }
    const res = await fetch(`${API_BASE}/appointments/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<{ message: string; appointment: Appointment }> {
    const res = await fetch(`${API_BASE}/appointments/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    return handleResponse(res);
  },

  async rescheduleAppointment(id: string, new_date: string, new_time_slot: string): Promise<{ message: string; appointment: Appointment }> {
    const res = await fetch(`${API_BASE}/appointments/${id}/reschedule`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ new_date, new_time_slot }),
    });
    return handleResponse(res);
  },

  // Queue
  async getTodayQueue(filters?: { doctorId?: string; status?: string }): Promise<QueueItem[]> {
    const params = new URLSearchParams();
    if (filters?.doctorId) params.append('doctorId', filters.doctorId);
    if (filters?.status) params.append('status', filters.status);

    const res = await fetch(`${API_BASE}/queue/today?${params.toString()}`, {
      headers: getHeaders(),
    });
    return handleResponse<QueueItem[]>(res);
  },

  async getPatientQueueStatus(): Promise<{
    hasTicket: boolean;
    ticket?: QueueItem & { doctor?: Doctor };
    nowServing?: string;
    nowServingStatus?: string;
    patientsAhead?: number;
    estimatedWaitTime?: string;
    message?: string;
  }> {
    const res = await fetch(`${API_BASE}/queue/my-status`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async checkIn(data: { appointment_id?: string; patient_id?: string; doctor_id?: string }): Promise<{
    message: string;
    queueItem: QueueItem;
  }> {
    const res = await fetch(`${API_BASE}/queue/check-in`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async callNext(doctorId?: string): Promise<{ message: string; queueItem: QueueItem }> {
    const res = await fetch(`${API_BASE}/queue/call-next`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ doctor_id: doctorId }),
    });
    return handleResponse(res);
  },

  async recallPatient(queueId: string): Promise<{ message: string; queueItem: QueueItem }> {
    const res = await fetch(`${API_BASE}/queue/${queueId}/recall`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async skipPatient(queueId: string): Promise<{ message: string; queueItem: QueueItem }> {
    const res = await fetch(`${API_BASE}/queue/${queueId}/skip`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async startConsultation(queueId: string): Promise<{ message: string; queueItem: QueueItem }> {
    const res = await fetch(`${API_BASE}/queue/${queueId}/start-consultation`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async completeConsultation(
    queueId: string,
    data: {
      chief_complaint: string;
      symptoms: string;
      diagnosis: string;
      clinical_notes: string;
      prescription: string;
      recommendations: string;
      follow_up_date?: string;
      subjective?: string;
      objective?: string;
      assessment?: string;
      plan?: string;
      icd10_code?: string;
      is_locked?: boolean;
    }
  ): Promise<{ message: string; consultation: Consultation }> {
    const res = await fetch(`${API_BASE}/queue/${queueId}/complete`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async markNoShow(queueId: string): Promise<{ message: string; queueItem: QueueItem }> {
    const res = await fetch(`${API_BASE}/queue/${queueId}/no-show`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Consultations
  async getConsultations(patientId?: string, doctorId?: string): Promise<Consultation[]> {
    const params = new URLSearchParams();
    if (patientId) params.append('patientId', patientId);
    if (doctorId) params.append('doctorId', doctorId);

    const res = await fetch(`${API_BASE}/consultations?${params.toString()}`, {
      headers: getHeaders(),
    });
    return handleResponse<Consultation[]>(res);
  },

  async getConsultation(id: string): Promise<Consultation> {
    const res = await fetch(`${API_BASE}/consultations/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse<Consultation>(res);
  },

  // Patients
  async getPatients(search?: string, status?: string): Promise<Patient[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);

    const res = await fetch(`${API_BASE}/patients?${params.toString()}`, {
      headers: getHeaders(),
    });
    return handleResponse<Patient[]>(res);
  },

  async getPatient(id: string): Promise<Patient> {
    const res = await fetch(`${API_BASE}/patients/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse<Patient>(res);
  },

  async getPatientProfile(): Promise<Patient> {
    const res = await fetch(`${API_BASE}/patients/profile`, {
      headers: getHeaders(),
    });
    return handleResponse<Patient>(res);
  },

  async updatePatient(id: string, data: Partial<Patient>): Promise<Patient> {
    const res = await fetch(`${API_BASE}/patients/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Patient>(res);
  },

  async togglePatientStatus(id: string): Promise<Patient> {
    const res = await fetch(`${API_BASE}/patients/${id}/toggle-status`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<Patient>(res);
  },

  async getPatientConsultations(id: string): Promise<Consultation[]> {
    const res = await fetch(`${API_BASE}/patients/${id}/consultations`, {
      headers: getHeaders(),
    });
    return handleResponse<Consultation[]>(res);
  },

  // Reports
  async getDailyAppointmentReport(date?: string) {
    const params = date ? `?date=${date}` : '';
    const res = await fetch(`${API_BASE}/reports/daily-appointments${params}`, {
      headers: getHeaders(),
    });
    return handleResponse<{
      date: string;
      total: number;
      completed: number;
      cancelled: number;
      noShow: number;
      pending: number;
      confirmed: number;
      appointments: Appointment[];
    }>(res);
  },

  async getDailyQueueReport(date?: string) {
    const params = date ? `?date=${date}` : '';
    const res = await fetch(`${API_BASE}/reports/daily-queue${params}`, {
      headers: getHeaders(),
    });
    return handleResponse<{
      date: string;
      total: number;
      completed: number;
      skipped: number;
      noShow: number;
      waiting: number;
      items: QueueItem[];
    }>(res);
  },

  async getDoctorPerformanceReport() {
    const res = await fetch(`${API_BASE}/reports/doctor-performance`, {
      headers: getHeaders(),
    });
    return handleResponse<{
      doctor: Doctor;
      totalAppointments: number;
      completed: number;
      cancelled: number;
      noShow: number;
      completionRate: number;
    }[]>(res);
  },

  async getAppointmentStats() {
    const res = await fetch(`${API_BASE}/reports/appointment-stats`, {
      headers: getHeaders(),
    });
    return handleResponse<{
      total: number;
      completed: number;
      cancelled: number;
      noShow: number;
      pending: number;
      confirmed: number;
      inProgress: number;
    }>(res);
  },

  // Admin & Settings
  async getAuditLogs(filters?: { module?: string; userRole?: string; search?: string }): Promise<AuditLog[]> {
    const params = new URLSearchParams();
    if (filters?.module) params.append('module', filters.module);
    if (filters?.userRole) params.append('userRole', filters.userRole);
    if (filters?.search) params.append('search', filters.search);

    const res = await fetch(`${API_BASE}/admin/audit-logs?${params.toString()}`, {
      headers: getHeaders(),
    });
    return handleResponse<AuditLog[]>(res);
  },

  async getSettings(): Promise<ClinicSettings> {
    const res = await fetch(`${API_BASE}/admin/settings`);
    return handleResponse<ClinicSettings>(res);
  },

  async getClinicSettings(): Promise<any> {
    return this.getSettings();
  },

  async updateSettings(data: Partial<ClinicSettings>): Promise<ClinicSettings> {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<ClinicSettings>(res);
  },

  async updateClinicSettings(data: any): Promise<any> {
    return this.updateSettings(data);
  },

  async resetDemoData(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/admin/reset-demo-data`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async resetSeedData(): Promise<{ message: string }> {
    return this.resetDemoData();
  },

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: getHeaders(),
    });
    return handleResponse<Notification[]>(res);
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // ==========================================
  // VITAL SIGNS
  // ==========================================
  async getPatientVitals(patientId: string): Promise<{ vitals: VitalSignRecord[] }> {
    const res = await fetch(`${API_BASE}/clinical/vitals/${patientId}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async getVitals(patientId: string): Promise<{ vitals: VitalSignRecord[] }> {
    return this.getPatientVitals(patientId);
  },

  async recordVitalSign(data: Omit<VitalSignRecord, 'id' | 'recorded_at'>): Promise<{ vital: VitalSignRecord }> {
    const res = await fetch(`${API_BASE}/clinical/vitals`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // ==========================================
  // LAB ORDERS
  // ==========================================
  async getLabOrders(params?: { patientId?: string; doctorId?: string; status?: string }): Promise<{ orders: LabOrder[] }> {
    const query = new URLSearchParams();
    if (params?.patientId) query.set('patientId', params.patientId);
    if (params?.doctorId) query.set('doctorId', params.doctorId);
    if (params?.status) query.set('status', params.status);

    const res = await fetch(`${API_BASE}/clinical/labs?${query.toString()}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async createLabOrder(data: {
    patient_id: string;
    doctor_id: string;
    consultation_id?: string;
    priority?: 'Routine' | 'Urgent' | 'STAT';
    clinical_indication: string;
    tests: LabTestItem[];
    fasting_required: boolean;
    specimen_notes?: string;
  }): Promise<{ order: LabOrder }> {
    const res = await fetch(`${API_BASE}/clinical/labs`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateLabOrderStatus(
    orderId: string,
    status: LabOrder['status'],
    resultsSummary?: string
  ): Promise<{ order: LabOrder }> {
    const res = await fetch(`${API_BASE}/clinical/labs/${orderId}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, results_summary: resultsSummary }),
    });
    return handleResponse(res);
  },

  // ==========================================
  // BILLING, CASHIER & HMO
  // ==========================================
  async getInvoices(params?: { patientId?: string; status?: string }): Promise<{ invoices: BillingInvoice[] }> {
    const query = new URLSearchParams();
    if (params?.patientId) query.set('patientId', params.patientId);
    if (params?.status) query.set('status', params.status);

    const res = await fetch(`${API_BASE}/billing/invoices?${query.toString()}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async getInvoiceById(id: string): Promise<{ invoice: BillingInvoice }> {
    const res = await fetch(`${API_BASE}/billing/invoices/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async createInvoice(data: any): Promise<{ invoice: BillingInvoice }> {
    const res = await fetch(`${API_BASE}/billing/invoices`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async payInvoice(id: string, paymentData: any): Promise<{ invoice: BillingInvoice }> {
    const res = await fetch(`${API_BASE}/billing/invoices/${id}/pay`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(paymentData),
    });
    return handleResponse(res);
  },

  // ==========================================
  // DOCTOR OPERATIONAL STATUS
  // ==========================================
  async getDoctorWorkStatuses(): Promise<{ statuses: (DoctorWorkStatus & { doctor?: Doctor })[] }> {
    const res = await fetch(`${API_BASE}/clinical/doctor-status`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async updateDoctorWorkStatus(data: {
    doctor_id?: string;
    status: DoctorWorkStatusType;
    status_message?: string;
    break_minutes_remaining?: number;
  }): Promise<{ status: DoctorWorkStatus }> {
    const res = await fetch(`${API_BASE}/clinical/doctor-status`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // ==========================================
  // PRE-CONSULTATION TRIAGE
  // ==========================================
  async getTriage(patientId: string, appointmentId?: string): Promise<{ triage: PreConsultationTriage | null }> {
    const query = appointmentId ? `?appointmentId=${encodeURIComponent(appointmentId)}` : '';
    const res = await fetch(`${API_BASE}/clinical/triage/${patientId}${query}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async saveTriage(data: Omit<PreConsultationTriage, 'id' | 'submitted_at'>): Promise<{ triage: PreConsultationTriage }> {
    const res = await fetch(`${API_BASE}/clinical/triage`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // ==========================================
  // PUBLIC DISPLAY BOARD
  // ==========================================
  async getPublicDisplayData(): Promise<{
    clinic_name: string;
    tagline: string;
    date_formatted: string;
    room_status_list: Array<{
      room_number: string;
      doctor_id: string;
      doctor_name: string;
      specialization: string;
      current_ticket: string | null;
      current_patient_name: string;
      current_status: string;
      doctor_work_status: DoctorWorkStatusType;
      doctor_status_message?: string;
      waiting_count: number;
      next_tickets: string[];
    }>;
    recent_called: Array<{
      queue_number: string;
      room_number: string;
      doctor_name: string;
      patient_name: string;
      time: string;
    }>;
    total_waiting: number;
    total_serving: number;
    total_completed: number;
  }> {
    const res = await fetch(`${API_BASE}/display/board`);
    return handleResponse(res);
  },

  // ==========================================
  // PHARMACY & DISPENSING
  // ==========================================
  async getPharmacyInventory(query?: { search?: string; lowStockOnly?: boolean }): Promise<{ items: PharmacyItem[] }> {
    const params = new URLSearchParams();
    if (query?.search) params.append('search', query.search);
    if (query?.lowStockOnly) params.append('lowStockOnly', 'true');
    const res = await fetch(`${API_BASE}/pharmacy/inventory?${params.toString()}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async addPharmacyItem(data: Partial<PharmacyItem>): Promise<{ item: PharmacyItem }> {
    const res = await fetch(`${API_BASE}/pharmacy/inventory`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updatePharmacyStock(id: string, delta: number): Promise<{ item: PharmacyItem }> {
    const res = await fetch(`${API_BASE}/pharmacy/inventory/${id}/stock`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ delta }),
    });
    return handleResponse(res);
  },

  async getDispenseRecords(filters?: { status?: string; patientId?: string }): Promise<{ records: PrescriptionDispense[] }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.patientId) params.append('patientId', filters.patientId);
    const res = await fetch(`${API_BASE}/pharmacy/dispense?${params.toString()}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async createDispenseRecord(data: Partial<PrescriptionDispense>): Promise<{ record: PrescriptionDispense }> {
    const res = await fetch(`${API_BASE}/pharmacy/dispense`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateDispenseStatus(
    id: string,
    status: 'pending' | 'prepared' | 'dispensed' | 'cancelled',
    dispensed_by?: string,
    counseling_notes?: string
  ): Promise<{ record: PrescriptionDispense }> {
    const res = await fetch(`${API_BASE}/pharmacy/dispense/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, dispensed_by, counseling_notes }),
    });
    return handleResponse(res);
  },

  // ==========================================
  // LAB TECHNICIAN & RESULTS
  // ==========================================
  async getLabResults(filters?: { patientId?: string; labOrderId?: string }): Promise<{ results: LabTestResult[] }> {
    const params = new URLSearchParams();
    if (filters?.patientId) params.append('patientId', filters.patientId);
    if (filters?.labOrderId) params.append('labOrderId', filters.labOrderId);
    const res = await fetch(`${API_BASE}/labtech/results?${params.toString()}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async getLabResultById(id: string): Promise<{ result: LabTestResult }> {
    const res = await fetch(`${API_BASE}/labtech/results/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async saveLabResult(data: Partial<LabTestResult>): Promise<{ result: LabTestResult }> {
    const res = await fetch(`${API_BASE}/labtech/results`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getPendingLabOrders(): Promise<{ orders: LabOrder[] }> {
    const res = await fetch(`${API_BASE}/labtech/pending-orders`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // ==========================================
  // SMS & NOTIFICATIONS
  // ==========================================
  async getSmsLogs(limit: number = 50): Promise<{ logs: SmsLog[] }> {
    const res = await fetch(`${API_BASE}/sms/logs?limit=${limit}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async sendSms(data: {
    recipient_phone: string;
    recipient_name: string;
    message: string;
    type?: string;
  }): Promise<{ log: SmsLog; success: boolean }> {
    const res = await fetch(`${API_BASE}/sms/send`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // ==========================================
  // TELEMEDICINE
  // ==========================================
  async getTelemedSessions(filters?: { patientId?: string; doctorId?: string }): Promise<{ sessions: TelemedSession[] }> {
    const params = new URLSearchParams();
    if (filters?.patientId) params.append('patientId', filters.patientId);
    if (filters?.doctorId) params.append('doctorId', filters.doctorId);
    const res = await fetch(`${API_BASE}/telemed/sessions?${params.toString()}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async createTelemedSession(data: Partial<TelemedSession>): Promise<{ session: TelemedSession }> {
    const res = await fetch(`${API_BASE}/telemed/sessions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateTelemedSession(id: string, status: 'scheduled' | 'active' | 'ended', doctor_notes?: string): Promise<{ session: TelemedSession }> {
    const res = await fetch(`${API_BASE}/telemed/sessions/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, doctor_notes }),
    });
    return handleResponse(res);
  },

  // ==========================================
  // CLINIC BRANCHES
  // ==========================================
  async getBranches(): Promise<{ branches: ClinicBranch[] }> {
    const res = await fetch(`${API_BASE}/branches`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async saveBranch(data: Partial<ClinicBranch>): Promise<{ branch: ClinicBranch }> {
    const res = await fetch(`${API_BASE}/branches`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // ==========================================
  // DIGITAL MEDICAL CERTIFICATES & CLEARANCES
  // ==========================================
  async getMedicalCertificates(params?: { patientId?: string; doctorId?: string }): Promise<{ certificates: MedicalCertificate[] }> {
    const query = new URLSearchParams();
    if (params?.patientId) query.append('patientId', params.patientId);
    if (params?.doctorId) query.append('doctorId', params.doctorId);
    const res = await fetch(`${API_BASE}/clinical/certificates?${query.toString()}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async getMedicalCertificateById(id: string): Promise<{ certificate: MedicalCertificate }> {
    const res = await fetch(`${API_BASE}/clinical/certificates/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async verifyMedicalCertificate(code: string): Promise<{ verified: boolean; certificate?: MedicalCertificate; error?: string }> {
    const res = await fetch(`${API_BASE}/clinical/certificates/verify/${encodeURIComponent(code)}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async createMedicalCertificate(data: Partial<MedicalCertificate>): Promise<{ certificate: MedicalCertificate }> {
    const res = await fetch(`${API_BASE}/clinical/certificates`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // ==========================================
  // FORMAL SPECIALIST REFERRAL LETTERS
  // ==========================================
  async getDoctorReferrals(params?: { patientId?: string; doctorId?: string }): Promise<{ referrals: DoctorReferral[] }> {
    const query = new URLSearchParams();
    if (params?.patientId) query.append('patientId', params.patientId);
    if (params?.doctorId) query.append('doctorId', params.doctorId);
    const res = await fetch(`${API_BASE}/clinical/referrals?${query.toString()}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async getDoctorReferralById(id: string): Promise<{ referral: DoctorReferral }> {
    const res = await fetch(`${API_BASE}/clinical/referrals/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async createDoctorReferral(data: Partial<DoctorReferral>): Promise<{ referral: DoctorReferral }> {
    const res = await fetch(`${API_BASE}/clinical/referrals`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateDoctorReferralStatus(id: string, status: 'pending' | 'accepted' | 'completed' | 'cancelled'): Promise<{ referral: DoctorReferral }> {
    const res = await fetch(`${API_BASE}/clinical/referrals/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    return handleResponse(res);
  },
};
