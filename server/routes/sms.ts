import { Router } from 'express';
import { db } from '../db/store';
import { authenticateToken } from '../auth';

export const smsRouter = Router();

// Get SMS history logs
smsRouter.get('/logs', authenticateToken, (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const logs = db.getSmsLogs(limit);
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dispatch / send an SMS alert
smsRouter.post('/send', authenticateToken, (req, res) => {
  try {
    const { recipient_phone, recipient_name, message, type } = req.body;
    if (!recipient_phone || !message) {
      return res.status(400).json({ error: 'recipient_phone and message are required' });
    }
    const log = db.sendSms(recipient_phone, recipient_name || 'Patient', message, type || 'general');
    res.status(201).json({ log, success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
