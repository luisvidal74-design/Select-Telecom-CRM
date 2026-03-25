import Database from "better-sqlite3";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

const db = new Database("database.db");
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function migrate() {
  console.log("Starting migration from SQLite to Firestore...");

  const tables = [
    "users", "customers", "customer_users", "brands", "models", "colors", "memories", 
    "equipment", "select_care", "news", "driving_logs", "contracts", "contract_files", 
    "contract_companies", "calendar_events", "select_care_logs", "support_tickets", 
    "support_ticket_logs", "it_brands", "it_models", "it_memory", "it_purchase_places", 
    "it_equipment", "o365_license_types", "o365_licenses", "select_care_history"
  ];

  for (const table of tables) {
    console.log(`Migrating table: ${table}...`);
    const rows = db.prepare(`SELECT * FROM ${table}`).all();
    
    for (const row of rows) {
      const { id, ...data } = row;
      // Convert SQLite 0/1 to boolean for Firestore
      if (table === 'users') {
        data.isAdmin = !!data.isAdmin;
        data.isSupport = !!data.isSupport;
      }
      if (table === 'customer_users') {
        data.isAuthorizedBuyer = !!data.isAuthorizedBuyer;
        data.isDrivingLogAdmin = !!data.isDrivingLogAdmin;
      }
      
      // Use the SQLite ID as the Firestore document ID to maintain relationships
      await setDoc(doc(firestore, table, id.toString()), data);
    }
    console.log(`Migrated ${rows.length} rows from ${table}.`);
  }

  console.log("Migration complete!");
}

migrate().catch(console.error);
