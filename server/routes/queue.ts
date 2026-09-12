import { Router, Response } from 'express';
import { db } from '../db/store';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../auth';

export const queueRouter = Router();

// GET /api/queue/today
queueRouter.get('/today', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { doctorId, status } = req.query as { doctorId?: string; status?: string };
  const items = await db.getTodayQueue({ doctorId, status });
  res.json(items);
});

// GET /api/queue/my-status (Patient live queue view)
queueRouter.get('/my-status', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const patient = await db.getPatientByUserId(user.id);
  if (!patient) {
    res.json({ hasTicket: false, message: 'No patient record found.' });
    return;
  }

  const status = await db.getPatientQueueStatus(patient.id);
  res.json(status);
});

// POST /api/queue/check-in
queueRouter.post('/check-in', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    let { appointment_id, patient_id, doctor_id } = req.body;

    // If patient is checking themselves in via mobile or kiosk
    if (user.role === 'PATIENT') {
      const patient = await db.getPatientByUserId(user.id);
      if (!patient) {
        res.status(400).json({ error: 'Patient profile not found.' });
        return;
      }
      patient_id = patient.id;

      if (!appointment_id) {
        res.status(400).json({ error: 'Please specify the appointment reference to check in.' });
        return;
      }
      const apt = await db.getAppointmentById(appointment_id);
      if (!apt || apt.patient_id !== patient.id) {
        res.status(403).json({ error: 'Unauthorized to check in this appointment.' });
        return;
      }
      doctor_id = apt.doctor_id;
    } else {
      // Staff or Doctor check-in
      if (appointment_id) {
        const apt = await db.getAppointmentById(appointment_id);
        if (apt) {
          patient_id = apt.patient_id;
          doctor_id = apt.doctor_id;
        }
      }
      if (!patient_id || !doctor_id) {
        res.status(400).json({ error: 'Please specify patient and doctor for queue check-in.' });
        return;
      }
    }

    const result = await db.checkInPatient({
      appointment_id,
      patient_id,
      doctor_id,
      checkedInBy: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json({
      message: `Checked in successfully! Queue Ticket: ${result.queueItem?.queue_number}`,
      queueItem: result.queueItem,
    });
  } catch (err) {
    console.error('Check-in error:', err);
    res.status(500).json({ error: 'Failed to process check-in.' });
  }
});

// POST /api/queue/call-next (Doctor or Staff)
queueRouter.post('/call-next', authenticateToken, requireRoles('DOCTOR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  let { doctor_id } = req.body;
  const user = req.user!;

  if (user.role === 'DOCTOR') {
    const doc = await db.getDoctorByUserId(user.id);
    if (doc) doctor_id = doc.id;
  }

  const result = await db.callNext(doctor_id, {
    id: user.id,
    email: user.email,
    role: user.role,
  });

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({
    message: `Now calling Queue Ticket ${result.queueItem?.queue_number}`,
    queueItem: result.queueItem,
  });
});

// POST /api/queue/:id/recall
queueRouter.post('/:id/recall', authenticateToken, requireRoles('DOCTOR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await db.recallPatient(req.params.id, {
    id: req.user!.id,
    email: req.user!.email,
    role: req.user!.role,
  });

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({ message: 'Patient recalled successfully.', queueItem: result.queueItem });
});

// POST /api/queue/:id/skip
queueRouter.post('/:id/skip', authenticateToken, requireRoles('DOCTOR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await db.skipPatient(req.params.id, {
    id: req.user!.id,
    email: req.user!.email,
    role: req.user!.role,
  });

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({ message: 'Patient marked as skipped.', queueItem: result.queueItem });
});

// POST /api/queue/:id/start-consultation
queueRouter.post('/:id/start-consultation', authenticateToken, requireRoles('DOCTOR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await db.startConsultation(req.params.id, {
    id: req.user!.id,
    email: req.user!.email,
    role: req.user!.role,
  });

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({ message: 'Consultation started.', queueItem: result.queueItem });
});

// POST /api/queue/:id/complete
queueRouter.post('/:id/complete', authenticateToken, requireRoles('DOCTOR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { chief_complaint, symptoms, diagnosis, clinical_notes, prescription, recommendations, follow_up_date } = req.body;

  if (!diagnosis?.trim() || !chief_complaint?.trim()) {
    res.status(400).json({ error: 'Diagnosis and Chief Complaint are required to complete consultation.' });
    return;
  }

  const result = await db.completeConsultation(
    req.params.id,
    {
      chief_complaint,
      symptoms: symptoms || '',
      diagnosis,
      clinical_notes: clinical_notes || '',
      prescription: prescription || '',
      recommendations: recommendations || '',
      follow_up_date: follow_up_date || undefined,
    },
    {
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role,
    }
  );

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({ message: 'Consultation completed and saved.', consultation: result.consultation });
});

// POST /api/queue/:id/no-show
queueRouter.post('/:id/no-show', authenticateToken, requireRoles('DOCTOR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await db.markNoShow(req.params.id, {
    id: req.user!.id,
    email: req.user!.email,
    role: req.user!.role,
  });

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({ message: 'Patient marked as No-Show.', queueItem: result.queueItem });
});
