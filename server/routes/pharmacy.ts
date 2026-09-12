import { Router } from 'express';
import { db } from '../db/store';
import { authenticateToken, requireRole } from '../auth';

export const pharmacyRouter = Router();

// Get inventory items
pharmacyRouter.get('/inventory', authenticateToken, async (req, res) => {
  try {
    const category = req.query.category as string;
    const items = await db.getPharmacyItems(category);
    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add new pharmacy item
pharmacyRouter.post('/inventory', authenticateToken, requireRole(['ADMIN']), async (req: any, res) => {
  try {
    const item = await db.addPharmacyItem(req.body);
    res.status(201).json({ item });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Adjust stock
pharmacyRouter.patch('/inventory/:id/stock', authenticateToken, requireRole(['ADMIN']), async (req: any, res) => {
  try {
    const delta = Number(req.body.delta) || 0;
    const success = await db.updatePharmacyStock(req.params.id, delta);
    if (!success) return res.status(404).json({ error: 'Item not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get dispense records
pharmacyRouter.get('/dispense', authenticateToken, async (req: any, res) => {
  try {
    const status = req.query.status as string;
    const records = await db.getDispenseRecords(status);
    res.json({ records });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create prescription dispense request
pharmacyRouter.post('/dispense', authenticateToken, async (req: any, res) => {
  try {
    const record = await db.createDispenseRecord(req.body);
    res.status(201).json({ record });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update dispense status (prepared, dispensed, cancelled)
pharmacyRouter.patch('/dispense/:id/status', authenticateToken, requireRole(['ADMIN']), async (req: any, res) => {
  try {
    const { status } = req.body;
    const success = await db.updateDispenseStatus(req.params.id, status);
    if (!success) return res.status(404).json({ error: 'Dispense record not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
