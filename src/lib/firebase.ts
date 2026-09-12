import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBuqpcC5YhkFkavK7cqjm5ody0XkqLP7AY",
  authDomain: "gen-lang-client-0789358824.firebaseapp.com",
  projectId: "gen-lang-client-0789358824",
  storageBucket: "gen-lang-client-0789358824.firebasestorage.app",
  messagingSenderId: "157110394465",
  appId: "1:157110394465:web:cf016d07820098bc509420"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
