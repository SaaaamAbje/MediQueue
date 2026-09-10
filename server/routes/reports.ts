import { Router, Response } from 'express';
import { db } from '../db/store';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../auth';

export const reportsRouter = Router();

// Reports are restricted to Admin & Doctor roles
reportsRouter.use(authenticateToken, requireRoles('ADMIN', 'DOCTOR'));

// GET /api/reports/daily-appointments?date=YYYY-MM-DD
reportsRouter.get('/daily-appointments', (req: AuthenticatedRequest, res: Response): void => {
  const dateStr = req.query.date as string;
  const report = db.getDailyAppointmentReport(dateStr);
  res.json(report);
});

// GET /api/reports/daily-queue?date=YYYY-MM-DD
reportsRouter.get('/daily-queue', (req: AuthenticatedRequest, res: Response): void => {
  const dateStr = req.query.date as string;
  const report = db.getDailyQueueReport(dateStr);
  res.json(report);
});

// GET /api/reports/doctor-performance
reportsRouter.get('/doctor-performance', (_req: AuthenticatedRequest, res: Response): void => {
  const report = db.getDoctorPerformanceReport();
  res.json(report);
});

// GET /api/reports/appointment-stats
reportsRouter.get('/appointment-stats', (_req: AuthenticatedRequest, res: Response): void => {
  const stats = db.getAppointmentStatistics();
  res.json(stats);
});
