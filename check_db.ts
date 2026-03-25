import Database from "better-sqlite3";
const db = new Database("database.db");
const tables = ["users", "customers", "customer_users", "equipment", "select_care", "news", "support_tickets"];
for (const table of tables) {
  try {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get().count;
    console.log(`${table}: ${count}`);
  } catch (e) {
    console.log(`${table}: table not found`);
  }
}
