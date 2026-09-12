import { Router } from 'express';
import { db } from '../db/store';
import { authenticateToken } from '../auth';

export const clinicalRouter = Router();

// ==========================================
// VITAL SIGNS
// ==========================================
clinicalRouter.get('/vitals/:patientId', async (req, res) => {
  try {
    const list = await db.getPatientVitals(req.params.patientId);
    res.json({ vitals: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

clinicalRouter.post('/vitals', authenticateToken, async (req: any, res) => {
  try {
    const {
      patient_id,
      systolic_bp,
      diastolic_bp,
      heart_rate,
      temperature_c,
      respiratory_rate,
      spo2,
      blood_glucose_mgdl,
      weight_kg,
      height_cm,
      notes,
    } = req.body;

    if (!patient_id || !systolic_bp || !diastolic_bp || !heart_rate || !temperature_c || !weight_kg || !height_cm) {
      return res.status(400).json({ error: 'Patient ID, BP, Heart Rate, Temp, Weight, and Height are required.' });
    }

    const heightM = height_cm / 100;
    const calculatedBmi = Number((weight_kg / (heightM * heightM)).toFixed(1));

    const record = await db.addVitalSign({
      patient_id,
      systolic_bp: Number(systolic_bp),
      diastolic_bp: Number(diastolic_bp),
      heart_rate: Number(heart_rate),
      temperature_c: Number(temperature_c),
      respiratory_rate: respiratory_rate ? Number(respiratory_rate) : 16,
      spo2: spo2 ? Number(spo2) : 98,
      blood_glucose_mgdl: blood_glucose_mgdl ? Number(blood_glucose_mgdl) : undefined,
      weight_kg: Number(weight_kg),
      height_cm: Number(height_cm),
      bmi: calculatedBmi,
      notes,
      recorded_by_name: req.user ? req.user.email.split('@')[0] : 'Clinical Staff',
      recorded_by_role: req.user?.role === 'DOCTOR' ? 'Doctor' : 'Nurse',
    });

    res.status(201).json({ vital: record });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// LAB & DIAGNOSTIC ORDERS
// ==========================================
clinicalRouter.get('/labs', async (req, res) => {
  try {
    const { patientId, doctorId, status } = req.query as any;
    const list = await db.getLabOrders({ patientId, doctorId, status });
    res.json({ orders: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

clinicalRouter.post('/labs', authenticateToken, async (req: any, res) => {
  try {
    const {
      patient_id,
      doctor_id,
      consultation_id,
      priority,
      clinical_indication,
      tests,
      fasting_required,
      specimen_notes,
    } = req.body;

    if (!patient_id || !doctor_id || !tests || !Array.isArray(tests) || tests.length === 0) {
      return res.status(400).json({ error: 'Patient, Doctor, and at least one lab test item are required.' });
    }

    const newOrder = await db.createLabOrder(
      {
        patient_id,
        doctor_id,
        consultation_id,
        status: 'pending',
        priority: priority || 'Routine',
        clinical_indication: clinical_indication || 'Clinical workup',
        tests,
        fasting_required: Boolean(fasting_required),
        specimen_notes,
      }
    );

    res.status(201).json({ order: newOrder });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

clinicalRouter.patch('/labs/:id/status', authenticateToken, async (req: any, res) => {
  try {
    const { status } = req.body;
    const updated = await db.updateLabOrderStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ error: 'Lab order not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// DOCTOR OPERATIONAL STATUS
// ==========================================
clinicalRouter.get('/doctor-status', async (_req, res) => {
  try {
    const list = await db.getDoctorWorkStatuses();
    res.json({ statuses: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

clinicalRouter.post('/doctor-status', authenticateToken, async (req: any, res) => {
  try {
    const { doctor_id, status } = req.body;
    const targetDocId = doctor_id || (req.user?.role === 'DOCTOR' ? req.user.id : null);
    if (!targetDocId || !status) {
      return res.status(400).json({ error: 'Doctor ID and status are required.' });
    }

    const success = await db.updateDoctorWorkStatus(targetDocId, status);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PRE-CONSULTATION TRIAGE
// ==========================================
clinicalRouter.get('/triage/:patientId', async (req, res) => {
  try {
    const date = req.query.date as string;
    const triage = await db.getTriage(req.params.patientId, date);
    res.json({ triage });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

clinicalRouter.post('/triage', async (req, res) => {
  try {
    const {
      appointment_id,
      patient_id,
      chief_complaint,
      symptoms_duration,
      pain_scale,
      current_medications,
      known_allergies,
      medical_history_notes,
      vitals_snapshot,
    } = req.body;

    if (!patient_id || !chief_complaint) {
      return res.status(400).json({ error: 'Patient ID and chief complaint are required.' });
    }

    const saved = await db.saveTriage({
      appointment_id,
      patient_id,
      chief_complaint,
      symptoms_duration: symptoms_duration || 'Recent',
      pain_scale: Number(pain_scale) || 0,
      current_medications: current_medications || 'None reported',
      known_allergies: known_allergies || 'No known allergies',
      medical_history_notes: medical_history_notes || 'None reported',
      vitals_snapshot,
    });

    res.status(201).json({ triage: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// DIGITAL MEDICAL CERTIFICATES & CLEARANCES
// ==========================================
clinicalRouter.get('/certificates', async (req, res) => {
  try {
    const { patientId } = req.query as any;
    const certs = await db.getMedicalCertificates(patientId);
    res.json({ certificates: certs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

clinicalRouter.get('/certificates/verify/:code', async (req, res) => {
  try {
    const cert = await db.verifyMedicalCertificate(req.params.code);
    if (!cert) {
      return res.status(404).json({
        verified: false,
        error: 'Certificate not found or verification code is invalid.',
      });
    }
    res.json({
      verified: true,
      certificate: cert,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

clinicalRouter.get('/certificates/:id', async (req, res) => {
  try {
    const cert = await db.getMedicalCertificateById(req.params.id);
    if (!cert) {
      return res.status(404).json({ error: 'Medical certificate not found' });
    }
    res.json({ certificate: cert });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

clinicalRouter.post('/certificates', authenticateToken, async (req: any, res) => {
  try {
    const {
      patient_id,
      doctor_id,
      consultation_id,
      appointment_id,
      certificate_type,
      title,
      diagnosis,
      icd10_code,
      findings_summary,
      recommendations,
      rest_days,
      effective_date,
      expiry_date,
      physician_credentials,
      remarks,
    } = req.body;

    if (!patient_id || !diagnosis || !recommendations) {
      return res.status(400).json({
        error: 'Patient ID, diagnosis, and recommendations are required to issue a medical certificate.',
      });
    }

    const created = await db.createMedicalCertificate(
      {
        patient_id,
        doctor_id,
        consultation_id,
        appointment_id,
        certificate_type,
        title,
        diagnosis,
        icd10_code,
        findings_summary,
        recommendations,
        rest_days,
        effective_date,
        expiry_date,
        physician_credentials,
        remarks,
      }
    );

    res.status(201).json({ certificate: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// FORMAL SPECIALIST REFERRAL LETTERS
// ==========================================
clinicalRouter.get('/referrals', async (req, res) => {
  try {
    const { patientId, doctorId } = req.query as any;
    const refs = await db.getDoctorReferrals(doctorId, patientId);
    res.json({ referrals: refs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

clinicalRouter.get('/referrals/:id', async (req, res) => {
  try {
    const ref = await db.getDoctorReferralById(req.params.id);
    if (!ref) {
      return res.status(404).json({ error: 'Referral letter not found' });
    }
    res.json({ referral: ref });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

clinicalRouter.post('/referrals', authenticateToken, async (req: any, res) => {
  try {
    const {
      patient_id,
      referring_doctor_id,
      consultation_id,
      receiving_specialty,
      receiving_doctor_name,
      receiving_clinic_branch,
      priority,
      reason_for_referral,
      clinical_summary,
      relevant_vitals,
      attached_medications,
      attached_lab_results,
      valid_until,
    } = req.body;

    if (!patient_id || !receiving_specialty || !reason_for_referral) {
      return res.status(400).json({
        error: 'Patient ID, receiving specialty, and reason for referral are required.',
      });
    }

    const created = await db.createDoctorReferral(
      {
        patient_id,
        referring_doctor_id,
        consultation_id,
        receiving_specialty,
        receiving_doctor_name,
        receiving_clinic_branch,
        priority,
        reason_for_referral,
        clinical_summary,
        relevant_vitals,
        attached_medications,
        attached_lab_results,
        valid_until,
      }
    );

    res.status(201).json({ referral: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

clinicalRouter.patch('/referrals/:id/status', authenticateToken, async (req: any, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'accepted', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid referral status' });
    }

    const success = await db.updateDoctorReferralStatus(req.params.id, status);
    if (!success) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
