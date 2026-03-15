import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import multer from "multer";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("database.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT,
    lastName TEXT,
    email TEXT UNIQUE,
    password TEXT,
    phone TEXT,
    role TEXT,
    profilePic TEXT,
    status TEXT DEFAULT 'pending',
    isAdmin INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    orgNumber TEXT,
    address TEXT,
    city TEXT,
    zipCode TEXT,
    contactPerson TEXT,
    contactPhone TEXT,
    contactEmail TEXT,
    responsibleSeller TEXT,
    website TEXT
  );
`);

// Migration: Add contactEmail to customers if it doesn't exist
try {
  db.prepare("ALTER TABLE customers ADD COLUMN contactEmail TEXT").run();
} catch (e) {
  // Column already exists or other error
}

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerId INTEGER,
    firstName TEXT,
    lastName TEXT,
    email TEXT,
    phone TEXT,
    role TEXT,
    office TEXT,
    FOREIGN KEY(customerId) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerId INTEGER,
    userId INTEGER,
    sellerId INTEGER,
    brand TEXT,
    model TEXT,
    color TEXT,
    memory TEXT,
    imei TEXT,
    purchasePlace TEXT,
    orderNumber TEXT,
    purchaseDate TEXT,
    purchasePrice REAL,
    customerPrice REAL,
    FOREIGN KEY(customerId) REFERENCES customers(id),
    FOREIGN KEY(userId) REFERENCES customer_users(id),
    FOREIGN KEY(sellerId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS select_care (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerId INTEGER,
    brand TEXT,
    model TEXT,
    color TEXT,
    memory TEXT,
    imei TEXT,
    purchasePlace TEXT,
    orderNumber TEXT,
    purchaseDate TEXT,
    purchasePrice REAL,
    monthlyFee REAL,
    userId INTEGER,
    contractPeriod INTEGER,
    endDate TEXT,
    siemensContractNumber TEXT,
    FOREIGN KEY(customerId) REFERENCES customers(id),
    FOREIGN KEY(userId) REFERENCES customer_users(id)
  );

  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    imageUrl TEXT,
    authorId INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(authorId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS driving_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerId INTEGER,
    regNo TEXT,
    driverName TEXT,
    email TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customerId) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerId INTEGER,
    type TEXT,
    startDate TEXT,
    contractPeriod INTEGER,
    endDate TEXT,
    sellerId INTEGER,
    customFields TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customerId) REFERENCES customers(id),
    FOREIGN KEY(sellerId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS contract_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contractId INTEGER,
    name TEXT,
    mimeType TEXT,
    data BLOB,
    size INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(contractId) REFERENCES contracts(id)
  );

  CREATE TABLE IF NOT EXISTS calendar_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    startDate TEXT,
    endDate TEXT,
    sellerId INTEGER,
    type TEXT,
    relatedId INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sellerId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS select_care_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    selectCareId INTEGER,
    userId INTEGER,
    fromStatus TEXT,
    toStatus TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY(selectCareId) REFERENCES select_care(id),
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS support_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticketNumber TEXT UNIQUE,
    customerId INTEGER,
    selectCareId INTEGER,
    title TEXT,
    description TEXT,
    status TEXT DEFAULT 'Registrerad',
    priority TEXT DEFAULT 'Normal',
    createdBy INTEGER,
    assignedTo INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customerId) REFERENCES customers(id),
    FOREIGN KEY(selectCareId) REFERENCES select_care(id),
    FOREIGN KEY(createdBy) REFERENCES users(id),
    FOREIGN KEY(assignedTo) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS support_ticket_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticketId INTEGER,
    userId INTEGER,
    action TEXT,
    note TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ticketId) REFERENCES support_tickets(id),
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS select_care_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    originalId INTEGER,
    customerId INTEGER,
    brand TEXT,
    model TEXT,
    color TEXT,
    memory TEXT,
    imei TEXT,
    purchasePlace TEXT,
    orderNumber TEXT,
    purchaseDate TEXT,
    purchasePrice REAL,
    monthlyFee REAL,
    userId INTEGER,
    contractPeriod INTEGER,
    endDate TEXT,
    siemensContractNumber TEXT,
    deletedAt TEXT,
    deletedBy TEXT
  );
`);

// Migration: Add userId to equipment if it doesn't exist
try {
  db.prepare("ALTER TABLE equipment ADD COLUMN userId INTEGER").run();
} catch (e) {}

// Migration: Add sellerId to equipment if it doesn't exist
try {
  db.prepare("ALTER TABLE equipment ADD COLUMN sellerId INTEGER").run();
} catch (e) {}

// Migration for existing customers table
try { db.prepare('ALTER TABLE customers ADD COLUMN responsibleSeller TEXT').run(); } catch (e) {}
try { db.prepare('ALTER TABLE select_care ADD COLUMN contractPeriod INTEGER').run(); } catch (e) {}
try { db.prepare('ALTER TABLE select_care ADD COLUMN endDate TEXT').run(); } catch (e) {}
try { db.prepare('ALTER TABLE select_care ADD COLUMN siemensContractNumber TEXT').run(); } catch (e) {}
try { db.prepare('ALTER TABLE select_care_history ADD COLUMN contractPeriod INTEGER').run(); } catch (e) {}
try { db.prepare('ALTER TABLE select_care_history ADD COLUMN endDate TEXT').run(); } catch (e) {}
try { db.prepare('ALTER TABLE select_care_history ADD COLUMN siemensContractNumber TEXT').run(); } catch (e) {}
try { db.prepare('ALTER TABLE customer_users ADD COLUMN isAuthorizedBuyer INTEGER DEFAULT 0').run(); } catch (e) {}
try { db.prepare('ALTER TABLE customers ADD COLUMN services TEXT').run(); } catch (e) {}
try { db.prepare('ALTER TABLE select_care_history ADD COLUMN deletedBy TEXT').run(); } catch (e) {}
try { db.prepare('ALTER TABLE customers ADD COLUMN website TEXT').run(); } catch (e) {}
try { db.prepare('ALTER TABLE news ADD COLUMN imageUrl TEXT').run(); } catch (e) {}
try { db.prepare('ALTER TABLE select_care ADD COLUMN sellerId INTEGER').run(); } catch (e) {}
try { db.prepare('ALTER TABLE select_care_history ADD COLUMN sellerId INTEGER').run(); } catch (e) {}
try { db.prepare("ALTER TABLE select_care ADD COLUMN status TEXT DEFAULT 'Aktiv'").run(); } catch (e) {}
try { db.prepare('ALTER TABLE equipment ADD COLUMN sellerId INTEGER').run(); } catch (e) {}
try { db.prepare('ALTER TABLE driving_logs ADD COLUMN sellerId INTEGER').run(); } catch (e) {}
try { db.prepare('ALTER TABLE driving_logs ADD COLUMN deviceType TEXT').run(); } catch (e) {}
try { db.prepare('ALTER TABLE driving_logs ADD COLUMN schema TEXT').run(); } catch (e) {}
try { db.prepare('ALTER TABLE driving_logs ADD COLUMN monthlyFee REAL').run(); } catch (e) {}
try { db.prepare('ALTER TABLE select_care_logs ADD COLUMN userId INTEGER').run(); } catch (e) {}

// Seed admin user if not exists
const adminEmail = 'luis@selecttelecom.se';
const existingAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);
if (!existingAdmin) {
  db.prepare(`
    INSERT INTO users (firstName, lastName, email, password, phone, role, status, isAdmin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('Luis', 'Vidal', adminEmail, 'Internet4949!', '0700000000', 'Administratör', 'approved', 1);
}

// Seed default brands
const defaultBrands = ['Samsung', 'Iphone', 'Google', 'Doro', 'Xiaomi', 'OnePlus'];
const insertBrand = db.prepare('INSERT OR IGNORE INTO brands (name) VALUES (?)');
defaultBrands.forEach(brand => insertBrand.run(brand));

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  const activeUsers = new Map<WebSocket, any>();

  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'join') {
          activeUsers.set(ws, data.user);
          broadcastActiveUsers();
        }
      } catch (e) {
        console.error('WS Error:', e);
      }
    });

    ws.on('close', () => {
      activeUsers.delete(ws);
      broadcastActiveUsers();
    });

    function broadcastActiveUsers() {
      const users = Array.from(activeUsers.values());
      // Filter duplicates by ID (in case of multiple tabs)
      const uniqueUsers = Array.from(new Map(users.map(u => [u.id, u])).values());
      const payload = JSON.stringify({ type: 'presence', users: uniqueUsers });
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    }
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const upload = multer({ storage: multer.memoryStorage() });

  // Auth Routes
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, password);
    if (user) {
      if (user.status !== 'approved') {
        return res.status(403).json({ error: "Ditt konto väntar på godkännande." });
      }
      res.json(user);
    } else {
      res.status(401).json({ error: "Fel e-post eller lösenord." });
    }
  });

  app.post("/api/auth/register", (req, res) => {
    const { firstName, lastName, email, password, phone } = req.body;
    try {
      db.prepare(`
        INSERT INTO users (firstName, lastName, email, password, phone, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `).run(firstName, lastName, email, password, phone);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "E-postadressen används redan." });
    }
  });

  // User Management
  app.get("/api/users", (req, res) => {
    const users = db.prepare('SELECT * FROM users').all();
    res.json(users);
  });

  app.get("/api/users/pending/count", (req, res) => {
    const count = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'pending'").get().count;
    res.json({ count });
  });

  app.post("/api/users/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id);
    res.json({ success: true });
  });

  app.put("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, password, profilePic, role } = req.body;
    if (password) {
      db.prepare('UPDATE users SET firstName = ?, lastName = ?, password = ?, profilePic = ?, role = ? WHERE id = ?')
        .run(firstName, lastName, password, profilePic, role, id);
    } else {
      db.prepare('UPDATE users SET firstName = ?, lastName = ?, profilePic = ?, role = ? WHERE id = ?')
        .run(firstName, lastName, profilePic, role, id);
    }
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.json(updatedUser);
  });

  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // Customers
  app.get("/api/customers", (req, res) => {
    const { userId, isAdmin, role } = req.query;
    const isPrivileged = isAdmin === 'true' || isAdmin === '1' || role === 'Administratör' || role === 'Support';
    
    let customers;
    if (isPrivileged) {
      customers = db.prepare('SELECT * FROM customers').all();
    } else {
      customers = db.prepare(`
        SELECT * FROM customers 
        WHERE responsibleSeller = (SELECT firstName || ' ' || lastName FROM users WHERE id = ?)
      `).all(userId);
    }
    res.json(customers);
  });

  app.post("/api/customers", (req, res) => {
    const { name, orgNumber, address, city, zipCode, contactPerson, contactPhone, contactEmail, responsibleSeller, website, services } = req.body;
    
    const result = db.prepare(`
      INSERT INTO customers (name, orgNumber, address, city, zipCode, contactPerson, contactPhone, contactEmail, responsibleSeller, website, services)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, orgNumber, address, city, zipCode, contactPerson, contactPhone, contactEmail, responsibleSeller, website, services);
    
    const customerId = result.lastInsertRowid;

    // Automatically create a customer user
    if (contactPerson && contactEmail) {
      const names = contactPerson.split(' ');
      const firstName = names[0] || '';
      const lastName = names.slice(1).join(' ') || '';
      
      db.prepare(`
        INSERT INTO customer_users (customerId, firstName, lastName, email, phone, role)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(customerId, firstName, lastName, contactEmail, contactPhone, 'Kontaktperson');
    }

    res.json({ id: customerId });
  });

  app.get("/api/customers/:id", (req, res) => {
    const { id } = req.params;
    const { userId, isAdmin, role } = req.query;
    const isPrivileged = isAdmin === 'true' || isAdmin === '1' || role === 'Administratör' || role === 'Support';

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    if (!isPrivileged) {
      const user = db.prepare('SELECT firstName, lastName FROM users WHERE id = ?').get(userId) as any;
      const fullName = `${user.firstName} ${user.lastName}`;
      if (customer.responsibleSeller !== fullName) {
        return res.status(403).json({ error: "Du har inte tillgång till denna kund." });
      }
    }

    const users = db.prepare('SELECT * FROM customer_users WHERE customerId = ?').all(id);
    const equipment = db.prepare('SELECT * FROM equipment WHERE customerId = ?').all(id);
    const selectCare = db.prepare('SELECT * FROM select_care WHERE customerId = ?').all(id);
    const contracts = db.prepare('SELECT * FROM contracts WHERE customerId = ? ORDER BY createdAt DESC').all(id);
    
    // Fetch files for each contract
    const contractsWithFiles = contracts.map((c: any) => {
      const files = db.prepare('SELECT id, name, mimeType, size, createdAt FROM contract_files WHERE contractId = ?').all(c.id);
      return { ...c, files };
    });

    // Fetch logs for each select care item
    const selectCareWithLogs = selectCare.map(sc => {
      const logs = db.prepare('SELECT * FROM select_care_logs WHERE selectCareId = ? ORDER BY timestamp DESC').all(sc.id);
      return { ...sc, logs };
    });

    const selectCareHistory = db.prepare('SELECT * FROM select_care_history WHERE customerId = ? ORDER BY deletedAt DESC').all(id);
    res.json({ ...customer, users, equipment, selectCare: selectCareWithLogs, selectCareHistory, contracts: contractsWithFiles });
  });

  app.put("/api/customers/:id", (req, res) => {
    const { name, orgNumber, address, city, zipCode, contactPerson, contactPhone, contactEmail, responsibleSeller, website, services } = req.body;
    db.prepare(`
      UPDATE customers 
      SET name = ?, orgNumber = ?, address = ?, city = ?, zipCode = ?, contactPerson = ?, contactPhone = ?, contactEmail = ?, responsibleSeller = ?, website = ?, services = ?
      WHERE id = ?
    `).run(name, orgNumber, address, city, zipCode, contactPerson, contactPhone, contactEmail, responsibleSeller, website, services, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/customers/:id", (req, res) => {
    const { id } = req.params;
    db.transaction(() => {
      db.prepare('DELETE FROM customer_users WHERE customerId = ?').run(id);
      db.prepare('DELETE FROM equipment WHERE customerId = ?').run(id);
      db.prepare('DELETE FROM select_care WHERE customerId = ?').run(id);
      db.prepare('DELETE FROM select_care_history WHERE customerId = ?').run(id);
      db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    })();
    res.json({ success: true });
  });

  // Customer Users
  app.post("/api/customers/:id/users", (req, res) => {
    const { firstName, lastName, email, phone, role, office, isAuthorizedBuyer } = req.body;
    db.prepare(`
      INSERT INTO customer_users (customerId, firstName, lastName, email, phone, role, office, isAuthorizedBuyer)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.id, firstName, lastName, email, phone, role, office, isAuthorizedBuyer || 0);
    res.json({ success: true });
  });

  app.delete("/api/customer-users/:id", (req, res) => {
    db.prepare('DELETE FROM customer_users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/customer-users/:id", (req, res) => {
    const { firstName, lastName, email, phone, role, office, isAuthorizedBuyer } = req.body;
    db.prepare(`
      UPDATE customer_users 
      SET firstName = ?, lastName = ?, email = ?, phone = ?, role = ?, office = ?, isAuthorizedBuyer = ?
      WHERE id = ?
    `).run(firstName, lastName, email, phone, role, office, isAuthorizedBuyer || 0, req.params.id);
    res.json({ success: true });
  });

  // Brands
  app.get("/api/brands", (req, res) => {
    const brands = db.prepare('SELECT * FROM brands').all();
    res.json(brands);
  });

  app.post("/api/brands", (req, res) => {
    const { name } = req.body;
    try {
      db.prepare('INSERT INTO brands (name) VALUES (?)').run(name);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Märket finns redan." });
    }
  });

  // Equipment
  app.post("/api/customers/:id/equipment", (req, res) => {
    const { brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, customerPrice, sellerId, userId } = req.body;
    db.prepare(`
      INSERT INTO equipment (customerId, brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, customerPrice, sellerId, userId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.id, brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, customerPrice, sellerId || null, userId || null);
    res.json({ success: true });
  });

  app.delete("/api/equipment/:id", (req, res) => {
    db.prepare('DELETE FROM equipment WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/equipment/:id", (req, res) => {
    const { brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, customerPrice, userId } = req.body;
    db.prepare(`
      UPDATE equipment 
      SET brand = ?, model = ?, color = ?, memory = ?, imei = ?, purchasePlace = ?, orderNumber = ?, purchaseDate = ?, purchasePrice = ?, customerPrice = ?, userId = ?
      WHERE id = ?
    `).run(brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, customerPrice, userId || null, req.params.id);
    res.json({ success: true });
  });

  // News
  app.get("/api/news", (req, res) => {
    const news = db.prepare(`
      SELECT n.*, u.firstName, u.lastName 
      FROM news n 
      JOIN users u ON n.authorId = u.id 
      ORDER BY n.createdAt DESC
    `).all();
    res.json(news);
  });

  app.get("/api/news/:id", (req, res) => {
    const news = db.prepare(`
      SELECT n.*, u.firstName, u.lastName 
      FROM news n 
      JOIN users u ON n.authorId = u.id 
      WHERE n.id = ?
    `).get(req.params.id);
    res.json(news);
  });

  app.post("/api/news", (req, res) => {
    const { title, content, imageUrl, authorId } = req.body;
    const result = db.prepare(`
      INSERT INTO news (title, content, imageUrl, authorId)
      VALUES (?, ?, ?, ?)
    `).run(title, content, imageUrl, authorId);
    res.json({ id: result.lastInsertRowid });
  });

  // Driving Logs Routes
  app.get("/api/customers/:id/driving-logs", (req, res) => {
    const logs = db.prepare('SELECT * FROM driving_logs WHERE customerId = ? ORDER BY createdAt DESC').all(req.params.id);
    res.json(logs);
  });

  app.post("/api/customers/:id/driving-logs/bulk", (req, res) => {
    const { logs, sellerId } = req.body; // Array of { regNo, driverName, email }
    const customerId = req.params.id;

    const deleteStmt = db.prepare('DELETE FROM driving_logs WHERE customerId = ?');
    const insertStmt = db.prepare('INSERT INTO driving_logs (customerId, regNo, driverName, email, sellerId, deviceType, schema, monthlyFee) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const checkUserStmt = db.prepare('SELECT id FROM customer_users WHERE customerId = ? AND email = ?');
    const insertUserStmt = db.prepare('INSERT INTO customer_users (customerId, firstName, lastName, email, role) VALUES (?, ?, ?, ?, ?)');
    const updateUserStmt = db.prepare('UPDATE customer_users SET firstName = ?, lastName = ? WHERE id = ?');

    const transaction = db.transaction((logsToInsert) => {
      deleteStmt.run(customerId);
      for (const log of logsToInsert) {
        insertStmt.run(customerId, log.regNo, log.driverName, log.email, sellerId || null, log.deviceType || null, log.schema || null, log.monthlyFee || 0);
        
        // Check if user exists, if not create them, otherwise update
        const existingUser = checkUserStmt.get(customerId, log.email);
        const names = log.driverName.split(' ');
        const firstName = names[0] || '';
        const lastName = names.slice(1).join(' ') || '';

        if (!existingUser) {
          insertUserStmt.run(customerId, firstName, lastName, log.email, 'Förare');
        } else {
          updateUserStmt.run(firstName, lastName, existingUser.id);
        }
      }
    });

    transaction(logs);
    res.json({ success: true });
  });

  app.put("/api/news/:id", (req, res) => {
    const { title, content, imageUrl } = req.body;
    db.prepare(`
      UPDATE news 
      SET title = ?, content = ?, imageUrl = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, content, imageUrl, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/news/:id", (req, res) => {
    db.prepare('DELETE FROM news WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Select Care
  app.get("/api/select-care", (req, res) => {
    const { sellerId } = req.query;
    let items;
    if (sellerId) {
      items = db.prepare(`
        SELECT sc.*, c.name as customerName 
        FROM select_care sc 
        JOIN customers c ON sc.customerId = c.id 
        WHERE sc.sellerId = ?
      `).all(sellerId);
    } else {
      items = db.prepare(`
        SELECT sc.*, c.name as customerName 
        FROM select_care sc 
        JOIN customers c ON sc.customerId = c.id
      `).all();
    }
    res.json(items);
  });

  app.post("/api/customers/:id/select-care", (req, res) => {
    const { brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, monthlyFee, userId, contractPeriod, endDate, siemensContractNumber, sellerId } = req.body;
    db.prepare(`
      INSERT INTO select_care (customerId, brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, monthlyFee, userId, contractPeriod, endDate, siemensContractNumber, sellerId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.id, brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, monthlyFee, userId, contractPeriod, endDate, siemensContractNumber, sellerId);
    res.json({ success: true });
  });

  app.delete("/api/select-care/:id", (req, res) => {
    const { id } = req.params;
    const deletedBy = req.query.deletedBy as string || 'Okänd';
    console.log(`[API] DELETE /api/select-care/${id} by ${deletedBy}`);
    
    try {
      const numericId = parseInt(id);
      if (isNaN(numericId)) {
        console.error(`[API] Invalid ID provided: ${id}`);
        return res.status(400).json({ error: "Ogiltigt ID-format." });
      }

      const item = db.prepare('SELECT * FROM select_care WHERE id = ?').get(numericId);
      
      if (!item) {
        console.warn(`[API] Select Care item with ID ${numericId} not found`);
        return res.status(404).json({ error: "Avtalet hittades inte i databasen." });
      }

      console.log(`[API] Found item: ${item.brand} ${item.model}. Moving to history...`);

      // Use a transaction to ensure both operations succeed or fail together
      const deleteTransaction = db.transaction(() => {
        db.prepare(`
          INSERT INTO select_care_history (
            originalId, customerId, brand, model, color, memory, imei, 
            purchasePlace, orderNumber, purchaseDate, purchasePrice, 
            monthlyFee, userId, contractPeriod, endDate, siemensContractNumber, deletedAt, deletedBy
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          item.id, item.customerId, item.brand, item.model, item.color, item.memory, item.imei, 
          item.purchasePlace, item.orderNumber, item.purchaseDate, item.purchasePrice, 
          item.monthlyFee, item.userId, item.contractPeriod || 24, item.endDate || '', 
          item.siemensContractNumber || '', new Date().toISOString(), deletedBy
        );

        db.prepare('DELETE FROM select_care WHERE id = ?').run(numericId);
      });

      deleteTransaction();
      
      console.log(`[API] Successfully deleted and archived item ${numericId}`);
      res.json({ success: true, message: "Avtalet har raderats och arkiverats." });
      
    } catch (e: any) {
      console.error('[API] Error during Select Care deletion:', e);
      res.status(500).json({ 
        error: "Ett internt serverfel uppstod vid radering.",
        details: e.message 
      });
    }
  });

  app.patch("/api/select-care/:id/status", (req, res) => {
    const { id } = req.params;
    const { status, notes, userId } = req.body;
    
    try {
      const item = db.prepare('SELECT * FROM select_care WHERE id = ?').get(id);
      if (!item) return res.status(404).json({ error: 'Item not found' });

      db.transaction(() => {
        db.prepare('UPDATE select_care SET status = ? WHERE id = ?').run(status, id);
        db.prepare(`
          INSERT INTO select_care_logs (selectCareId, userId, fromStatus, toStatus, notes)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, userId || null, item.status, status, notes || '');

        // If status is 'Under reparation', create a support ticket automatically
        if (status === 'Under reparation') {
          const ticketNumber = `SUP-${Date.now().toString().slice(-6)}`;
          const customer = db.prepare('SELECT name FROM customers WHERE id = ?').get(item.customerId);
          const title = `Reparation: ${item.brand} ${item.model} - ${customer?.name || 'Okänd kund'}`;
          
          const ticketResult = db.prepare(`
            INSERT INTO support_tickets (ticketNumber, customerId, selectCareId, title, description, status, createdBy)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(ticketNumber, item.customerId, id, title, notes || 'Skickad för reparation via Select Care', 'Skickat för reparation', userId || null);

          db.prepare(`
            INSERT INTO support_ticket_logs (ticketId, userId, action, note)
            VALUES (?, ?, ?, ?)
          `).run(ticketResult.lastInsertRowid, userId || null, 'Skapad', 'Automatiskt skapad vid reparationsanmälan');
        } else if (status === 'Aktiv' && item.status === 'Under reparation') {
          // If moving from 'Under reparation' back to 'Aktiv', find and close the ticket
          const openTicket = db.prepare('SELECT id FROM support_tickets WHERE selectCareId = ? AND status != ?').get(id, 'Avslutad');
          if (openTicket) {
            db.prepare('UPDATE support_tickets SET status = ? WHERE id = ?').run('Avslutad', openTicket.id);
            db.prepare(`
              INSERT INTO support_ticket_logs (ticketId, userId, action, note)
              VALUES (?, ?, ?, ?)
            `).run(openTicket.id, userId || null, 'Status ändrad', 'Avslutad automatiskt då enheten markerats som Aktiv');
          }
        }
      })();

      res.json({ success: true });
    } catch (e: any) {
      console.error('[API] Error updating status:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/select-care/:id", (req, res) => {
    try {
      const { brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, monthlyFee, userId, contractPeriod, endDate, siemensContractNumber, sellerId } = req.body;
      db.prepare(`
        UPDATE select_care 
        SET brand = ?, model = ?, color = ?, memory = ?, imei = ?, purchasePlace = ?, orderNumber = ?, purchaseDate = ?, purchasePrice = ?, monthlyFee = ?, userId = ?, contractPeriod = ?, endDate = ?, siemensContractNumber = ?, sellerId = ?
        WHERE id = ?
      `).run(brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, monthlyFee, userId, contractPeriod, endDate, siemensContractNumber, sellerId, req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      console.error('Update SC Error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Contracts
  app.get("/api/contracts", (req, res) => {
    const { sellerId } = req.query;
    let contracts;
    if (sellerId) {
      contracts = db.prepare(`
        SELECT c.*, cust.name as customerName 
        FROM contracts c 
        JOIN customers cust ON c.customerId = cust.id 
        WHERE c.sellerId = ?
        ORDER BY c.createdAt DESC
      `).all(sellerId);
    } else {
      contracts = db.prepare(`
        SELECT c.*, cust.name as customerName 
        FROM contracts c 
        JOIN customers cust ON c.customerId = cust.id 
        ORDER BY c.createdAt DESC
      `).all();
    }

    // Fetch files for each contract
    const contractsWithFiles = contracts.map((c: any) => {
      const files = db.prepare('SELECT id, name, mimeType, size, createdAt FROM contract_files WHERE contractId = ?').all(c.id);
      return { ...c, files };
    });

    res.json(contractsWithFiles);
  });

  app.post("/api/contracts", upload.array('files'), (req, res) => {
    const { customerId, type, startDate, contractPeriod, endDate, sellerId, customFields, userId, isAdmin, role } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!userId) {
      return res.status(401).json({ error: "Användar-ID saknas. Vänligen logga in igen." });
    }

    const isPrivileged = isAdmin === 'true' || isAdmin === '1' || role === 'Administratör' || role === 'Support';
    const customer = db.prepare('SELECT responsibleSeller FROM customers WHERE id = ?').get(customerId) as any;
    
    if (!customer) {
      return res.status(404).json({ error: "Kund hittades inte." });
    }

    const user = db.prepare('SELECT firstName, lastName FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      return res.status(401).json({ error: "Användare hittades inte." });
    }
    const fullName = `${user.firstName} ${user.lastName}`;

    if (!isPrivileged && customer.responsibleSeller !== fullName) {
      return res.status(403).json({ error: "Du har inte behörighet att lägga till avtal för denna kund." });
    }

    const result = db.prepare(`
      INSERT INTO contracts (customerId, type, startDate, contractPeriod, endDate, sellerId, customFields)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(customerId, type, startDate, contractPeriod, endDate, sellerId, customFields);

    const contractId = result.lastInsertRowid;

    if (files && files.length > 0) {
      const insertFile = db.prepare('INSERT INTO contract_files (contractId, name, mimeType, data, size) VALUES (?, ?, ?, ?, ?)');
      for (const file of files) {
        insertFile.run(contractId, file.originalname, file.mimetype, file.buffer, file.size);
      }
    }

    res.json({ id: contractId });
  });

  app.put("/api/contracts/:id", upload.array('files'), (req, res) => {
    const { customerId, type, startDate, contractPeriod, endDate, sellerId, customFields, userId, isAdmin, role } = req.body;
    const files = req.files as Express.Multer.File[];
    const id = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "Användar-ID saknas. Vänligen logga in igen." });
    }

    const isPrivileged = isAdmin === 'true' || isAdmin === '1' || role === 'Administratör' || role === 'Support';
    const customer = db.prepare('SELECT responsibleSeller FROM customers WHERE id = ?').get(customerId) as any;
    
    if (!customer) {
      return res.status(404).json({ error: "Kund hittades inte." });
    }

    const user = db.prepare('SELECT firstName, lastName FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      return res.status(401).json({ error: "Användare hittades inte." });
    }
    const fullName = `${user.firstName} ${user.lastName}`;

    if (!isPrivileged && customer.responsibleSeller !== fullName) {
      return res.status(403).json({ error: "Du har inte behörighet att redigera detta avtal." });
    }

    db.prepare(`
      UPDATE contracts 
      SET customerId = ?, type = ?, startDate = ?, contractPeriod = ?, endDate = ?, sellerId = ?, customFields = ?
      WHERE id = ?
    `).run(customerId, type, startDate, contractPeriod, endDate, sellerId, customFields, id);

    if (files && files.length > 0) {
      const insertFile = db.prepare('INSERT INTO contract_files (contractId, name, mimeType, data, size) VALUES (?, ?, ?, ?, ?)');
      for (const file of files) {
        insertFile.run(id, file.originalname, file.mimetype, file.buffer, file.size);
      }
    }

    res.json({ success: true });
  });

  app.get("/api/files/:id", (req, res) => {
    const file = db.prepare('SELECT * FROM contract_files WHERE id = ?').get(req.params.id) as any;
    if (!file) return res.status(404).send('File not found');

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
    res.send(file.data);
  });

  app.get("/api/files/:id/download", (req, res) => {
    const file = db.prepare('SELECT * FROM contract_files WHERE id = ?').get(req.params.id) as any;
    if (!file) return res.status(404).send('File not found');

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    res.send(file.data);
  });

  app.delete("/api/files/:id", (req, res) => {
    db.prepare('DELETE FROM contract_files WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/contracts/:id", (req, res) => {
    const { id } = req.params;
    const { userId, isAdmin, role } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "Användar-ID saknas. Vänligen logga in igen." });
    }

    const isPrivileged = isAdmin === 'true' || isAdmin === '1' || role === 'Administratör' || role === 'Support';
    const contract = db.prepare('SELECT customerId FROM contracts WHERE id = ?').get(id) as any;
    if (!contract) return res.status(404).json({ error: "Avtal hittades inte." });

    const customer = db.prepare('SELECT responsibleSeller FROM customers WHERE id = ?').get(contract.customerId) as any;
    if (!customer) return res.status(404).json({ error: "Kund hittades inte." });

    const user = db.prepare('SELECT firstName, lastName FROM users WHERE id = ?').get(userId) as any;
    if (!user) return res.status(401).json({ error: "Användare hittades inte." });
    const fullName = `${user.firstName} ${user.lastName}`;

    if (!isPrivileged && customer.responsibleSeller !== fullName) {
      return res.status(403).json({ error: "Du har inte behörighet att radera detta avtal." });
    }

    db.transaction(() => {
      db.prepare('DELETE FROM contract_files WHERE contractId = ?').run(id);
      db.prepare('DELETE FROM contracts WHERE id = ?').run(id);
    })();
    res.json({ success: true });
  });

  // Support Tickets
  app.get("/api/support-tickets", (req, res) => {
    const { userId, isAdmin, role } = req.query;
    const isPrivileged = isAdmin === 'true' || role === 'Administratör' || role === 'Support';
    
    let tickets;
    if (isPrivileged) {
      tickets = db.prepare(`
        SELECT t.*, c.name as customerName, u.firstName || ' ' || u.lastName as creatorName,
               sc.brand || ' ' || sc.model as deviceName
        FROM support_tickets t
        JOIN customers c ON t.customerId = c.id
        LEFT JOIN users u ON t.createdBy = u.id
        LEFT JOIN select_care sc ON t.selectCareId = sc.id
        ORDER BY t.updatedAt DESC
      `).all();
    } else {
      // Users can only see tickets for customers they are responsible for (sellerId)
      tickets = db.prepare(`
        SELECT t.*, c.name as customerName, u.firstName || ' ' || u.lastName as creatorName,
               sc.brand || ' ' || sc.model as deviceName
        FROM support_tickets t
        JOIN customers c ON t.customerId = c.id
        LEFT JOIN users u ON t.createdBy = u.id
        LEFT JOIN select_care sc ON t.selectCareId = sc.id
        WHERE c.responsibleSeller = (SELECT firstName || ' ' || lastName FROM users WHERE id = ?)
        ORDER BY t.updatedAt DESC
      `).all(userId);
    }
    res.json(tickets);
  });

  app.get("/api/support-tickets/:id", (req, res) => {
    const ticket = db.prepare(`
      SELECT t.*, c.name as customerName, u.firstName || ' ' || u.lastName as creatorName,
             sc.brand || ' ' || sc.model as deviceName
      FROM support_tickets t
      JOIN customers c ON t.customerId = c.id
      LEFT JOIN users u ON t.createdBy = u.id
      LEFT JOIN select_care sc ON t.selectCareId = sc.id
      WHERE t.id = ?
    `).get(req.params.id);
    
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    
    const logs = db.prepare(`
      SELECT l.*, u.firstName || ' ' || u.lastName as userName
      FROM support_ticket_logs l
      JOIN users u ON l.userId = u.id
      WHERE l.ticketId = ?
      ORDER BY l.timestamp DESC
    `).all(req.params.id);
    
    res.json({ ...ticket, logs });
  });

  app.post("/api/support-tickets", (req, res) => {
    const { customerId, selectCareId, title, description, status, priority, createdBy } = req.body;
    const ticketNumber = `SUP-${Date.now().toString().slice(-6)}`;
    
    const result = db.prepare(`
      INSERT INTO support_tickets (ticketNumber, customerId, selectCareId, title, description, status, priority, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(ticketNumber, customerId, selectCareId || null, title, description, status || 'Registrerad', priority || 'Normal', createdBy);
    
    db.prepare(`
      INSERT INTO support_ticket_logs (ticketId, userId, action, note)
      VALUES (?, ?, ?, ?)
    `).run(result.lastInsertRowid, createdBy, 'Skapad', 'Ärendet har registrerats');
    
    res.json({ id: result.lastInsertRowid, ticketNumber });
  });

  app.put("/api/support-tickets/:id", (req, res) => {
    const { title, description, status, priority, userId, note } = req.body;
    const { id } = req.params;
    
    const oldTicket = db.prepare('SELECT status, selectCareId FROM support_tickets WHERE id = ?').get(id);
    
    db.transaction(() => {
      db.prepare(`
        UPDATE support_tickets 
        SET title = ?, description = ?, status = ?, priority = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(title, description, status, priority, id);
      
      let action = 'Uppdaterad';
      if (oldTicket.status !== status) {
        action = `Status ändrad till ${status}`;
      }
      
      db.prepare(`
        INSERT INTO support_ticket_logs (ticketId, userId, action, note)
        VALUES (?, ?, ?, ?)
      `).run(id, userId, action, note || '');

      // If status is changed to 'Avslutad' and there is a selectCareId, activate the unit
      if (status === 'Avslutad' && oldTicket.selectCareId) {
        const sc = db.prepare('SELECT status FROM select_care WHERE id = ?').get(oldTicket.selectCareId);
        if (sc && sc.status === 'Under reparation') {
          db.prepare('UPDATE select_care SET status = ? WHERE id = ?').run('Aktiv', oldTicket.selectCareId);
          
          const user = db.prepare('SELECT firstName, lastName FROM users WHERE id = ?').get(userId);
          const userName = user ? `${user.firstName} ${user.lastName}` : 'System';
          
          db.prepare(`
            INSERT INTO select_care_logs (selectCareId, userId, fromStatus, toStatus, notes)
            VALUES (?, ?, ?, ?, ?)
          `).run(oldTicket.selectCareId, userId || null, 'Under reparation', 'Aktiv', `Aktiverad via supportärende ${id}: ${note || 'Ärendet avslutat'}`);
        }
      }
    })();
    
    res.json({ success: true });
  });

  app.post("/api/support-tickets/:id/logs", (req, res) => {
    const { userId, note, action } = req.body;
    const { id } = req.params;
    
    db.transaction(() => {
      db.prepare(`
        INSERT INTO support_ticket_logs (ticketId, userId, action, note)
        VALUES (?, ?, ?, ?)
      `).run(id, userId, action || 'Kommentar', note);
      
      db.prepare('UPDATE support_tickets SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(id);

      // Also log to Select Care history if linked
      const ticket = db.prepare('SELECT selectCareId FROM support_tickets WHERE id = ?').get(id);
      if (ticket && ticket.selectCareId) {
        const user = db.prepare('SELECT firstName, lastName FROM users WHERE id = ?').get(userId);
        const userName = user ? `${user.firstName} ${user.lastName}` : 'System';
        
        db.prepare(`
          INSERT INTO select_care_logs (selectCareId, userId, fromStatus, toStatus, notes)
          VALUES (?, ?, ?, ?, ?)
        `).run(ticket.selectCareId, userId || null, 'Under reparation', 'Under reparation', `Uppdatering via supportärende: ${note}`);
      }
    })();
    
    res.json({ success: true });
  });

  // Calendar Events
  app.get("/api/calendar-events", (req, res) => {
    const { sellerId } = req.query;
    let events;
    if (sellerId) {
      events = db.prepare('SELECT * FROM calendar_events WHERE sellerId = ?').all(sellerId);
    } else {
      events = db.prepare('SELECT * FROM calendar_events').all();
    }
    res.json(events);
  });

  app.post("/api/calendar-events", (req, res) => {
    const { title, description, startDate, endDate, sellerId, type, relatedId } = req.body;
    const result = db.prepare(`
      INSERT INTO calendar_events (title, description, startDate, endDate, sellerId, type, relatedId)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, description, startDate, endDate, sellerId, type, relatedId);
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/calendar-events/:id", (req, res) => {
    const { title, description, startDate, endDate, sellerId, type, relatedId } = req.body;
    db.prepare(`
      UPDATE calendar_events 
      SET title = ?, description = ?, startDate = ?, endDate = ?, sellerId = ?, type = ?, relatedId = ?
      WHERE id = ?
    `).run(title, description, startDate, endDate, sellerId, type, relatedId, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/calendar-events/:id", (req, res) => {
    db.prepare('DELETE FROM calendar_events WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Statistics
  app.get("/api/stats", (req, res) => {
    const { sellerId, isAdmin } = req.query;
    const isUserAdmin = isAdmin === 'true' || isAdmin === '1';
    
    const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
    
    // Get current year
    const currentYear = new Date().getFullYear();
    
    // Generate all months for the current year
    const months = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return `${currentYear}-${month.toString().padStart(2, '0')}`;
    });

    const filterClause = (!isUserAdmin && sellerId) ? 'AND sellerId = ?' : '';
    const filterParams = (!isUserAdmin && sellerId) ? [currentYear.toString(), sellerId] : [currentYear.toString()];

    // Antal mobiler sålda per månad (Equipment)
    const equipmentSalesRaw = db.prepare(`
      SELECT strftime('%Y-%m', purchaseDate) as month, COUNT(*) as count, SUM(customerPrice) as revenue
      FROM equipment
      WHERE strftime('%Y', purchaseDate) = ? ${filterClause}
      GROUP BY month
    `).all(...filterParams);

    const equipmentSales = months.map(m => {
      const found = equipmentSalesRaw.find(s => s.month === m);
      return {
        month: m,
        count: found ? found.count : 0,
        revenue: found ? found.revenue : 0
      };
    });

    // Antal Select Care per månad
    const selectCareSalesRaw = db.prepare(`
      SELECT strftime('%Y-%m', purchaseDate) as month, COUNT(*) as count, SUM(monthlyFee) as revenue
      FROM select_care
      WHERE strftime('%Y', purchaseDate) = ? ${filterClause}
      GROUP BY month
    `).all(...filterParams);

    const selectCareSales = months.map(m => {
      const found = selectCareSalesRaw.find(s => s.month === m);
      return {
        month: m,
        count: found ? found.count : 0,
        revenue: found ? found.revenue : 0
      };
    });

    // Mest sålda mobil (ENBART från equipment)
    const topModelQuery = (!isUserAdmin && sellerId) 
      ? 'SELECT brand, model, COUNT(*) as count FROM equipment WHERE sellerId = ? GROUP BY brand, model ORDER BY count DESC LIMIT 1'
      : 'SELECT brand, model, COUNT(*) as count FROM equipment GROUP BY brand, model ORDER BY count DESC LIMIT 1';
    const topModel = db.prepare(topModelQuery).get((!isUserAdmin && sellerId) ? [sellerId] : []);

    // Omsättning
    const equipmentRevenueQuery = (!isUserAdmin && sellerId)
      ? 'SELECT SUM(customerPrice) as total FROM equipment WHERE sellerId = ?'
      : 'SELECT SUM(customerPrice) as total FROM equipment';
    const equipmentRevenue = db.prepare(equipmentRevenueQuery).get((!isUserAdmin && sellerId) ? [sellerId] : []).total || 0;

    const selectCareRevenueQuery = (!isUserAdmin && sellerId)
      ? 'SELECT SUM(monthlyFee) as total FROM select_care WHERE sellerId = ?'
      : 'SELECT SUM(monthlyFee) as total FROM select_care';
    const selectCareRevenue = db.prepare(selectCareRevenueQuery).get((!isUserAdmin && sellerId) ? [sellerId] : []).total || 0;

    // Driving Logs count
    const drivingLogsCountQuery = (!isUserAdmin && sellerId)
      ? 'SELECT COUNT(*) as count FROM driving_logs WHERE sellerId = ?'
      : 'SELECT COUNT(*) as count FROM driving_logs';
    const drivingLogsCount = db.prepare(drivingLogsCountQuery).get((!isUserAdmin && sellerId) ? [sellerId] : []).count || 0;

    // Expiring Select Care (within 6 months)
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    const sixMonthsStr = sixMonthsFromNow.toISOString().split('T')[0];
    
    let expiringSelectCare;
    let expiringContracts;

    if (!isUserAdmin && sellerId) {
      expiringSelectCare = db.prepare(`
        SELECT sc.*, c.name as customerName
        FROM select_care sc
        JOIN customers c ON sc.customerId = c.id
        WHERE sc.endDate <= ? AND sc.endDate >= date('now') AND sc.sellerId = ?
        ORDER BY sc.endDate ASC
      `).all(sixMonthsStr, sellerId);

      expiringContracts = db.prepare(`
        SELECT con.*, c.name as customerName
        FROM contracts con
        JOIN customers c ON con.customerId = c.id
        WHERE con.endDate <= ? AND con.endDate >= date('now') AND con.sellerId = ?
        ORDER BY con.endDate ASC
      `).all(sixMonthsStr, sellerId);
    } else {
      expiringSelectCare = db.prepare(`
        SELECT sc.*, c.name as customerName
        FROM select_care sc
        JOIN customers c ON sc.customerId = c.id
        WHERE sc.endDate <= ? AND sc.endDate >= date('now')
        ORDER BY sc.endDate ASC
      `).all(sixMonthsStr);

      expiringContracts = db.prepare(`
        SELECT con.*, c.name as customerName
        FROM contracts con
        JOIN customers c ON con.customerId = c.id
        WHERE con.endDate <= ? AND con.endDate >= date('now')
        ORDER BY con.endDate ASC
      `).all(sixMonthsStr);
    }

    res.json({
      customerCount,
      equipmentSales,
      selectCareSales,
      topModel,
      equipmentRevenue,
      selectCareRevenue,
      drivingLogsCount,
      expiringSelectCare,
      expiringContracts
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
