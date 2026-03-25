import { initializeApp as initializeAdminApp, applicationDefault } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

// Initialize Firebase Admin for Auth
const adminApp = initializeAdminApp({
  credential: applicationDefault(),
  projectId: firebaseConfig.projectId,
});
const adminAuth = getAdminAuth(adminApp);

// Initialize Firebase Client for Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function migrateUsersToAuth() {
  console.log("Migrating users from Firestore to Firebase Auth...");
  const snapshot = await getDocs(collection(db, 'users'));
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.email && data.password) {
      try {
        // Check if user already exists in Auth
        try {
          await adminAuth.getUserByEmail(data.email);
          console.log(`User ${data.email} already exists in Auth.`);
          continue;
        } catch (e) {
          // User doesn't exist, proceed to create
        }

        const userRecord = await adminAuth.createUser({
          uid: doc.id, // Use Firestore ID as UID
          email: data.email,
          password: data.password,
          displayName: `${data.firstName} ${data.lastName}`,
        });
        console.log(`Successfully created user: ${userRecord.email}`);
      } catch (error) {
        console.error(`Error creating user ${data.email}:`, error);
      }
    }
  }
  console.log("User migration complete!");
}

migrateUsersToAuth().catch(console.error);
