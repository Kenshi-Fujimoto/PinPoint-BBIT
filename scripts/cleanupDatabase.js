import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

console.log('Connecting to Firestore project:', firebaseConfig.projectId);

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Firebase configuration missing in .env');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanCollection(colName) {
  const colRef = collection(db, colName);
  const snapshot = await getDocs(colRef);
  console.log(`Found ${snapshot.size} documents in collection "${colName}".`);
  for (const docSnap of snapshot.docs) {
    console.log(` - Deleting doc ID: ${docSnap.id} ("${docSnap.data().title || 'Untitled'}")`);
    await deleteDoc(doc(db, colName, docSnap.id));
  }
  console.log(`Collection "${colName}" is now empty.`);
}

async function run() {
  await cleanCollection('civic_issues');
  await cleanCollection('lost_found_items');
  console.log('✅ All example datasets successfully deleted from Firestore database.');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Error during Firestore cleanup:', err);
  process.exit(1);
});
