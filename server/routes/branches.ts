import { Router } from 'express';
import { db } from '../db/store';
import { authenticateToken, requireRole } from '../auth';

export const branchesRouter = Router();

// Get all clinic satellite branches (public/authenticated)
branchesRouter.get('/', (req, res) => {
  try {
    const branches = db.getClinicBranches();
    res.json({ branches });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create or update branch (Admin only)
branchesRouter.post('/', authenticateToken, requireRole(['ADMIN']), (req, res) => {
  try {
    const branch = db.saveClinicBranch(req.body);
    res.status(201).json({ branch });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
