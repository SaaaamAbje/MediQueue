import { Router, Request, Response } from 'express';
import { db } from '../db/store';
import { hashPassword, verifyPassword, createToken, removeToken, authenticateToken, AuthenticatedRequest } from '../auth';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', (req: Request, res: Response): void => {
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

    // 1. Required fields check
    if (
      !first_name?.trim() ||
      !last_name?.trim() ||
      !email?.trim() ||
      !contact_number?.trim() ||
      !date_of_birth ||
      !sex ||
      !address?.trim() ||
      !password ||
      !confirm_password
    ) {
      res.status(400).json({ error: 'Please complete all required fields.' });
      return;
    }

    // 2. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    // 3. Password match & length
    if (password !== confirm_password) {
      res.status(400).json({ error: 'Password confirmation does not match.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    // 4. Check uniqueness
    const existing = db.findUserByEmail(email);
    if (existing) {
      res.status(400).json({ error: 'An account with this email already exists.' });
      return;
    }

    // 5. Hash password
    const { hash, salt } = hashPassword(password);

    // 6. Create User
    const newUser = db.createUser({
      email: email.trim().toLowerCase(),
      role: 'PATIENT',
      password_hash: hash,
      salt,
    });

    // 7. Create Patient record
    const patient = db.createPatient({
      user_id: newUser.id,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email.trim().toLowerCase(),
      contact_number: contact_number.trim(),
      date_of_birth,
      sex,
      address: address.trim(),
      is_active: true,
    });

    // 8. Log audit
    db.logAudit({
      user_id: newUser.id,
      user_email: newUser.email,
      user_role: 'PATIENT',
      action: 'Registered Account',
      module: 'Authentication',
      record_id: patient.id,
      details: `New patient account created for ${patient.first_name} ${patient.last_name}.`,
    });

    // 9. Create session token
    const token = createToken(newUser);

    res.status(201).json({
      message: 'Account registered successfully.',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        is_active: newUser.is_active,
      },
      patient,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// POST /api/auth/login
authRouter.post('/login', (req: Request, res: Response): void => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = db.findUserByEmail(email.trim());
    if (!user) {
      res.status(401).json({ error: 'Email or password is incorrect.' });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ error: 'This account has been deactivated. Please contact the clinic.' });
      return;
    }

    const isValid = verifyPassword(password, user.password_hash, user.salt);
    if (!isValid) {
      res.status(401).json({ error: 'Email or password is incorrect.' });
      return;
    }

    const token = createToken(user);

    let patient = undefined;
    let doctor = undefined;

    if (user.role === 'PATIENT') {
      patient = db.getPatientByUserId(user.id);
    } else if (user.role === 'DOCTOR') {
      doctor = db.getDoctorByUserId(user.id);
    }

    db.logAudit({
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      action: 'Login',
      module: 'Authentication',
      details: `User ${user.email} logged in successfully.`,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
      },
      patient,
      doctor,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (token) {
    removeToken(token);
  }
  res.json({ message: 'Logged out successfully.' });
});

// GET /api/auth/me
authRouter.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  let patient = undefined;
  let doctor = undefined;

  if (user.role === 'PATIENT') {
    patient = db.getPatientByUserId(user.id);
  } else if (user.role === 'DOCTOR') {
    doctor = db.getDoctorByUserId(user.id);
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    },
    patient,
    doctor,
  });
});

// POST /api/auth/forgot-password
authRouter.post('/forgot-password', (req: Request, res: Response): void => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email address is required.' });
    return;
  }
  const user = db.findUserByEmail(email);
  if (!user) {
    // For security, give generic friendly response
    res.json({ message: 'If that email is registered, password reset instructions have been dispatched.' });
    return;
  }

  // Simulated reset code
  res.json({
    message: 'Password reset code has been sent.',
    reset_hint: 'Use reset password code: MQ-RESET-2026',
  });
});

// POST /api/auth/reset-password
authRouter.post('/reset-password', (req: Request, res: Response): void => {
  const { email, reset_code, new_password, confirm_password } = req.body;

  if (!email || !reset_code || !new_password || !confirm_password) {
    res.status(400).json({ error: 'Please provide all reset fields.' });
    return;
  }

  if (new_password !== confirm_password) {
    res.status(400).json({ error: 'Passwords do not match.' });
    return;
  }

  if (new_password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return;
  }

  const user = db.findUserByEmail(email);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const { hash, salt } = hashPassword(new_password);
  db.updateUserPassword(user.id, hash, salt);

  db.logAudit({
    user_id: user.id,
    user_email: user.email,
    user_role: user.role,
    action: 'Reset Password',
    module: 'Authentication',
    details: `Password reset successfully for ${user.email}.`,
  });

  res.json({ message: 'Password reset successfully. You can now log in.' });
});

// POST /api/auth/quick-switch (Allows instant evaluation switcher)
authRouter.post('/quick-switch', (req: Request, res: Response): void => {
  const { role, email } = req.body;
  let targetEmail = email;

  if (!targetEmail) {
    if (role === 'ADMIN') targetEmail = 'admin@mediqueue.ph';
    else if (role === 'DOCTOR') targetEmail = 'dr.santos@mediqueue.ph';
    else targetEmail = 'juan.delacruz@example.ph';
  }

  const user = db.findUserByEmail(targetEmail);
  if (!user) {
    res.status(404).json({ error: 'Demo user not found.' });
    return;
  }

  const token = createToken(user);
  let patient = undefined;
  let doctor = undefined;

  if (user.role === 'PATIENT') {
    patient = db.getPatientByUserId(user.id);
  } else if (user.role === 'DOCTOR') {
    doctor = db.getDoctorByUserId(user.id);
  }

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    },
    patient,
    doctor,
  });
});
