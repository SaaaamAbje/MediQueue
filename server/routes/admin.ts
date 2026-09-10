import { Router, Response } from 'express';
import { db } from '../db/store';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../auth';

export const adminRouter = Router();

// GET /api/admin/audit-logs
adminRouter.get('/audit-logs', authenticateToken, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response): void => {
  const { module, userRole, search } = req.query as { module?: string; userRole?: string; search?: string };
  const logs = db.getAuditLogs({ module, userRole, search });
  res.json(logs);
});

// GET /api/admin/settings (Public or authenticated)
adminRouter.get('/settings', (_req, res: Response): void => {
  res.json(db.getSettings());
});

// PATCH /api/admin/settings
adminRouter.patch('/settings', authenticateToken, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response): void => {
  const updated = db.updateSettings(req.body, {
    id: req.user!.id,
    email: req.user!.email,
    role: req.user!.role,
  });
  res.json(updated);
});

// POST /api/admin/reset-demo-data (Helpful for test evaluations)
adminRouter.post('/reset-demo-data', authenticateToken, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response): void => {
  db.resetToSeed();
  db.logAudit({
    user_id: req.user!.id,
    user_email: req.user!.email,
    user_role: req.user!.role,
    action: 'Reset Database to Seed State',
    module: 'Settings',
    details: 'System restored to initial clean sample dataset.',
  });
  res.json({ message: 'Database reset to initial seed data.' });
});
