import { Router, Request, Response } from 'express';
import { adminDb } from '../lib/firebase-admin';
import { hashPassword, verifyPassword, createToken, removeToken, authenticateToken, AuthenticatedRequest } from '../auth';

const db = adminDb;
export const authRouter = Router();

// Helper to find user by email in Firestore
async function findUserByEmail(email: string) {
  const snapshot = await db.collection('users').where('email', '==', email.toLowerCase()).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as any;
}

// POST /api/auth/register
authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      first_name,
      last_name,
      email,
      contact_number,
      date_of_birth,
      sex,
      address,
      password,
      confirm_password,
    } = req.body;

    if (!first_name?.trim() || !last_name?.trim() || !email?.trim() || !password) {
      res.status(400).json({ error: 'Please complete all required fields.' });
      return;
    }

    if (password !== confirm_password) {
      res.status(400).json({ error: 'Password confirmation does not match.' });
      return;
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      res.status(400).json({ error: 'An account with this email already exists.' });
      return;
    }

    const { hash, salt } = hashPassword(password);
    
    // Create User in Firestore
    const userRef = await db.collection('users').add({
      email: email.trim().toLowerCase(),
      role: 'PATIENT',
      password_hash: hash,
      salt,
      is_active: true,
      created_at: new Date().toISOString()
    });

    // Create Patient record
    const patientRef = await db.collection('patients').add({
      user_id: userRef.id,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email.trim().toLowerCase(),
      contact_number: contact_number.trim(),
      date_of_birth,
      sex,
      address: address.trim(),
      is_active: true,
    });

    const newUser = { id: userRef.id, email, role: 'PATIENT', is_active: true };
    const token = await createToken(newUser as any);

    res.status(201).json({
      message: 'Account registered successfully.',
      token,
      user: newUser,
      patient: { id: patientRef.id, user_id: userRef.id, first_name, last_name }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = await findUserByEmail(email.trim());
    if (!user) {
      res.status(401).json({ error: 'Email or password is incorrect.' });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ error: 'This account has been deactivated.' });
      return;
    }

    const isValid = verifyPassword(password, user.password_hash, user.salt);
    if (!isValid) {
      res.status(401).json({ error: 'Email or password is incorrect.' });
      return;
    }

    const token = await createToken(user);
    
    let patient = null;
    let doctor = null;

    if (user.role === 'PATIENT') {
      const pSnap = await db.collection('patients').where('user_id', '==', user.id).get();
      if (!pSnap.empty) patient = { id: pSnap.docs[0].id, ...pSnap.docs[0].data() };
    } else if (user.role === 'DOCTOR') {
      const dSnap = await db.collection('doctors').where('user_id', '==', user.id).get();
      if (!dSnap.empty) doctor = { id: dSnap.docs[0].id, ...dSnap.docs[0].data() };
    }

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, is_active: user.is_active },
      patient,
      doctor
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

authRouter.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (token) await removeToken(token);
  res.json({ message: 'Logged out successfully.' });
});

authRouter.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  let patient = null;
  let doctor = null;

  if (user.role === 'PATIENT') {
    const pSnap = await db.collection('patients').where('user_id', '==', user.id).get();
    if (!pSnap.empty) patient = { id: pSnap.docs[0].id, ...pSnap.docs[0].data() };
  } else if (user.role === 'DOCTOR') {
    const dSnap = await db.collection('doctors').where('user_id', '==', user.id).get();
    if (!dSnap.empty) doctor = { id: dSnap.docs[0].id, ...dSnap.docs[0].data() };
  }

  res.json({ user, patient, doctor });
});

