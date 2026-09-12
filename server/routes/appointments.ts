import { Router, Response } from 'express';
import { db } from '../db/store';
import { authenticateToken, requireRoles, AuthenticatedRequest } from '../auth';

export const appointmentsRouter = Router();

// GET /api/appointments
appointmentsRouter.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  let { patientId, doctorId, date, status, search } = req.query as {
    patientId?: string;
    doctorId?: string;
    date?: string;
    status?: string;
    search?: string;
  };

  // If patient, restrict to their own appointments
  if (user.role === 'PATIENT') {
    const patient = await db.getPatientByUserId(user.id);
    if (!patient) {
      res.json([]);
      return;
    }
    patientId = patient.id;
  } else if (user.role === 'DOCTOR' && !doctorId) {
    // If doctor, default to their appointments
    const doctor = await db.getDoctorByUserId(user.id);
    if (doctor) {
      doctorId = doctor.id;
    }
  }

  const list = await db.getAppointments({ patientId, doctorId, date, status, search });
  res.json(list);
});

// GET /api/appointments/:id
appointmentsRouter.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const apt = await db.getAppointmentById(req.params.id);
  if (!apt) {
    res.status(404).json({ error: 'Appointment not found.' });
    return;
  }

  // Check ownership if patient
  if (req.user!.role === 'PATIENT') {
    const patient = await db.getPatientByUserId(req.user!.id);
    if (!patient || patient.id !== apt.patient_id) {
      res.status(403).json({ error: 'Unauthorized to view this appointment.' });
      return;
    }
  }

  res.json(apt);
});

// POST /api/appointments/book
appointmentsRouter.post('/book', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    let { patient_id, doctor_id, appointment_date, time_slot, reason_for_consultation, schedule_id } = req.body;

    if (!doctor_id || !appointment_date || !time_slot || !reason_for_consultation?.trim()) {
      res.status(400).json({ error: 'Please provide doctor, date, time slot, and consultation reason.' });
      return;
    }

    // Determine patient ID
    if (user.role === 'PATIENT') {
      const patient = await db.getPatientByUserId(user.id);
      if (!patient) {
        res.status(400).json({ error: 'Patient profile not found for current user.' });
        return;
      }
      patient_id = patient.id;
    } else if (!patient_id) {
      res.status(400).json({ error: 'Please specify the patient for whom you are booking.' });
      return;
    }

    const result = await db.createAppointment({
      patient_id,
      doctor_id,
      appointment_date,
      time_slot,
      reason_for_consultation: reason_for_consultation.trim(),
      schedule_id,
    });

    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json({
      message: 'Appointment successfully booked!',
      appointment: result.appointment,
    });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Failed to process appointment booking.' });
  }
});

// POST /api/appointments/:id/cancel
appointmentsRouter.post('/:id/cancel', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const apt = await db.getAppointmentById(req.params.id);
  if (!apt) {
    res.status(404).json({ error: 'Appointment not found.' });
    return;
  }

  // If patient, make sure it's their appointment
  if (user.role === 'PATIENT') {
    const patient = await db.getPatientByUserId(user.id);
    if (!patient || patient.id !== apt.patient_id) {
      res.status(403).json({ error: 'You do not have permission to cancel this appointment.' });
      return;
    }
  }

  const { reason } = req.body;
  const result = await db.cancelAppointment(apt.id, reason, {
    id: user.id,
    email: user.email,
    role: user.role,
  });

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({ message: 'Appointment cancelled successfully.' });
});

// PATCH /api/appointments/:id/status (Staff/Admin override)
appointmentsRouter.patch('/:id/status', authenticateToken, requireRoles('ADMIN', 'DOCTOR'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { status } = req.body;
  if (!status) {
    res.status(400).json({ error: 'Status is required.' });
    return;
  }

  const result = await db.updateAppointmentStatus(req.params.id, status, {
    id: req.user!.id,
    email: req.user!.email,
    role: req.user!.role,
  });

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({ message: 'Appointment status updated.', appointment: result.appointment });
});

// POST /api/appointments/:id/reschedule
appointmentsRouter.post('/:id/reschedule', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { new_date, new_time_slot } = req.body;

  if (!new_date || !new_time_slot) {
    res.status(400).json({ error: 'Please provide new date and time slot.' });
    return;
  }

  const apt = await db.getAppointmentById(req.params.id);
  if (!apt) {
    res.status(404).json({ error: 'Appointment not found.' });
    return;
  }

  if (user.role === 'PATIENT') {
    const patient = await db.getPatientByUserId(user.id);
    if (!patient || patient.id !== apt.patient_id) {
      res.status(403).json({ error: 'Unauthorized to reschedule this appointment.' });
      return;
    }
  }

  const result = await db.rescheduleAppointment(apt.id, new_date, new_time_slot, {
    id: user.id,
    email: user.email,
    role: user.role,
  });

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({ message: 'Appointment rescheduled successfully.', appointment: result.appointment });
});
