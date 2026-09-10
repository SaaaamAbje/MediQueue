import { Router } from 'express';
import { db } from '../db/store';
import { authenticateToken } from '../auth';

export const telemedRouter = Router();

// Get telemed sessions
telemedRouter.get('/sessions', authenticateToken, (req, res) => {
  try {
    const patientId = req.query.patientId as string;
    const doctorId = req.query.doctorId as string;
    const sessions = db.getTelemedSessions({ patientId, doctorId });
    res.json({ sessions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create telemed session
telemedRouter.post('/sessions', authenticateToken, (req, res) => {
  try {
    const session = db.createTelemedSession(req.body);
    res.status(201).json({ session });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update telemed session status (active, ended)
telemedRouter.patch('/sessions/:id', authenticateToken, (req, res) => {
  try {
    const { status, doctor_notes } = req.body;
    const updated = db.updateTelemedSession(req.params.id, status, doctor_notes);
    if (!updated) return res.status(404).json({ error: 'Session not found' });
    res.json({ session: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
