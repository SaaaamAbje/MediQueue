import { Router } from 'express';
import { db } from '../db/store';
import { authenticateToken } from '../auth';

export const billingRouter = Router();

// Get all invoices with optional filtering
billingRouter.get('/invoices', authenticateToken, (req: any, res) => {
  try {
    const { patientId, status } = req.query;
    // If patient role, force patientId to their own ID
    let queryPatientId = patientId;
    if (req.user?.role === 'PATIENT') {
      const patient = db.getPatientByUserId(req.user.id);
      if (patient) queryPatientId = patient.id;
    }

    const invoices = db.getInvoices({
      patientId: queryPatientId as string,
      status: status as string,
    });
    res.json({ invoices });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get invoice by ID
billingRouter.get('/invoices/:id', authenticateToken, (req, res) => {
  try {
    const inv = db.getInvoiceById(req.params.id);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ invoice: inv });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new invoice / billing statement
billingRouter.post('/invoices', authenticateToken, (req: any, res) => {
  try {
    const {
      patient_id,
      doctor_id,
      appointment_id,
      items,
      discount_amount,
      discount_type,
      remarks,
    } = req.body;

    if (!patient_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Patient ID and at least one billable item are required.' });
    }

    const subtotal = items.reduce((sum: number, itm: any) => sum + (Number(itm.total) || Number(itm.quantity * itm.unit_price) || 0), 0);
    const disc = Number(discount_amount) || 0;
    const total = Math.max(0, subtotal - disc);

    const invoice = db.createInvoice(
      {
        patient_id,
        doctor_id,
        appointment_id,
        items,
        subtotal,
        discount_amount: disc,
        discount_type: discount_type || 'None',
        tax_amount: 0,
        total_amount: total,
        status: 'pending',
        amount_paid: 0,
        balance_due: total,
        remarks,
      },
      req.user
    );

    res.status(201).json({ invoice });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Process Payment (Cash, Card, HMO / Insurance Letter of Guarantee)
billingRouter.post('/invoices/:id/pay', authenticateToken, (req: any, res) => {
  try {
    const {
      payment_method,
      amount_paid,
      change_amount,
      qr_payment_ref,
      qr_payment_channel,
      hmo_provider,
      hmo_member_id,
      hmo_approval_code,
      hmo_coverage_amount,
      patient_copay,
      remarks,
      cashier_name,
    } = req.body;

    if (!payment_method) {
      return res.status(400).json({ error: 'Payment method is required.' });
    }

    const updated = db.payInvoice(
      req.params.id,
      {
        payment_method,
        amount_paid: Number(amount_paid) || 0,
        change_amount: change_amount ? Number(change_amount) : 0,
        qr_payment_ref,
        qr_payment_channel,
        hmo_provider,
        hmo_member_id,
        hmo_approval_code,
        hmo_coverage_amount: hmo_coverage_amount ? Number(hmo_coverage_amount) : undefined,
        patient_copay: patient_copay ? Number(patient_copay) : undefined,
        remarks,
        cashier_name: cashier_name || req.user?.email || 'Admin Cashier',
      },
      req.user
    );

    if (!updated) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    res.json({ invoice: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
