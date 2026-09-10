import { Router } from 'express';
import { db } from '../db/store';
import { authenticateToken, requireRole } from '../auth';

export const pharmacyRouter = Router();

// Get inventory items
pharmacyRouter.get('/inventory', authenticateToken, (req, res) => {
  try {
    const search = req.query.search as string;
    const lowStockOnly = req.query.lowStockOnly === 'true';
    const items = db.getPharmacyItems({ search, lowStockOnly });
    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add new pharmacy item
pharmacyRouter.post('/inventory', authenticateToken, requireRole(['ADMIN']), (req: any, res) => {
  try {
    const item = db.addPharmacyItem(req.body, req.user);
    res.status(201).json({ item });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Adjust stock
pharmacyRouter.patch('/inventory/:id/stock', authenticateToken, requireRole(['ADMIN']), (req: any, res) => {
  try {
    const delta = Number(req.body.delta) || 0;
    const updated = db.updatePharmacyStock(req.params.id, delta, req.user);
    if (!updated) return res.status(404).json({ error: 'Item not found' });
    res.json({ item: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get dispense records
pharmacyRouter.get('/dispense', authenticateToken, (req: any, res) => {
  try {
    const status = req.query.status as string;
    const patientId = req.query.patientId as string;
    const records = db.getDispenseRecords({ status, patientId });
    res.json({ records });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create prescription dispense request
pharmacyRouter.post('/dispense', authenticateToken, (req: any, res) => {
  try {
    const record = db.createDispenseRecord(req.body, req.user);
    res.status(201).json({ record });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update dispense status (prepared, dispensed, cancelled)
pharmacyRouter.patch('/dispense/:id/status', authenticateToken, requireRole(['ADMIN']), (req: any, res) => {
  try {
    const { status, dispensed_by, counseling_notes } = req.body;
    const updated = db.updateDispenseStatus(req.params.id, status, dispensed_by, counseling_notes);
    if (!updated) return res.status(404).json({ error: 'Dispense record not found' });
    res.json({ record: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
