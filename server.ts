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

async function startServer() {
  const app = express();
  const PORT = 3000;

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
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', app: 'Makati Medical Center', hospital: 'Makati Med', timestamp: new Date().toISOString() });
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
  if (process.env.NODE_ENV !== 'production') {
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

startServer().catch((err) => {
  console.error('[MediQueue] Failed to start server:', err);
});
