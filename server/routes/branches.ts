import { Router } from 'express';
import { db } from '../db/store';
import { authenticateToken, requireRole } from '../auth';

export const branchesRouter = Router();

// Get all clinic satellite branches (public/authenticated)
branchesRouter.get('/', async (req, res) => {
  try {
    const branches = await db.getClinicBranches();
    res.json({ branches });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create or update branch (Admin only)
branchesRouter.post('/', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const branch = await db.saveClinicBranch(req.body);
    res.status(201).json({ branch });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
