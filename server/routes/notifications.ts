import { Router, Response } from 'express';
import { db } from '../db/store';
import { authenticateToken, AuthenticatedRequest } from '../auth';

export const notificationsRouter = Router();

// GET /api/notifications
notificationsRouter.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const list = db.getNotifications(req.user!.id);
  res.json(list);
});

// POST /api/notifications/:id/read
notificationsRouter.post('/:id/read', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const success = db.markNotificationRead(req.params.id, req.user!.id);
  res.json({ success });
});

// POST /api/notifications/read-all
notificationsRouter.post('/read-all', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  db.markAllNotificationsRead(req.user!.id);
  res.json({ success: true });
});
