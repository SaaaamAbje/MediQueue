import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

let app: App;

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let projectId = 'gen-lang-client-0789358824';
let databaseId = 'ai-studio-mediqueueclinica-a891fdad-9279-4a52-81b5-369f0b76edac';

if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  projectId = config.projectId || projectId;
  databaseId = config.firestoreDatabaseId || databaseId;
}

if (getApps().length === 0) {
  app = initializeApp({
    projectId: projectId,
  });
} else {
  app = getApps()[0];
}

export const adminDb: Firestore = getFirestore(app, databaseId);
export const adminAuth: Auth = getAuth(app);
