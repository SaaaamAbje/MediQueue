import { Router, Response } from 'express';
import { db } from '../db/store';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../auth';

export const reportsRouter = Router();

// Reports are restricted to Admin & Doctor roles
reportsRouter.use(authenticateToken, requireRoles('ADMIN', 'DOCTOR'));

// GET /api/reports/daily-appointments?date=YYYY-MM-DD
reportsRouter.get('/daily-appointments', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const dateStr = req.query.date as string;
  const report = await db.getDailyAppointmentReport(dateStr);
  res.json(report);
});

// GET /api/reports/daily-queue?date=YYYY-MM-DD
reportsRouter.get('/daily-queue', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const dateStr = req.query.date as string;
  const report = await db.getDailyQueueReport(dateStr);
  res.json(report);
});

// GET /api/reports/doctor-performance
reportsRouter.get('/doctor-performance', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const report = await db.getDoctorPerformanceReport();
  res.json(report);
});

// GET /api/reports/appointment-stats
reportsRouter.get('/appointment-stats', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const stats = await db.getAppointmentStatistics();
  res.json(stats);
});
