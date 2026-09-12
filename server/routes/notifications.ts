import { Router, Response } from 'express';
import { db } from '../db/store';
import { authenticateToken, AuthenticatedRequest } from '../auth';

export const notificationsRouter = Router();

// GET /api/notifications
notificationsRouter.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const list = await db.getNotifications(req.user!.id);
  res.json(list);
});

// POST /api/notifications/:id/read
notificationsRouter.post('/:id/read', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const success = await db.markNotificationRead(req.params.id, req.user!.id);
  res.json({ success });
});

// POST /api/notifications/read-all
notificationsRouter.post('/read-all', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await db.markAllNotificationsRead(req.user!.id);
  res.json({ success: true });
});
