import { Router, Response } from 'express';
import { db } from '../db/store';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../auth';
import { getInitialSeedData } from '../db/seed';

export const adminRouter = Router();

// GET /api/admin/audit-logs
adminRouter.get('/audit-logs', authenticateToken, requireRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { module, userRole, search } = req.query as { module?: string; userRole?: string; search?: string };
  const logs = await db.getAuditLogs({ module, userRole, search });
  res.json(logs);
});

// GET /api/admin/settings (Public or authenticated)
adminRouter.get('/settings', async (_req, res: Response): Promise<void> => {
  const settings = await db.getSettings();
  res.json(settings);
});

// PATCH /api/admin/settings
adminRouter.patch('/settings', authenticateToken, requireRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const updated = await db.updateSettings(req.body);
  
  await db.logAudit({
    user_id: req.user!.id,
    user_email: req.user!.email,
    user_role: req.user!.role,
    action: 'Update Settings',
    module: 'Settings',
    details: 'Clinic configuration updated.',
  });

  res.json(updated);
});

// POST /api/admin/reset-demo-data (Helpful for test evaluations)
adminRouter.post('/reset-demo-data', authenticateToken, requireRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await db.resetToSeed();
  const seed = getInitialSeedData();
  await db.seedDatabase(seed);
  
  await db.logAudit({
    user_id: req.user!.id,
    user_email: req.user!.email,
    user_role: req.user!.role,
    action: 'Reset Database to Seed State',
    module: 'Settings',
    details: 'System restored to initial clean sample dataset.',
  });
  res.json({ message: 'Database reset and seeded with initial data.' });
});
