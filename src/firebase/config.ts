import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence, 
  indexedDBLocalPersistence 
} from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  memoryLocalCache, 
  getFirestore,
  setLogLevel,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Enable secure local persistence for cross-device / multi-tab authentication synchronization
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence)
    .catch((err) => {
      // Fall back to indexedDBLocalPersistence if browserLocalPersistence encounters environment restrictions
      console.warn('[Firebase Auth] Primary persistence warning, attempting fallback:', err?.message || err);
      return setPersistence(auth, indexedDBLocalPersistence).catch((fallbackErr) => {
        console.warn('[Firebase Auth] Fallback persistence warning:', fallbackErr?.message || fallbackErr);
      });
    });
}

// Suppress benign internal SDK warnings
setLogLevel('error');

let firestoreDb;
try {
  // Use persistentLocalCache with persistentMultipleTabManager for real-time cross-tab and cross-device sync
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  }, firebaseConfigData.firestoreDatabaseId);
} catch (cacheErr) {
  console.warn('[Firestore] Multi-tab persistent cache fallback to memory/default:', cacheErr);
  try {
    firestoreDb = initializeFirestore(app, {
      localCache: memoryLocalCache(),
    }, firebaseConfigData.firestoreDatabaseId);
  } catch {
    firestoreDb = getFirestore(app, firebaseConfigData.firestoreDatabaseId);
  }
}

export const db = firestoreDb;

// Test Firestore connection on boot (as specified in Firebase integration guidelines)
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firestore] The client is offline or connection failed.');
    }
    return false;
  }
}

// Fire connection test in background
if (typeof window !== 'undefined') {
  testConnection().catch(() => {});
}

export default app;

