import { Router, Response } from 'express';
import { db } from '../db/store';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../auth';

export const consultationsRouter = Router();

// GET /api/consultations
consultationsRouter.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  let { patientId, doctorId } = req.query as { patientId?: string; doctorId?: string };

  if (user.role === 'PATIENT') {
    const patient = db.getPatientByUserId(user.id);
    if (!patient) {
      res.json([]);
      return;
    }
    patientId = patient.id;
  } else if (user.role === 'DOCTOR' && !doctorId) {
    const doc = db.getDoctorByUserId(user.id);
    if (doc) doctorId = doc.id;
  }

  const list = db.getConsultations(patientId, doctorId);
  res.json(list);
});

// GET /api/consultations/:id
consultationsRouter.get('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const c = db.getConsultationById(req.params.id);
  if (!c) {
    res.status(404).json({ error: 'Consultation record not found.' });
    return;
  }

  if (req.user!.role === 'PATIENT') {
    const patient = db.getPatientByUserId(req.user!.id);
    if (!patient || patient.id !== c.patient_id) {
      res.status(403).json({ error: 'Unauthorized to view this record.' });
      return;
    }
  }

  res.json(c);
});
