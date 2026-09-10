import { Router } from 'express';
import { db } from '../db/store';
import { authenticateToken } from '../auth';

export const labtechRouter = Router();

// Get lab results (optionally filtered by patientId or labOrderId)
labtechRouter.get('/results', authenticateToken, (req, res) => {
  try {
    const patientId = req.query.patientId as string;
    const labOrderId = req.query.labOrderId as string;
    const results = db.getLabResults({ patientId, labOrderId });
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single lab result by ID
labtechRouter.get('/results/:id', authenticateToken, (req, res) => {
  try {
    const result = db.getLabResultById(req.params.id);
    if (!result) return res.status(404).json({ error: 'Lab result not found' });
    res.json({ result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Save or submit new lab result findings
labtechRouter.post('/results', authenticateToken, (req: any, res) => {
  try {
    const result = db.saveLabResult(req.body, req.user);
    res.status(201).json({ result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all pending lab orders for laboratory technicians to process
labtechRouter.get('/pending-orders', authenticateToken, (req, res) => {
  try {
    const orders = db.getLabOrders({ status: 'pending' });
    res.json({ orders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
