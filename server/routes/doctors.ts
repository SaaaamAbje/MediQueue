import { Router, Response } from 'express';
import { db } from '../db/store';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../auth';

export const doctorsRouter = Router();

// GET /api/doctors/specializations
doctorsRouter.get('/specializations', (_req, res: Response): void => {
  res.json(db.getSpecializations());
});

// GET /api/doctors
doctorsRouter.get('/', (req, res: Response): void => {
  const { specializationId, status, search } = req.query as {
    specializationId?: string;
    status?: string;
    search?: string;
  };
  const doctors = db.getDoctors({ specializationId, status, search });
  res.json(doctors);
});

// GET /api/doctors/:id
doctorsRouter.get('/:id', (req, res: Response): void => {
  const doctor = db.getDoctorById(req.params.id);
  if (!doctor) {
    res.status(404).json({ error: 'Doctor not found.' });
    return;
  }
  res.json(doctor);
});

// GET /api/doctors/:id/schedules
doctorsRouter.get('/:id/schedules', (req, res: Response): void => {
  const schedules = db.getDoctorSchedules(req.params.id);
  res.json(schedules);
});

// GET /api/doctors/:id/available-slots?date=YYYY-MM-DD
doctorsRouter.get('/:id/available-slots', (req, res: Response): void => {
  const doctorId = req.params.id;
  const dateStr = req.query.date as string;

  if (!dateStr) {
    res.status(400).json({ error: 'Date query parameter is required (YYYY-MM-DD).' });
    return;
  }

  const result = db.getAvailableSlots(doctorId, dateStr);
  res.json(result);
});

// POST /api/doctors (Admin only)
doctorsRouter.post('/', authenticateToken, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const {
      first_name,
      last_name,
      email,
      contact_number,
      specialization_id,
      license_number,
      room_number,
      status,
    } = req.body;

    if (!first_name || !last_name || !email || !specialization_id || !license_number) {
      res.status(400).json({ error: 'Please provide all required doctor fields.' });
      return;
    }

    const specialization = db.getSpecializations().find((s) => s.id === specialization_id);
    if (!specialization) {
      res.status(400).json({ error: 'Invalid specialization selected.' });
      return;
    }

    // Check if user account already exists or create new user
    let user = db.findUserByEmail(email);
    if (!user) {
      user = db.createUser({
        email,
        role: 'DOCTOR',
        password_hash: 'default',
        salt: 'default',
      });
    }

    const doctor = db.createDoctor({
      user_id: user.id,
      first_name,
      last_name,
      email,
      contact_number: contact_number || '',
      specialization_id,
      specialization_name: specialization.name,
      license_number,
      room_number: room_number || 'Room 101',
      status: status || 'Active',
    });

    db.logAudit({
      user_id: req.user!.id,
      user_email: req.user!.email,
      user_role: req.user!.role,
      action: 'Created Doctor Record',
      module: 'Doctors',
      record_id: doctor.id,
      details: `Added new doctor Dr. ${doctor.first_name} ${doctor.last_name} (${doctor.specialization_name}).`,
    });

    res.status(201).json(doctor);
  } catch (err) {
    console.error('Create doctor error:', err);
    res.status(500).json({ error: 'Failed to create doctor.' });
  }
});

// PATCH /api/doctors/:id (Admin only)
doctorsRouter.patch('/:id', authenticateToken, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response): void => {
  const updated = db.updateDoctor(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Doctor not found.' });
    return;
  }

  db.logAudit({
    user_id: req.user!.id,
    user_email: req.user!.email,
    user_role: req.user!.role,
    action: 'Updated Doctor Record',
    module: 'Doctors',
    record_id: updated.id,
    details: `Updated profile details for Dr. ${updated.first_name} ${updated.last_name}.`,
  });

  res.json(updated);
});

// POST /api/doctors/:id/toggle-status (Admin only)
doctorsRouter.post('/:id/toggle-status', authenticateToken, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response): void => {
  const doctor = db.getDoctorById(req.params.id);
  if (!doctor) {
    res.status(404).json({ error: 'Doctor not found.' });
    return;
  }

  const nextStatus = doctor.status === 'Active' ? 'Inactive' : 'Active';
  const updated = db.updateDoctor(doctor.id, { status: nextStatus });

  db.logAudit({
    user_id: req.user!.id,
    user_email: req.user!.email,
    user_role: req.user!.role,
    action: 'Toggled Doctor Status',
    module: 'Doctors',
    record_id: doctor.id,
    details: `Set status of Dr. ${doctor.last_name} to ${nextStatus}.`,
  });

  res.json(updated);
});

// GET /api/schedules
doctorsRouter.get('/schedules/all', authenticateToken, requireRoles('ADMIN', 'DOCTOR'), (_req, res: Response): void => {
  res.json(db.getDoctorSchedules());
});

// POST /api/schedules (Admin only)
doctorsRouter.post('/schedules/create', authenticateToken, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response): void => {
  const { doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, max_patients_per_slot } = req.body;

  if (!doctor_id || !day_of_week || !start_time || !end_time) {
    res.status(400).json({ error: 'Please provide doctor, day of week, and start/end times.' });
    return;
  }

  const newSchedule = db.createDoctorSchedule({
    doctor_id,
    day_of_week,
    start_time,
    end_time,
    slot_duration_minutes: Number(slot_duration_minutes) || 30,
    max_patients_per_slot: Number(max_patients_per_slot) || 1,
    status: 'Active',
  });

  const doctor = db.getDoctorById(doctor_id);

  db.logAudit({
    user_id: req.user!.id,
    user_email: req.user!.email,
    user_role: req.user!.role,
    action: 'Created Doctor Schedule',
    module: 'Schedules',
    record_id: newSchedule.id,
    details: `Added ${day_of_week} ${start_time}-${end_time} schedule for Dr. ${doctor?.last_name}.`,
  });

  res.status(201).json(newSchedule);
});

// PATCH /api/schedules/:id
doctorsRouter.patch('/schedules/:id', authenticateToken, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response): void => {
  const updated = db.updateDoctorSchedule(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Schedule not found.' });
    return;
  }

  db.logAudit({
    user_id: req.user!.id,
    user_email: req.user!.email,
    user_role: req.user!.role,
    action: 'Updated Doctor Schedule',
    module: 'Schedules',
    record_id: updated.id,
    details: `Updated schedule #${updated.id}.`,
  });

  res.json(updated);
});

// DELETE /api/schedules/:id
doctorsRouter.delete('/schedules/:id', authenticateToken, requireRoles('ADMIN'), (req: AuthenticatedRequest, res: Response): void => {
  const success = db.deleteDoctorSchedule(req.params.id);
  if (!success) {
    res.status(404).json({ error: 'Schedule not found.' });
    return;
  }

  db.logAudit({
    user_id: req.user!.id,
    user_email: req.user!.email,
    user_role: req.user!.role,
    action: 'Deleted Doctor Schedule',
    module: 'Schedules',
    record_id: req.params.id,
    details: `Deleted schedule #${req.params.id}.`,
  });

  res.json({ message: 'Schedule deleted successfully.' });
});
