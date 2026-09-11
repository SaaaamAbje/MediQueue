export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  user_id: string;
  patient_number: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  date_of_birth: string;
  sex: 'Male' | 'Female' | 'Other' | string;
  address: string;
  emergency_contact_name?: string;
  emergency_contact_number?: string;
  emergency_contact_phone?: string;
  blood_type?: string;
  allergies?: string;
  age?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Specialization {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Doctor {
  id: string;
  user_id: string;
  doctor_code: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  specialization_id: string;
  specialization_name: string;
  license_number: string;
  ptr_number?: string;
  s2_license?: string;
  room_number: string;
  status: 'Active' | 'Inactive' | 'On Leave' | string;
  bio?: string;
  consultation_fee?: number;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface DoctorSchedule {
  id: string;
  doctor_id: string;
  day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday' | string;
  start_time: string; // e.g. "08:00"
  end_time: string;   // e.g. "12:00"
  slot_duration_minutes: number; // e.g. 30
  max_patients_per_slot?: number; // default 1
  max_patients?: number;
  status?: 'Active' | 'Inactive' | string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'in_queue'
  | 'in_consultation'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Appointment {
  id: string;
  appointment_reference: string; // APT-2026-XXXXXX
  reference_number?: string; // alias
  patient_id: string;
  doctor_id: string;
  schedule_id?: string;
  appointment_date: string; // YYYY-MM-DD
  time_slot: string; // e.g. "08:30 AM"
  reason_for_consultation: string;
  status: AppointmentStatus;
  cancellation_reason?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  patient?: Patient;
  doctor?: Doctor;
  queue_item?: QueueItem;
}

export type QueueStatus =
  | 'waiting'
  | 'called'
  | 'in_consultation'
  | 'completed'
  | 'skipped'
  | 'no_show';

export interface QueueItem {
  id: string;
  queue_number: string; // e.g. "A001"
  queue_date: string; // YYYY-MM-DD
  appointment_id?: string;
  patient_id: string;
  doctor_id: string;
  check_in_time: string;
  called_time?: string;
  consultation_start_time?: string;
  completion_time?: string;
  status: QueueStatus;
  remarks?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  patient?: Patient;
  doctor?: Doctor;
  appointment?: Appointment;
}

export interface Consultation {
  id: string;
  appointment_id?: string;
  patient_id: string;
  doctor_id: string;
  
  // Basic Info
  chief_complaint: string;
  symptoms: string;
  
  // SOAP Notes Structure
  subjective?: string;     // Patient's history of present illness, symptoms, family history
  objective?: string;      // Physical exam findings, vital signs observed
  assessment?: string;     // Clinical diagnosis, differential diagnoses
  plan?: string;           // Treatment plan, patient education, referrals
  
  // Professional Coding
  diagnosis: string;
  icd10_code?: string;     // International Classification of Diseases code
  
  clinical_notes: string;
  prescription: string;
  recommendations: string;
  
  // Clinical Operations
  follow_up_date?: string;
  consultation_date: string;
  
  // Accountability & Integrity
  is_locked: boolean;      // Once locked/signed, records cannot be edited
  signed_at?: string;
  signature_hash?: string; // Digital fingerprint of the consultation record
  
  created_at: string;
  updated_at: string;
  
  // Joined fields
  patient?: Patient;
  doctor?: Doctor;
  appointment?: Appointment;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'appointment' | 'queue' | 'consultation' | 'system';
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  user_role: UserRole;
  role?: UserRole;
  action: string;
  module: string;
  record_id?: string;
  details: string;
  timestamp: string;
  ip_address?: string;
}

export interface ClinicSettings {
  id: string;
  clinic_name: string;
  tagline: string;
  contact_number: string;
  email: string;
  address: string;
  operating_days: string;
  opening_time: string;
  closing_time: string;
  daily_queue_prefix: string;
  avg_consultation_time_minutes: number;
  emergency_contact: string;
  updated_at: string;
}

export interface AuthSession {
  user: User;
  token: string;
  patient?: Patient;
  doctor?: Doctor;
}

// -------------------------------------------------------------
// VITAL SIGNS & CLINICAL TRACKING
// -------------------------------------------------------------
export interface VitalSignRecord {
  id: string;
  patient_id: string;
  recorded_at: string;
  systolic_bp: number;        // mmHg
  diastolic_bp: number;       // mmHg
  heart_rate: number;         // bpm
  temperature_c: number;      // °C
  respiratory_rate?: number;  // breaths/min
  spo2: number;               // %
  blood_glucose_mgdl?: number;// mg/dL
  weight_kg: number;          // kg
  height_cm: number;          // cm
  bmi: number;                // kg/m^2
  notes?: string;
  recorded_by_name?: string;
  recorded_by_role?: 'Doctor' | 'Nurse' | 'Triage';
}

// -------------------------------------------------------------
// LAB & DIAGNOSTIC ORDERS
// -------------------------------------------------------------
export type LabTestCategory =
  | 'Hematology'
  | 'Clinical Chemistry'
  | 'Imaging & Radiology'
  | 'Cardiology'
  | 'Microbiology & Serology'
  | 'Urinalysis & Fecalysis'
  | 'Special Diagnostic';

export interface LabTestItem {
  id: string;
  test_code: string;
  test_name: string;
  category: LabTestCategory;
  standard_price: number;
  fasting_required: boolean;
  estimated_turnaround_hours: number;
  preparation_instructions?: string;
}

export interface LabOrder {
  id: string;
  order_number: string;
  patient_id: string;
  doctor_id: string;
  consultation_id?: string;
  status: 'pending' | 'sample_collected' | 'processing' | 'completed' | 'cancelled';
  priority: 'Routine' | 'Urgent' | 'STAT';
  clinical_indication: string;
  tests: LabTestItem[];
  fasting_required: boolean;
  specimen_notes?: string;
  results_summary?: string;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  doctor?: Doctor;
}

// -------------------------------------------------------------
// BILLING, INVOICING & HMO / INSURANCE
// -------------------------------------------------------------
export type InvoiceStatus = 'pending' | 'paid' | 'partially_paid' | 'waived' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'hmo' | 'online' | 'mixed' | 'qr_ph' | 'gcash' | 'maya';

export interface InvoiceItem {
  id: string;
  description: string;
  category: 'consultation' | 'laboratory' | 'pharmacy' | 'procedure' | 'miscellaneous';
  quantity: number;
  unit_price: number;
  total: number;
}

export interface BillingInvoice {
  id: string;
  invoice_number: string;     // INV-2026-XXXXX
  patient_id: string;
  doctor_id?: string;
  appointment_id?: string;
  queue_item_id?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount_amount: number;
  discount_type?: 'Senior Citizen (20%)' | 'PWD (20%)' | 'Employee' | 'None';
  tax_amount: number;
  total_amount: number;
  status: InvoiceStatus;
  payment_method?: PaymentMethod;
  amount_paid: number;
  balance_due: number;
  change_amount?: number;
  // Contactless QR & Digital Payment details
  qr_payment_ref?: string;
  qr_payment_channel?: 'QR_PH' | 'GCASH' | 'MAYA';
  // HMO / Health Insurance specifics
  hmo_provider?: string;      // e.g. Maxicare, PhilHealth, Medicard, Intellicare
  hmo_member_id?: string;
  hmo_approval_code?: string; // Letter of Guarantee / Approval Code
  hmo_coverage_amount?: number;
  patient_copay?: number;
  cashier_name?: string;
  payment_date?: string;
  receipt_number?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  doctor?: Doctor;
}

// -------------------------------------------------------------
// DOCTOR OPERATIONAL STATUS
// -------------------------------------------------------------
export type DoctorWorkStatusType =
  | 'available'
  | 'in_consultation'
  | 'on_break'
  | 'emergency'
  | 'off_duty';

export interface DoctorWorkStatus {
  doctor_id: string;
  status: DoctorWorkStatusType;
  status_message?: string;
  break_minutes_remaining?: number;
  updated_at: string;
}

// -------------------------------------------------------------
// PRE-CONSULTATION TRIAGE INTAKE
// -------------------------------------------------------------
export interface PreConsultationTriage {
  id: string;
  appointment_id?: string;
  patient_id: string;
  chief_complaint: string;
  symptoms_duration: string;
  pain_scale: number; // 0 - 10
  current_medications: string;
  known_allergies: string;
  medical_history_notes: string;
  vitals_snapshot?: {
    blood_pressure?: string;
    temperature_c?: number;
    heart_rate?: number;
    spo2?: number;
  };
  submitted_at: string;
}

// -------------------------------------------------------------
// PHARMACY & MEDICATION DISPENSING
// -------------------------------------------------------------
export interface PharmacyItem {
  id: string;
  medicine_name: string;
  generic_name: string;
  dosage_form: 'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Ointment' | 'Drops' | string;
  strength: string; // e.g. 500mg, 10mg/5mL
  unit_price: number;
  stock_quantity: number;
  reorder_level: number;
  expiration_date: string;
  batch_number: string;
  manufacturer?: string;
  is_active: boolean;
}

export interface DispenseItem {
  pharmacy_item_id?: string;
  medicine_name: string;
  dosage_instructions: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface PrescriptionDispense {
  id: string;
  consultation_id?: string;
  patient_id: string;
  doctor_id: string;
  prescription_text: string;
  items: DispenseItem[];
  status: 'pending' | 'prepared' | 'dispensed' | 'cancelled';
  counseling_notes?: string;
  dispensed_by?: string;
  dispensed_at?: string;
  created_at: string;
  patient?: Patient;
  doctor?: Doctor;
}

// -------------------------------------------------------------
// LABORATORY RESULTS & DIAGNOSTIC FINDINGS
// -------------------------------------------------------------
export interface LabResultParam {
  parameter_name: string;
  value: string | number;
  unit: string;
  reference_range: string;
  flag: 'normal' | 'low' | 'high' | 'critical';
}

export interface LabTestResult {
  id: string;
  lab_order_id: string;
  patient_id: string;
  doctor_id: string;
  test_name: string;
  category: string;
  sample_drawn_at?: string;
  performed_by: string; // Lab Tech name
  verified_by?: string;  // Pathologist name
  result_date: string;
  status: 'draft' | 'verified' | 'released';
  parameters: LabResultParam[];
  clinical_interpretation?: string;
  patient?: Patient;
  doctor?: Doctor;
  created_at: string;
}

// -------------------------------------------------------------
// SMS & QUEUE PROXIMITY DISPATCHER
// -------------------------------------------------------------
export interface SmsLog {
  id: string;
  recipient_phone: string;
  recipient_name: string;
  message: string;
  type: 'queue_proximity' | 'appointment_reminder' | 'urgent_call' | 'general';
  status: 'sent' | 'delivered' | 'failed';
  sent_at: string;
}

// -------------------------------------------------------------
// TELEMEDICINE & VIRTUAL CONSULTATION
// -------------------------------------------------------------
export interface TelemedSession {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  room_code: string;
  status: 'scheduled' | 'active' | 'ended';
  started_at?: string;
  ended_at?: string;
  patient?: Patient;
  doctor?: Doctor;
  doctor_notes?: string;
  is_audio_only?: boolean;
}

// -------------------------------------------------------------
// CLINIC SATELLITE BRANCHES
// -------------------------------------------------------------
export interface ClinicBranch {
  id: string;
  branch_code: string;
  name: string;
  address: string;
  city: string;
  contact_number: string;
  email: string;
  operating_hours: string;
  is_active: boolean;
}

// -------------------------------------------------------------
// DIGITAL MEDICAL CERTIFICATE & CLEARANCES
// -------------------------------------------------------------
export type MedicalCertificateType =
  | 'sick_leave'
  | 'fit_to_work'
  | 'fit_to_travel'
  | 'student_clearance';

export interface MedicalCertificate {
  id: string;
  certificate_number: string; // MC-2026-XXXXX
  patient_id: string;
  doctor_id: string;
  consultation_id?: string;
  appointment_id?: string;
  certificate_type: MedicalCertificateType;
  title: string;
  diagnosis: string;
  icd10_code?: string;
  findings_summary: string;
  recommendations: string; // e.g. "Advised 3 days strict bed rest"
  rest_days?: number;
  effective_date: string;
  expiry_date?: string;
  physician_credentials: {
    name: string;
    specialization: string;
    prc_license: string;
    ptr_number: string;
    s2_license?: string;
  };
  qr_verification_code: string; // VERIFY-MC-XXXX
  verification_hash?: string;
  remarks?: string;
  is_valid: boolean;
  created_at: string;
  patient?: Patient;
  doctor?: Doctor;
}

// -------------------------------------------------------------
// FORMAL SPECIALIST REFERRAL LETTERS (INTER-DEPARTMENTAL)
// -------------------------------------------------------------
export type ReferralPriority = 'Routine' | 'Urgent' | 'STAT';
export type ReferralStatus = 'pending' | 'accepted' | 'completed' | 'cancelled';

export interface DoctorReferral {
  id: string;
  referral_number: string; // REF-2026-XXXXX
  patient_id: string;
  referring_doctor_id: string;
  consultation_id?: string;
  receiving_specialty: string;
  receiving_doctor_name?: string;
  receiving_clinic_branch?: string;
  priority: ReferralPriority;
  reason_for_referral: string;
  clinical_summary: string;
  relevant_vitals?: string;
  attached_medications?: string;
  attached_lab_results?: string;
  status: ReferralStatus;
  valid_until: string;
  created_at: string;
  patient?: Patient;
  referring_doctor?: Doctor;
}


