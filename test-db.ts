import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function test() {
  const projectId = 'gen-lang-client-0789358824';
  const databaseId = 'ai-studio-mediqueueclinica-a891fdad-9279-4a52-81b5-369f0b76edac';
  console.log('Testing project:', projectId, 'DB:', databaseId);
  const app = initializeApp({ projectId });
  const db = getFirestore(app, databaseId);

  try {
    console.log('Attempting to read...');
    const collections = await db.listCollections();
    console.log('Collections:', collections.map(c => c.id));
  } catch (err) {
    console.error('Error:', err);
  }
}

test().catch(console.error);
