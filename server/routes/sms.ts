import { Router } from 'express';
import { db } from '../db/store';
import { authenticateToken } from '../auth';

export const smsRouter = Router();

// Get SMS history logs
smsRouter.get('/logs', authenticateToken, async (req, res) => {
  try {
    const logs = await db.getSmsLogs();
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dispatch / send an SMS alert
smsRouter.post('/send', authenticateToken, async (req, res) => {
  try {
    const { patient_id, message } = req.body;
    if (!patient_id || !message) {
      return res.status(400).json({ error: 'patient_id and message are required' });
    }
    const success = await db.sendSms(patient_id, message);
    res.status(201).json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
