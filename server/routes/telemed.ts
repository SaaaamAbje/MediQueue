import { Router } from 'express';
import { db } from '../db/store';
import { authenticateToken } from '../auth';

export const telemedRouter = Router();

// Get telemed sessions
telemedRouter.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const patientId = req.query.patientId as string;
    const doctorId = req.query.doctorId as string;
    const sessions = await db.getTelemedSessions({ patientId, doctorId });
    res.json({ sessions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create telemed session
telemedRouter.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const session = await db.createTelemedSession(req.body);
    res.status(201).json({ session });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update telemed session status (active, ended)
telemedRouter.patch('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const success = await db.updateTelemedSession(req.params.id, req.body);
    if (!success) return res.status(404).json({ error: 'Session not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
