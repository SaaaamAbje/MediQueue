import { Router } from 'express';
import { db } from '../db/store';

export const displayRouter = Router();

// Public TV Board Display Data (No authentication required so lobby monitors/smart TVs can mount without login)
displayRouter.get('/board', async (_req, res) => {
  try {
    const data = await db.getPublicDisplayData();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
