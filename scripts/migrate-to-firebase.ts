import { adminDb } from '../server/lib/firebase-admin';
import { getInitialSeedData } from '../server/db/seed';

const db = adminDb;

async function migrate() {
  const seed = getInitialSeedData();
  console.log(`Starting migration to Firestore...`);

  const collections = [
    { name: 'users', data: seed.users },
    { name: 'patients', data: seed.patients },
    { name: 'doctors', data: seed.doctors },
    { name: 'doctor_schedules', data: seed.doctor_schedules },
    { name: 'specializations', data: seed.specializations },
    { name: 'appointments', data: seed.appointments },
    { name: 'queue', data: seed.queue },
    { name: 'consultations', data: seed.consultations },
    { name: 'audit_logs', data: seed.audit_logs },
    { name: 'notifications', data: seed.notifications },
    { name: 'settings', data: [seed.clinic_settings] }, // Fixed name to 'settings' for consistency with store.ts
    { name: 'vital_signs', data: seed.vital_signs },
    { name: 'lab_orders', data: seed.lab_orders },
    { name: 'lab_results', data: seed.lab_results },
    { name: 'invoices', data: seed.billing_invoices }, // Fixed name to 'invoices' for consistency with store.ts
    { name: 'pharmacy_items', data: seed.pharmacy_items },
    { name: 'clinic_branches', data: seed.clinic_branches },
    { name: 'medical_certificates', data: seed.medical_certificates },
    { name: 'doctor_referrals', data: seed.doctor_referrals },
  ];

  for (const col of collections) {
    if (!col.data || col.data.length === 0) continue;
    console.log(`Migrating ${col.name} (${col.data.length} items)...`);
    
    // Batch limit is 500
    const chunks = [];
    for (let i = 0; i < col.data.length; i += 500) {
      chunks.push(col.data.slice(i, i + 500));
    }

    for (const chunk of chunks) {
      const batch = db.batch();
      for (const item of chunk) {
        // Use id as document ID if it exists, otherwise auto-generate
        // For settings, we use 'clinic' as ID
        let docId = (item as any).id || (item as any).email || undefined;
        if (col.name === 'settings') docId = 'clinic';
        
        const ref = docId ? db.collection(col.name).doc(String(docId)) : db.collection(col.name).doc();
        batch.set(ref, item);
      }
      await batch.commit();
    }
  }

  console.log('Migration complete!');
}

migrate().catch(err => {
  console.error('Migration failed:');
  console.error(err);
  process.exit(1);
});
