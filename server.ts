import express from 'express';
import 'express-async-errors';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

import { createServer as createViteServer } from 'vite';
import fs from 'fs';

// Check for firebase credentials in local development
if (process.env.NODE_ENV !== 'production') {
  const saPath = path.join(process.cwd(), 'service-account.json');
  if (!fs.existsSync(saPath) && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn('\n' + '!'.repeat(50));
    console.warn('⚠️  LOCAL DEVELOPMENT WARNING: Firebase Key Missing');
    console.warn('The application will start, but database features will fail.');
    console.warn('To fix, save your service account JSON as "service-account.json"');
    console.warn('in this folder: ' + process.cwd());
    console.warn('!'.repeat(50) + '\n');
  }
}

import { authRouter } from './server/routes/auth';
import { doctorsRouter } from './server/routes/doctors';
import { appointmentsRouter } from './server/routes/appointments';
import { queueRouter } from './server/routes/queue';
import { consultationsRouter } from './server/routes/consultations';
import { patientsRouter } from './server/routes/patients';
import { reportsRouter } from './server/routes/reports';
import { adminRouter } from './server/routes/admin';
import { notificationsRouter } from './server/routes/notifications';
import { clinicalRouter } from './server/routes/clinical';
import { billingRouter } from './server/routes/billing';
import { displayRouter } from './server/routes/display';
import { pharmacyRouter } from './server/routes/pharmacy';
import { labtechRouter } from './server/routes/labtech';
import { smsRouter } from './server/routes/sms';
import { telemedRouter } from './server/routes/telemed';
import { branchesRouter } from './server/routes/branches';
import { db } from './server/db/store';
import { getInitialSeedData } from './server/db/seed';

export async function createExpressApp() {
  const app = express();

  // Auto-seed check for Firestore
  try {
    const users = await db.getUsers();
    console.log(`[MediQueue] Current users count: ${users.length}`);
    if (users.length === 0) {
      console.log('[MediQueue] Firestore empty. Seeding initial data...');
      const seed = getInitialSeedData();
      await db.seedDatabase(seed);
      console.log('[MediQueue] Firestore seeded successfully.');
    }
  } catch (err) {
    console.error('[MediQueue] Firestore auto-seed check failed:', err);
  }

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/api/health', async (_req, res) => {
    let dbStatus = 'disconnected';
    try {
      await db.getUsers();
      dbStatus = 'connected';
    } catch (err: any) {
      dbStatus = `error: ${err.message}`;
    }
    res.json({ 
      status: 'ok', 
      app: 'Makati Medical Center', 
      database: dbStatus,
      env: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
      timestamp: new Date().toISOString() 
    });
  });

  // Admin & Debug Routes
  app.post('/api/admin/force-seed', async (_req, res) => {
    try {
      console.log('[MediQueue] Manual force-seed triggered...');
      const seed = getInitialSeedData();
      await db.seedDatabase(seed);
      res.json({ message: 'Database seeded successfully.' });
    } catch (err: any) {
      console.error('[MediQueue] Force-seed failed:', err);
      res.status(500).json({ error: `Seeding failed: ${err.message}` });
    }
  });

  // RESTful API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/doctors', doctorsRouter);
  app.use('/api/appointments', appointmentsRouter);
  app.use('/api/queue', queueRouter);
  app.use('/api/consultations', consultationsRouter);
  app.use('/api/patients', patientsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/clinical', clinicalRouter);
  app.use('/api/billing', billingRouter);
  app.use('/api/display', displayRouter);
  app.use('/api/pharmacy', pharmacyRouter);
  app.use('/api/labtech', labtechRouter);
  app.use('/api/sms', smsRouter);
  app.use('/api/telemed', telemedRouter);
  app.use('/api/branches', branchesRouter);

  // Vite integration
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false 
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

async function startServer() {
  const app = await createExpressApp();
  const PORT = 3000;

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MediQueue] Server running at http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[MediQueue] Port ${PORT} is already in use. Please wait or kill the process.`);
    } else {
      console.error('[MediQueue] Server error:', err);
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}` || !process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('[MediQueue] Failed to start server:', err);
  });
}
