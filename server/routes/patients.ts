import { Router, Response } from 'express';
import { db } from '../db/store';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../auth';

export const patientsRouter = Router();

// GET /api/patients
patientsRouter.get('/', authenticateToken, requireRoles('ADMIN', 'DOCTOR'), (req: AuthenticatedRequest, res: Response): void => {
  const { search, status } = req.query as { search?: string; status?: string };
  const patients = db.getPatients(search, status);
  res.json(patients);
});

// GET /api/patients/profile (current patient profile)
patientsRouter.get('/profile', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const patient = db.getPatientByUserId(req.user!.id);
  if (!patient) {
    res.status(404).json({ error: 'Patient profile not found.' });
    return;
  }
  res.json(patient);
});

// GET /api/patients/:id
patientsRouter.get('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const patient = db.getPatientById(req.params.id);
  if (!patient) {
    res.status(404).json({ error: 'Patient not found.' });
    return;
  }

  if (user.role === 'PATIENT') {
    const currentPatient = db.getPatientByUserId(user.id);
    if (!currentPatient || currentPatient.id !== patient.id) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }
  }

  res.json(patient);
});

// GET /api/patients/:id/consultations
patientsRouter.get('/:id/consultations', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const targetPatientId = req.params.id;

  if (user.role === 'PATIENT') {
    const currentPatient = db.getPatientByUserId(user.id);
    if (!currentPatient || currentPatient.id !== targetPatientId) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }
  }

  const history = db.getConsultations(targetPatientId);
  res.json(history);
});

// PATCH /api/patients/:id
patientsRouter.patch('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const targetId = req.params.id;

  // Patient can edit their own profile; Admin can edit any
  if (user.role === 'PATIENT') {
    const currentPatient = db.getPatientByUserId(user.id);
    if (!currentPatient || currentPatient.id !== targetId) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }
  }

  const updated = db.updatePatient(targetId, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Patient not found.' });
    return;
  }

  db.logAudit({
    user_id: user.id,
    user_email: user.email,
    user_role: user.role,
    action: 'Updated Patient Record',
    module: 'Patients',
    record_id: updated.id,
    details: `Updated info for ${updated.first_name} ${updated.last_name}.`,
  });

  res.json(updated);
});

// POST /api/patients/:id/toggle-status (Admin only soft delete / deactivation)
patientsRouter.post('/:id/toggle-status', authenticateToken, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response): void => {
  const updated = db.togglePatientStatus(req.params.id);
  if (!updated) {
    res.status(404).json({ error: 'Patient not found.' });
    return;
  }

  db.logAudit({
    user_id: req.user!.id,
    user_email: req.user!.email,
    user_role: req.user!.role,
    action: updated.is_active ? 'Reactivated Patient' : 'Deactivated Patient',
    module: 'Patients',
    record_id: updated.id,
    details: `Toggled active status for patient ${updated.patient_number} to ${updated.is_active}.`,
  });

  res.json(updated);
});
