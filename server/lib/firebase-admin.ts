import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

let app: App;

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const serviceAccountPath = path.join(process.cwd(), 'service-account.json');

let projectId = 'gen-lang-client-0789358824';
let databaseId = 'ai-studio-mediqueueclinica-a891fdad-9279-4a52-81b5-369f0b76edac';

if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  projectId = config.projectId || projectId;
  databaseId = config.firestoreDatabaseId || databaseId;
}

let _app: App | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;

function getAppInstance(): App {
  if (_app) return _app;

  if (getApps().length > 0) {
    _app = getApps()[0];
    return _app;
  }

  const options: any = { projectId };
  
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      options.credential = cert(sa);
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable');
    }
  } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.substring(1, privateKey.length - 1);
    }
    options.credential = cert({
      projectId: process.env.FIREBASE_PROJECT_ID || projectId,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    });
  } else if (fs.existsSync(serviceAccountPath)) {
    options.credential = cert(serviceAccountPath);
  }

  _app = initializeApp(options);
  return _app;
}

export const adminDb = new Proxy({} as Firestore, {
  get(_, prop) {
    if (!_db) {
      const appInstance = getAppInstance();
      _db = getFirestore(appInstance, databaseId);
    }
    return (_db as any)[prop];  
  }
});

export const adminAuth = new Proxy({} as Auth, {
  get(_, prop) {
    if (!_auth) {
      const appInstance = getAppInstance();
      _auth = getAuth(appInstance);
    }
    return (_auth as any)[prop];
  }
});
