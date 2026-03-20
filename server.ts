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

try {
  db.prepare("ALTER TABLE users ADD COLUMN isSupport INTEGER DEFAULT 0").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE users ADD COLUMN resetToken TEXT").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE users ADD COLUMN resetTokenExpires TEXT").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE users ADD COLUMN customerId INTEGER").run();
} catch (e) {}

// Migration: Add contactEmail to customers if it doesn't exist
try {
  db.prepare("ALTER TABLE customers ADD COLUMN contactEmail TEXT").run();
} catch (e) {}

// Migration: Add trackingNumber to equipment and select_care if they don't exist
try {
  db.prepare("ALTER TABLE equipment ADD COLUMN trackingNumber TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE equipment ADD COLUMN notes TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE select_care ADD COLUMN trackingNumber TEXT").run();
} catch (e) {}

// Migration: Add imageSize to news if it doesn't exist
try {
  db.prepare("ALTER TABLE news ADD COLUMN imageSize TEXT DEFAULT 'large'").run();
} catch (e) {}

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

  CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS colors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS memories (
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
    isRead INTEGER DEFAULT 0,
    isReadByAdmin INTEGER DEFAULT 0,
    isReadByCreator INTEGER DEFAULT 0,
    isTagged INTEGER DEFAULT 0,
    taggedUserId INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customerId) REFERENCES customers(id),
    FOREIGN KEY(selectCareId) REFERENCES select_care(id),
    FOREIGN KEY(createdBy) REFERENCES users(id),
    FOREIGN KEY(assignedTo) REFERENCES users(id),
    FOREIGN KEY(taggedUserId) REFERENCES users(id)
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

  CREATE TABLE IF NOT EXISTS it_brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS it_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS it_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS it_purchase_places (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS it_equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerId INTEGER,
    userId INTEGER,
    sellerId INTEGER,
    deviceName TEXT,
    brand TEXT,
    model TEXT,
    memory TEXT,
    serialNumber TEXT,
    trackingNumber TEXT,
    purchasePlace TEXT,
    orderNumber TEXT,
    purchaseDate TEXT,
    purchasePrice REAL,
    customerPrice REAL,
    comment TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customerId) REFERENCES customers(id),
    FOREIGN KEY(userId) REFERENCES customer_users(id),
    FOREIGN KEY(sellerId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS o365_license_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS o365_licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerId INTEGER,
    licenseType TEXT,
    email TEXT,
    password TEXT,
    price REAL,
    startDate TEXT,
    bindingPeriod INTEGER,
    endDate TEXT,
    userId INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customerId) REFERENCES customers(id),
    FOREIGN KEY(userId) REFERENCES customer_users(id)
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
try { db.prepare("ALTER TABLE support_tickets ADD COLUMN isRead INTEGER DEFAULT 0").run(); } catch (e) {}
try { db.prepare("ALTER TABLE support_tickets ADD COLUMN isReadByAdmin INTEGER DEFAULT 0").run(); } catch (e) {}
try { db.prepare("ALTER TABLE support_tickets ADD COLUMN isReadByCreator INTEGER DEFAULT 0").run(); } catch (e) {}
try { db.prepare("ALTER TABLE support_tickets ADD COLUMN isTagged INTEGER DEFAULT 0").run(); } catch (e) {}
try { db.prepare("ALTER TABLE support_tickets ADD COLUMN taggedUserId INTEGER").run(); } catch (e) {}
try { db.prepare("ALTER TABLE o365_licenses ADD COLUMN notes TEXT").run(); } catch (e) {}

// Seed admin user if not exists
const adminEmail = 'luis@selecttelecom.se';
const existingAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);
if (!existingAdmin) {
  db.prepare(`
    INSERT INTO users (firstName, lastName, email, password, phone, role, status, isAdmin, isSupport)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('Luis', 'Vidal', adminEmail, 'Internet4949!', '0700000000', 'Administratör', 'approved', 1, 1);
} else {
  // Force update password and status for the admin user to ensure login works
  db.prepare('UPDATE users SET password = ?, status = ?, isAdmin = ?, isSupport = ? WHERE email = ?')
    .run('Internet4949!', 'approved', 1, 1, adminEmail);
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
    const trimmedEmail = email?.trim();
    const trimmedPassword = password?.trim();
    console.log(`Login attempt for: ${trimmedEmail}`);
    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND password = ?').get(trimmedEmail, trimmedPassword);
    if (user) {
      console.log(`Login successful for: ${trimmedEmail}`);
      if (user.status !== 'approved') {
        console.log(`User ${trimmedEmail} is not approved`);
        return res.status(403).json({ error: "Ditt konto väntar på godkännande." });
      }
      res.json(user);
    } else {
      console.log(`Login failed for: ${trimmedEmail}`);
      res.status(401).json({ error: "Fel e-post eller lösenord." });
    }
  });

  app.post("/api/auth/forgot-password", (req, res) => {
    const { email } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email?.trim());
    
    if (user) {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
      
      db.prepare('UPDATE users SET resetToken = ?, resetTokenExpires = ? WHERE id = ?')
        .run(token, expires, user.id);
      
      // In a real app, send an email here. For now, we log it to the console.
      const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
      console.log(`Password reset requested for ${email}. Reset link: ${resetLink}`);
      
      // For demo purposes, we'll return the token in the response so the user can "find" it
      // In production, NEVER do this.
      res.json({ success: true, message: "Om e-postadressen finns i vårt system har ett mejl skickats.", debugToken: token });
    } else {
      // Always return success to prevent email enumeration
      res.json({ success: true, message: "Om e-postadressen finns i vårt system har ett mejl skickats." });
    }
  });

  app.post("/api/auth/reset-password", (req, res) => {
    const { token, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE resetToken = ? AND resetTokenExpires > ?').get(token, new Date().toISOString());
    
    if (user) {
      db.prepare('UPDATE users SET password = ?, resetToken = NULL, resetTokenExpires = NULL WHERE id = ?')
        .run(password, user.id);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Länken är ogiltig eller har gått ut." });
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
    const { firstName, lastName, password, profilePic, role, isAdmin, isSupport, phone } = req.body;
    
    // Security: Only admins can change roles or admin status
    // We need to check the requester's status, but for now we'll just be careful with what we update
    // In a real app, we'd check the session/token
    
    const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!currentUser) return res.status(404).json({ error: "Användaren hittades inte" });

    if (password) {
      db.prepare('UPDATE users SET firstName = ?, lastName = ?, password = ?, profilePic = ?, role = ?, isAdmin = ?, isSupport = ?, phone = ? WHERE id = ?')
        .run(
          firstName || currentUser.firstName, 
          lastName || currentUser.lastName, 
          password, 
          profilePic || currentUser.profilePic, 
          role || currentUser.role, 
          isAdmin !== undefined ? isAdmin : currentUser.isAdmin,
          isSupport !== undefined ? isSupport : currentUser.isSupport,
          phone || currentUser.phone,
          id
        );
    } else {
      db.prepare('UPDATE users SET firstName = ?, lastName = ?, profilePic = ?, role = ?, isAdmin = ?, isSupport = ?, phone = ? WHERE id = ?')
        .run(
          firstName || currentUser.firstName, 
          lastName || currentUser.lastName, 
          profilePic || currentUser.profilePic, 
          role || currentUser.role, 
          isAdmin !== undefined ? isAdmin : currentUser.isAdmin,
          isSupport !== undefined ? isSupport : currentUser.isSupport,
          phone || currentUser.phone,
          id
        );
    }
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.json(updatedUser);
  });

  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true });
  });

  // Helper to activate a service for a customer
  const activateService = (customerId: string | number, serviceName: string) => {
    const customer = db.prepare('SELECT services FROM customers WHERE id = ?').get(customerId) as any;
    if (!customer) return;

    let services = [];
    try {
      services = JSON.parse(customer.services || '[]');
    } catch (e) {
      services = [];
    }

    if (!Array.isArray(services)) services = [];

    if (!services.includes(serviceName)) {
      services.push(serviceName);
      db.prepare('UPDATE customers SET services = ? WHERE id = ?').run(JSON.stringify(services), customerId);
    }
  };

  // Customers
  app.get("/api/customers", (req, res) => {
    const { userId, isAdmin, role } = req.query;
    const isPrivileged = isAdmin === 'true' || isAdmin === '1' || role?.toString().toLowerCase() === 'administratör' || role?.toString().toLowerCase() === 'support';
    
    let customers;
    if (isPrivileged) {
      customers = db.prepare('SELECT * FROM customers').all();
    } else if (role === 'Kund') {
      const user = db.prepare('SELECT customerId FROM users WHERE id = ?').get(userId) as any;
      if (user && user.customerId) {
        customers = db.prepare('SELECT * FROM customers WHERE id = ?').all(user.customerId);
      } else {
        customers = [];
      }
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

  app.post("/api/customers/bulk", (req, res) => {
    const { customers } = req.body;
    if (!Array.isArray(customers)) return res.status(400).json({ error: "Invalid data format" });

    const insertCustomer = db.prepare(`
      INSERT INTO customers (name, orgNumber, address, city, zipCode, contactPerson, contactPhone, contactEmail, responsibleSeller, website, services)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertUser = db.prepare(`
      INSERT INTO customer_users (customerId, firstName, lastName, email, phone, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const results = [];
    const transaction = db.transaction((items) => {
      for (const item of items) {
        const result = insertCustomer.run(
          item.name, 
          item.orgNumber, 
          item.address || '', 
          item.city || '', 
          item.zipCode || '', 
          item.contactPerson || '', 
          item.contactPhone || '', 
          item.contactEmail || '', 
          item.responsibleSeller || '', 
          item.website || '', 
          item.services || ''
        );
        
        const customerId = result.lastInsertRowid;
        
        if (item.contactPerson && item.contactEmail) {
          const names = item.contactPerson.split(' ');
          const firstName = names[0] || '';
          const lastName = names.slice(1).join(' ') || '';
          insertUser.run(customerId, firstName, lastName, item.contactEmail, item.contactPhone || '', 'Kontaktperson');
        }
        results.push(customerId);
      }
    });

    try {
      transaction(customers);
      res.json({ success: true, count: results.length });
    } catch (e) {
      console.error('Bulk import error:', e);
      res.status(500).json({ error: "Ett fel uppstod vid massimport." });
    }
  });

  app.get("/api/customers/:id", (req, res) => {
    const { id } = req.params;
    const { userId, isAdmin, role } = req.query;
    const isPrivileged = isAdmin === 'true' || isAdmin === '1' || role?.toString().toLowerCase() === 'administratör' || role?.toString().toLowerCase() === 'support';

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    if (!isPrivileged) {
      if (role === 'Kund') {
        const user = db.prepare('SELECT customerId FROM users WHERE id = ?').get(userId) as any;
        if (!user || user.customerId !== Number(id)) {
          return res.status(403).json({ error: "Du har inte tillgång till denna kund." });
        }
      } else {
        const user = db.prepare('SELECT firstName, lastName FROM users WHERE id = ?').get(userId) as any;
        const fullName = `${user.firstName} ${user.lastName}`;
        if (customer.responsibleSeller !== fullName) {
          return res.status(403).json({ error: "Du har inte tillgång till denna kund." });
        }
      }
    }

    const users = db.prepare('SELECT * FROM customer_users WHERE customerId = ?').all(id);
    let equipment = db.prepare('SELECT * FROM equipment WHERE customerId = ?').all(id);
    let selectCare = db.prepare('SELECT * FROM select_care WHERE customerId = ?').all(id);
    let contracts = db.prepare('SELECT * FROM contracts WHERE customerId = ? ORDER BY createdAt DESC').all(id);
    
    let itEquipment = db.prepare(`
      SELECT it.*, u.firstName || ' ' || u.lastName as userName, s.firstName || ' ' || s.lastName as sellerName
      FROM it_equipment it
      LEFT JOIN customer_users u ON it.userId = u.id
      LEFT JOIN users s ON it.sellerId = s.id
      WHERE it.customerId = ?
      ORDER BY it.createdAt DESC
    `).all(id);

    let o365Licenses = db.prepare(`
      SELECT o.*, u.firstName || ' ' || u.lastName as userName
      FROM o365_licenses o
      LEFT JOIN customer_users u ON o.userId = u.id
      WHERE o.customerId = ?
      ORDER BY o.createdAt DESC
    `).all(id);

    if (role === 'Kund') {
      // Filter equipment
      equipment = equipment.map((e: any) => {
        const { purchasePrice, notes, ...rest } = e;
        return rest;
      });
      // Filter IT
      itEquipment = itEquipment.map((e: any) => {
        const { purchasePrice, comment, ...rest } = e;
        return rest;
      });
      // Filter O365
      o365Licenses = o365Licenses.map((l: any) => {
        const { password, ...rest } = l;
        return rest;
      });
      // Filter Select Care
      selectCare = selectCare.map((sc: any) => {
        const { purchasePrice, ...rest } = sc;
        return rest;
      });
      // Hide contracts
      contracts = [];
    } else if (isAdmin !== 'true' && isAdmin !== '1') {
      // Filter password for non-admins (sales, support)
      o365Licenses = o365Licenses.map((l: any) => {
        const { password, ...rest } = l;
        return rest;
      });
    }

    // Fetch files for each contract
    const contractsWithFiles = contracts.map((c: any) => {
      const files = db.prepare('SELECT id, name, mimeType, size, createdAt FROM contract_files WHERE contractId = ?').all(c.id);
      return { ...c, files };
    });

    // Fetch logs for each select care item
    const selectCareWithLogs = selectCare.map((sc: any) => {
      let logs = [];
      if (role !== 'Kund') {
        logs = db.prepare('SELECT * FROM select_care_logs WHERE selectCareId = ? ORDER BY timestamp DESC').all(sc.id);
      }
      return { ...sc, logs };
    });

    const selectCareHistory = role === 'Kund' ? [] : db.prepare('SELECT * FROM select_care_history WHERE customerId = ? ORDER BY deletedAt DESC').all(id);
    
    res.json({ ...customer, users, equipment, itEquipment, o365Licenses, selectCare: selectCareWithLogs, selectCareHistory, contracts: contractsWithFiles });
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

  // Models
  app.get("/api/models", (req, res) => {
    const models = db.prepare('SELECT * FROM models').all();
    res.json(models);
  });

  app.post("/api/models", (req, res) => {
    const { name } = req.body;
    try {
      db.prepare('INSERT INTO models (name) VALUES (?)').run(name);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Modellen finns redan." });
    }
  });

  // Colors
  app.get("/api/colors", (req, res) => {
    const colors = db.prepare('SELECT * FROM colors').all();
    res.json(colors);
  });

  app.post("/api/colors", (req, res) => {
    const { name } = req.body;
    try {
      db.prepare('INSERT INTO colors (name) VALUES (?)').run(name);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Färgen finns redan." });
    }
  });

  // Memories
  app.get("/api/memories", (req, res) => {
    const memories = db.prepare('SELECT * FROM memories').all();
    res.json(memories);
  });

  app.post("/api/memories", (req, res) => {
    const { name } = req.body;
    try {
      db.prepare('INSERT INTO memories (name) VALUES (?)').run(name);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Minnet finns redan." });
    }
  });

  // Equipment
  app.get("/api/it-equipment/suggestions", (req, res) => {
    const brands = db.prepare("SELECT name FROM it_brands ORDER BY name ASC").all().map((r: any) => r.name);
    const models = db.prepare("SELECT name FROM it_models ORDER BY name ASC").all().map((r: any) => r.name);
    const memory = db.prepare("SELECT name FROM it_memory ORDER BY name ASC").all().map((r: any) => r.name);
    const purchasePlaces = db.prepare("SELECT name FROM it_purchase_places ORDER BY name ASC").all().map((r: any) => r.name);
    
    res.json({
      brands: [
        ...new Set([
          ...brands,
          ...db.prepare("SELECT DISTINCT brand FROM it_equipment WHERE brand IS NOT NULL AND brand != ''").all().map((r: any) => r.brand)
        ])
      ],
      models: [
        ...new Set([
          ...models,
          ...db.prepare("SELECT DISTINCT model FROM it_equipment WHERE model IS NOT NULL AND model != ''").all().map((r: any) => r.model)
        ])
      ],
      memory: [
        ...new Set([
          ...memory,
          ...db.prepare("SELECT DISTINCT memory FROM it_equipment WHERE memory IS NOT NULL AND memory != ''").all().map((r: any) => r.memory)
        ])
      ],
      purchasePlaces: [
        ...new Set([
          ...purchasePlaces,
          ...db.prepare("SELECT DISTINCT purchasePlace FROM it_equipment WHERE purchasePlace IS NOT NULL AND purchasePlace != ''").all().map((r: any) => r.purchasePlace)
        ])
      ]
    });
  });

  app.post("/api/it-equipment/brands", (req, res) => {
    const { name } = req.body;
    try {
      db.prepare("INSERT INTO it_brands (name) VALUES (?)").run(name);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Märket finns redan" });
    }
  });

  app.post("/api/it-equipment/models", (req, res) => {
    const { name } = req.body;
    try {
      db.prepare("INSERT INTO it_models (name) VALUES (?)").run(name);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Modellen finns redan" });
    }
  });

  app.post("/api/it-equipment/memory", (req, res) => {
    const { name } = req.body;
    try {
      db.prepare("INSERT INTO it_memory (name) VALUES (?)").run(name);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Minnet finns redan" });
    }
  });

  app.post("/api/it-equipment/purchase-places", (req, res) => {
    const { name } = req.body;
    try {
      db.prepare("INSERT INTO it_purchase_places (name) VALUES (?)").run(name);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Inköpsstället finns redan" });
    }
  });

  app.get("/api/customers/:id/it-equipment", (req, res) => {
    const equipment = db.prepare(`
      SELECT it.*, u.firstName || ' ' || u.lastName as userName, s.firstName || ' ' || s.lastName as sellerName
      FROM it_equipment it
      LEFT JOIN customer_users u ON it.userId = u.id
      LEFT JOIN users s ON it.sellerId = s.id
      WHERE it.customerId = ?
      ORDER BY it.createdAt DESC
    `).all(req.params.id);
    res.json(equipment);
  });

  app.post("/api/customers/:id/it-equipment", (req, res) => {
    try {
      const { deviceName, brand, model, memory, serialNumber, trackingNumber, purchasePlace, orderNumber, purchaseDate, purchasePrice, customerPrice, sellerId, userId, comment } = req.body;
      const result = db.prepare(`
        INSERT INTO it_equipment (customerId, deviceName, brand, model, memory, serialNumber, trackingNumber, purchasePlace, orderNumber, purchaseDate, purchasePrice, customerPrice, sellerId, userId, comment)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(req.params.id, deviceName, brand, model, memory, serialNumber, trackingNumber, purchasePlace, orderNumber, purchaseDate, purchasePrice, customerPrice, sellerId, userId, comment);
      res.json({ id: result.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte spara IT-utrustning" });
    }
  });

  app.put("/api/it-equipment/:id", (req, res) => {
    try {
      const { deviceName, brand, model, memory, serialNumber, trackingNumber, purchasePlace, orderNumber, purchaseDate, purchasePrice, customerPrice, sellerId, userId, comment } = req.body;
      db.prepare(`
        UPDATE it_equipment 
        SET deviceName = ?, brand = ?, model = ?, memory = ?, serialNumber = ?, trackingNumber = ?, purchasePlace = ?, orderNumber = ?, purchaseDate = ?, purchasePrice = ?, customerPrice = ?, sellerId = ?, userId = ?, comment = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(deviceName, brand, model, memory, serialNumber, trackingNumber, purchasePlace, orderNumber, purchaseDate, purchasePrice, customerPrice, sellerId, userId, comment, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte uppdatera IT-utrustning" });
    }
  });

  app.delete("/api/it-equipment/:id", (req, res) => {
    db.prepare('DELETE FROM it_equipment WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // O365 Licenses
  app.get("/api/o365-licenses/types", (req, res) => {
    const types = db.prepare('SELECT * FROM o365_license_types ORDER BY name ASC').all();
    res.json(types);
  });

  app.post("/api/o365-licenses/types", (req, res) => {
    const { name } = req.body;
    try {
      const result = db.prepare('INSERT INTO o365_license_types (name) VALUES (?)').run(name);
      res.json({ id: result.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: "License type already exists" });
    }
  });

  app.post("/api/o365-licenses", (req, res) => {
    const { customerId, licenseType, email, password, price, startDate, bindingPeriod, endDate, userId, notes } = req.body;
    
    // Save license type if it doesn't exist
    try {
      db.prepare('INSERT OR IGNORE INTO o365_license_types (name) VALUES (?)').run(licenseType);
    } catch (e) {}

    const result = db.prepare(`
      INSERT INTO o365_licenses (customerId, licenseType, email, password, price, startDate, bindingPeriod, endDate, userId, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(customerId, licenseType, email, password || null, price || null, startDate, bindingPeriod, endDate, userId || null, notes || null);
    
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/o365-licenses/:id", (req, res) => {
    const { licenseType, email, password, price, startDate, bindingPeriod, endDate, userId, notes } = req.body;
    const { id } = req.params;

    // Save license type if it doesn't exist
    try {
      db.prepare('INSERT OR IGNORE INTO o365_license_types (name) VALUES (?)').run(licenseType);
    } catch (e) {}

    db.prepare(`
      UPDATE o365_licenses 
      SET licenseType = ?, email = ?, password = ?, price = ?, startDate = ?, bindingPeriod = ?, endDate = ?, userId = ?, notes = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(licenseType, email, password || null, price || null, startDate, bindingPeriod, endDate, userId || null, notes || null, id);
    
    res.json({ success: true });
  });

  app.delete("/api/o365-licenses/:id", (req, res) => {
    db.prepare('DELETE FROM o365_licenses WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/equipment/suggestions", (req, res) => {
    const brands = [
      ...new Set([
        ...db.prepare("SELECT DISTINCT brand FROM equipment WHERE brand IS NOT NULL AND brand != ''").all().map((r: any) => r.brand),
        ...db.prepare('SELECT name FROM brands').all().map((r: any) => r.name)
      ])
    ];
    const models = [
      ...new Set([
        ...db.prepare("SELECT DISTINCT model FROM equipment WHERE model IS NOT NULL AND model != ''").all().map((r: any) => r.model),
        ...db.prepare('SELECT name FROM models').all().map((r: any) => r.name)
      ])
    ];
    const colors = [
      ...new Set([
        ...db.prepare("SELECT DISTINCT color FROM equipment WHERE color IS NOT NULL AND color != ''").all().map((r: any) => r.color),
        ...db.prepare('SELECT name FROM colors').all().map((r: any) => r.name)
      ])
    ];
    const memories = [
      ...new Set([
        ...db.prepare("SELECT DISTINCT memory FROM equipment WHERE memory IS NOT NULL AND memory != ''").all().map((r: any) => r.memory),
        ...db.prepare('SELECT name FROM memories').all().map((r: any) => r.name)
      ])
    ];
    res.json({ brands, models, colors, memories });
  });

  app.post("/api/customers/:id/equipment", (req, res) => {
    const { brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, customerPrice, sellerId, userId, trackingNumber, notes } = req.body;
    db.prepare(`
      INSERT INTO equipment (customerId, brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, customerPrice, sellerId, userId, trackingNumber, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.id, brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, customerPrice, sellerId || null, userId || null, trackingNumber || null, notes || null);
    
    // Auto-activate "Telefoni" service
    activateService(req.params.id, 'Telefoni');
    
    res.json({ success: true });
  });

  app.delete("/api/equipment/:id", (req, res) => {
    db.prepare('DELETE FROM equipment WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/equipment/:id", (req, res) => {
    const { brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, customerPrice, sellerId, userId, trackingNumber, notes } = req.body;
    db.prepare(`
      UPDATE equipment 
      SET brand = ?, model = ?, color = ?, memory = ?, imei = ?, purchasePlace = ?, orderNumber = ?, purchaseDate = ?, purchasePrice = ?, customerPrice = ?, sellerId = ?, userId = ?, trackingNumber = ?, notes = ?
      WHERE id = ?
    `).run(brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, customerPrice, sellerId || null, userId || null, trackingNumber || null, notes || null, req.params.id);
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
    const { title, content, imageUrl, imageSize, authorId } = req.body;
    const result = db.prepare(`
      INSERT INTO news (title, content, imageUrl, imageSize, authorId)
      VALUES (?, ?, ?, ?, ?)
    `).run(title, content, imageUrl, imageSize || 'large', authorId);
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
    
    // Auto-activate "Körjournaler" service
    activateService(customerId, 'Körjournaler');
    
    res.json({ success: true });
  });

  app.delete("/api/driving-logs/:id", (req, res) => {
    db.prepare('DELETE FROM driving_logs WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/driving-logs/:id", (req, res) => {
    const { regNo, driverName, email, deviceType, schema, monthlyFee, sellerId } = req.body;
    try {
      db.prepare(`
        UPDATE driving_logs 
        SET regNo = ?, driverName = ?, email = ?, deviceType = ?, schema = ?, monthlyFee = ?, sellerId = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(regNo, driverName, email, deviceType || null, schema || null, monthlyFee || 0, sellerId || null, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte uppdatera körjournal" });
    }
  });

  app.put("/api/news/:id", (req, res) => {
    const { title, content, imageUrl, imageSize } = req.body;
    db.prepare(`
      UPDATE news 
      SET title = ?, content = ?, imageUrl = ?, imageSize = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, content, imageUrl, imageSize || 'large', req.params.id);
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
    const { brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, monthlyFee, userId, contractPeriod, endDate, siemensContractNumber, sellerId, trackingNumber } = req.body;
    db.prepare(`
      INSERT INTO select_care (customerId, brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, monthlyFee, userId, contractPeriod, endDate, siemensContractNumber, sellerId, trackingNumber)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.id, brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, monthlyFee, userId, contractPeriod, endDate, siemensContractNumber, sellerId, trackingNumber || null);
    
    // Auto-activate "Select Care" service
    activateService(req.params.id, 'Select Care');
    
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
      const { brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, monthlyFee, userId, contractPeriod, endDate, siemensContractNumber, sellerId, trackingNumber } = req.body;
      db.prepare(`
        UPDATE select_care 
        SET brand = ?, model = ?, color = ?, memory = ?, imei = ?, purchasePlace = ?, orderNumber = ?, purchaseDate = ?, purchasePrice = ?, monthlyFee = ?, userId = ?, contractPeriod = ?, endDate = ?, siemensContractNumber = ?, sellerId = ?, trackingNumber = ?
        WHERE id = ?
      `).run(brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, monthlyFee, userId, contractPeriod, endDate, siemensContractNumber, sellerId, trackingNumber || null, req.params.id);
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

    const isPrivileged = isAdmin === 'true' || isAdmin === '1' || role?.toString().toLowerCase() === 'administratör' || role?.toString().toLowerCase() === 'support';
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

    const isPrivileged = isAdmin === 'true' || isAdmin === '1' || role?.toString().toLowerCase() === 'administratör' || role?.toString().toLowerCase() === 'support';
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

    const isPrivileged = isAdmin === 'true' || isAdmin === '1' || role?.toString().toLowerCase() === 'administratör' || role?.toString().toLowerCase() === 'support';
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
  app.get('/api/users/support-staff', (req, res) => {
    try {
      const staff = db.prepare(`
        SELECT id, firstName, lastName, role, isAdmin 
        FROM users 
        WHERE isAdmin = 1 OR role = 'Support'
        ORDER BY firstName ASC
      `).all();
      res.json(staff);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch support staff' });
    }
  });

  app.post('/api/support-tickets/:id/assign', (req, res) => {
    const { id } = req.params;
    const { assignedTo, userId, note } = req.body;

    try {
      const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(id);
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

      const assignee = db.prepare('SELECT firstName, lastName FROM users WHERE id = ?').get(assignedTo);
      const assigneeName = assignee ? `${assignee.firstName} ${assignee.lastName}` : 'Ingen';

      db.prepare(`
        UPDATE support_tickets 
        SET assignedTo = ?, isReadByAdmin = 0, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(assignedTo, id);

      // Add log
      db.prepare(`
        INSERT INTO support_ticket_logs (ticketId, userId, action, note)
        VALUES (?, ?, ?, ?)
      `).run(id, userId, 'Tilldelning', note || `Ärendet tilldelades till ${assigneeName}`);

      // Broadcast notification via WebSocket if assignee is online
      const notification = JSON.stringify({
        type: 'notification',
        message: `Du har tilldelats supportärende ${id}`,
        ticketId: id
      });

      wss.clients.forEach((client) => {
        const user = activeUsers.get(client);
        if (user && user.id === Number(assignedTo) && client.readyState === WebSocket.OPEN) {
          client.send(notification);
        }
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to assign ticket' });
    }
  });

  app.get("/api/support-tickets/new/count", (req, res) => {
    const { userId, isAdmin, role } = req.query;
    const isPrivileged = isAdmin === 'true' || isAdmin === '1' || role?.toString().toLowerCase() === 'administratör' || role?.toString().toLowerCase() === 'support';
    
    let count;
    if (isPrivileged) {
      count = db.prepare("SELECT COUNT(*) as count FROM support_tickets WHERE isReadByAdmin = 0 OR (isTagged = 1 AND taggedUserId = ?)").get(userId).count;
    } else {
      count = db.prepare(`
        SELECT COUNT(*) as count 
        FROM support_tickets t
        JOIN customers c ON t.customerId = c.id
        WHERE (t.isReadByCreator = 0 AND (c.responsibleSeller = (SELECT firstName || ' ' || lastName FROM users WHERE id = ?) OR t.createdBy = ?))
        OR (t.isTagged = 1 AND t.taggedUserId = ?)
      `).get(userId, userId, userId).count;
    }
    res.json({ count });
  });

  app.get("/api/support-tickets", (req, res) => {
    const { userId, isAdmin, role, customerId } = req.query;
    const isPrivileged = isAdmin === 'true' || isAdmin === '1' || role?.toString().toLowerCase() === 'administratör' || role?.toString().toLowerCase() === 'support';
    
    let tickets;
    if (isPrivileged) {
      let query = `
        SELECT t.*, c.name as customerName, u.firstName || ' ' || u.lastName as creatorName,
               sc.brand || ' ' || sc.model as deviceName,
               ua.firstName || ' ' || ua.lastName as assignedName
        FROM support_tickets t
        JOIN customers c ON t.customerId = c.id
        LEFT JOIN users u ON t.createdBy = u.id
        LEFT JOIN users ua ON t.assignedTo = ua.id
        LEFT JOIN select_care sc ON t.selectCareId = sc.id
      `;
      let params = [];
      if (customerId) {
        query += " WHERE t.customerId = ?";
        params.push(customerId);
      }
      query += " ORDER BY t.updatedAt DESC";
      tickets = db.prepare(query).all(...params);
    } else {
      // Users can only see tickets for customers they are responsible for (sellerId) OR where they are tagged
      let query = `
        SELECT t.*, c.name as customerName, u.firstName || ' ' || u.lastName as creatorName,
               sc.brand || ' ' || sc.model as deviceName,
               ua.firstName || ' ' || ua.lastName as assignedName
        FROM support_tickets t
        JOIN customers c ON t.customerId = c.id
        LEFT JOIN users u ON t.createdBy = u.id
        LEFT JOIN users ua ON t.assignedTo = ua.id
        LEFT JOIN select_care sc ON t.selectCareId = sc.id
        WHERE (c.responsibleSeller = (SELECT firstName || ' ' || lastName FROM users WHERE id = ?)
        OR t.taggedUserId = ?)
      `;
      let params = [userId, userId];
      if (customerId) {
        query += " AND t.customerId = ?";
        params.push(customerId);
      }
      query += " ORDER BY t.updatedAt DESC";
      tickets = db.prepare(query).all(...params);
    }
    res.json(tickets);
  });

  app.get("/api/support-tickets/:id", (req, res) => {
    const ticket = db.prepare(`
      SELECT t.*, c.name as customerName, c.responsibleSeller, u.firstName || ' ' || u.lastName as creatorName,
             sc.brand || ' ' || sc.model as deviceName,
             ua.firstName || ' ' || ua.lastName as assignedName
      FROM support_tickets t
      JOIN customers c ON t.customerId = c.id
      LEFT JOIN users u ON t.createdBy = u.id
      LEFT JOIN users ua ON t.assignedTo = ua.id
      LEFT JOIN select_care sc ON t.selectCareId = sc.id
      WHERE t.id = ?
    `).get(req.params.id);
    
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    
    const { userId, isAdmin, role } = req.query;
    const isPrivileged = isAdmin === 'true' || isAdmin === '1' || role?.toString().toLowerCase() === 'administratör' || role?.toString().toLowerCase() === 'support';

    // Mark as read when viewed
    if (isPrivileged) {
      db.prepare('UPDATE support_tickets SET isReadByAdmin = 1, isTagged = 0 WHERE id = ?').run(req.params.id);
    } else {
      db.prepare('UPDATE support_tickets SET isReadByCreator = 1, isTagged = 0 WHERE id = ?').run(req.params.id);
    }
    
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
    try {
      const { customerId, selectCareId, title, description, status, priority, createdBy, assignedTo } = req.body;
      
      if (!customerId || !title) {
        return res.status(400).json({ error: "Företag och titel krävs" });
      }

      const ticketNumber = `SUP-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      
      const user = db.prepare('SELECT isAdmin, role FROM users WHERE id = ?').get(createdBy) as any;
      const isPrivileged = user && (user.isAdmin === 1 || user.role?.toLowerCase() === 'administratör' || user.role?.toLowerCase() === 'support');
      
      // If assigned to a privileged user, set isReadByAdmin to 0 so they get a notification
      // regardless of who created it.
      let isReadByAdmin = isPrivileged ? 1 : 0;
      if (assignedTo) {
        // If assigned to someone, we want that person to see a notification
        isReadByAdmin = 0;
      } else if (!isPrivileged) {
        // If not assigned and created by a non-privileged user, admins should see it
        isReadByAdmin = 0;
      }
      
      const isReadByCreator = isPrivileged ? 0 : 1;

      const result = db.prepare(`
        INSERT INTO support_tickets (ticketNumber, customerId, selectCareId, title, description, status, priority, createdBy, assignedTo, isReadByAdmin, isReadByCreator)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(ticketNumber, customerId, selectCareId || null, title, description, status || 'Registrerad', priority || 'Normal', createdBy || null, assignedTo || null, isReadByAdmin, isReadByCreator);
      
      db.prepare(`
        INSERT INTO support_ticket_logs (ticketId, userId, action, note)
        VALUES (?, ?, ?, ?)
      `).run(result.lastInsertRowid, createdBy || null, 'Skapad', assignedTo ? `Ärendet har registrerats och tilldelats` : 'Ärendet har registrerats');
      
      res.json({ id: result.lastInsertRowid, ticketNumber });
    } catch (error) {
      console.error("Failed to create support ticket:", error);
      res.status(500).json({ error: "Kunde inte spara supportärendet" });
    }
  });

  app.put("/api/support-tickets/:id", (req, res) => {
    const { title, description, status, priority, userId, note } = req.body;
    const { id } = req.params;
    
    const oldTicket = db.prepare('SELECT status, selectCareId FROM support_tickets WHERE id = ?').get(id);
    
    db.transaction(() => {
      const user = db.prepare('SELECT isAdmin, role FROM users WHERE id = ?').get(userId) as any;
      const isPrivileged = user && (user.isAdmin === 1 || user.role?.toLowerCase() === 'administratör' || user.role?.toLowerCase() === 'support');

      db.prepare(`
        UPDATE support_tickets 
        SET title = ?, description = ?, status = ?, priority = ?, updatedAt = CURRENT_TIMESTAMP, 
            isReadByAdmin = ?, isReadByCreator = ?, isTagged = 0
        WHERE id = ?
      `).run(title, description, status, priority, isPrivileged ? 1 : 0, isPrivileged ? 0 : 1, id);
      
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
      const user = db.prepare('SELECT isAdmin, role FROM users WHERE id = ?').get(userId) as any;
      const isPrivileged = user && (user.isAdmin === 1 || user.role?.toLowerCase() === 'administratör' || user.role?.toLowerCase() === 'support');

      db.prepare(`
        INSERT INTO support_ticket_logs (ticketId, userId, action, note)
        VALUES (?, ?, ?, ?)
      `).run(id, userId, action || 'Kommentar', note);
      
      if (isPrivileged) {
        db.prepare('UPDATE support_tickets SET updatedAt = CURRENT_TIMESTAMP, isReadByCreator = 0, isReadByAdmin = 1 WHERE id = ?').run(id);
      } else {
        db.prepare('UPDATE support_tickets SET updatedAt = CURRENT_TIMESTAMP, isReadByAdmin = 0, isReadByCreator = 1 WHERE id = ?').run(id);
      }

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

  app.post("/api/support-tickets/:id/tag-seller", (req, res) => {
    const { userId, sellerName } = req.body;
    const { id } = req.params;
    
    try {
      const seller = db.prepare("SELECT id FROM users WHERE firstName || ' ' || lastName = ?").get(sellerName) as any;
      const sellerId = seller?.id;

      db.transaction(() => {
        db.prepare(`
          INSERT INTO support_ticket_logs (ticketId, userId, action, note)
          VALUES (?, ?, ?, ?)
        `).run(id, userId, 'Säljare taggad', `Säljaren ${sellerName} har taggats i ärendet.`);
        
        db.prepare('UPDATE support_tickets SET updatedAt = CURRENT_TIMESTAMP, isTagged = 1, taggedUserId = ? WHERE id = ?').run(sellerId || null, id);
      })();

      // Broadcast notification via WebSocket if seller is online
      const notification = JSON.stringify({
        type: 'notification',
        message: `Du har taggats i supportärende ${id}`,
        ticketId: id
      });

      wss.clients.forEach((client) => {
        const user = activeUsers.get(client);
        if (user && `${user.firstName} ${user.lastName}` === sellerName && client.readyState === WebSocket.OPEN) {
          client.send(notification);
        }
      });
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
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
    const { sellerId, isAdmin, year } = req.query;
    const isUserAdmin = isAdmin === 'true' || isAdmin === '1';
    
    // Get year from query or default to current year
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    const yearStr = targetYear.toString();
    
    // Generate all months for the target year
    const months = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return `${yearStr}-${month.toString().padStart(2, '0')}`;
    });

    // Determine filtering
    let filterClause = '';
    let filterParams: any[] = [yearStr];
    let customerFilterClause = '';
    let customerFilterParams: any[] = [];

    const sId = sellerId && sellerId !== 'undefined' && sellerId !== 'null' && sellerId !== '' ? Number(sellerId) : null;

    if (sId !== null) {
      filterClause = 'AND sellerId = ?';
      filterParams.push(sId);
      
      // For customers, we need to filter by responsibleSeller name
      const user = db.prepare('SELECT firstName, lastName FROM users WHERE id = ?').get(sId) as any;
      if (user) {
        const fullName = `${user.firstName} ${user.lastName}`;
        customerFilterClause = 'WHERE responsibleSeller = ?';
        customerFilterParams.push(fullName);
      }
    } else if (!isUserAdmin) {
      // If not admin and no sellerId provided, this shouldn't happen with correct frontend logic
      // but we'll return an empty state or error
      return res.status(403).json({ error: "Obehörig åtkomst" });
    }

    const customerCount = db.prepare(`SELECT COUNT(*) as count FROM customers ${customerFilterClause}`).get(...customerFilterParams).count;

    // Helper to get monthly stats
    const getMonthlyStats = (table: string, dateCol: string, revenueCol: string) => {
      const raw = db.prepare(`
        SELECT strftime('%Y-%m', ${dateCol}) as month, COUNT(*) as count, SUM(${revenueCol}) as revenue
        FROM ${table}
        WHERE strftime('%Y', ${dateCol}) = ? ${filterClause}
        GROUP BY month
      `).all(...filterParams);

      return months.map(m => {
        const found = raw.find((s: any) => s.month === m);
        return {
          month: m,
          count: found ? found.count : 0,
          revenue: found ? found.revenue : 0
        };
      });
    };

    const equipmentSales = getMonthlyStats('equipment', 'purchaseDate', 'customerPrice');
    const selectCareSales = getMonthlyStats('select_care', 'purchaseDate', 'monthlyFee');
    const drivingLogSales = getMonthlyStats('driving_logs', 'createdAt', 'monthlyFee');
    const itEquipmentSales = getMonthlyStats('it_equipment', 'purchaseDate', 'customerPrice');

    // Top items (filtered by year and seller)
    const topModel = db.prepare(`
      SELECT brand, model, COUNT(*) as count 
      FROM equipment 
      WHERE strftime('%Y', purchaseDate) = ? ${filterClause}
      GROUP BY brand, model 
      ORDER BY count DESC 
      LIMIT 1
    `).get(...filterParams);
    
    const topMobiles = db.prepare(`
      SELECT brand, model, COUNT(*) as count 
      FROM equipment 
      WHERE strftime('%Y', purchaseDate) = ? ${filterClause}
      GROUP BY brand, model 
      ORDER BY count DESC 
      LIMIT 5
    `).all(...filterParams);

    // Total Revenue (filtered by year and seller)
    const getSum = (table: string, dateCol: string, col: string) => {
      return db.prepare(`
        SELECT SUM(${col}) as total 
        FROM ${table} 
        WHERE strftime('%Y', ${dateCol}) = ? ${filterClause}
      `).get(...filterParams).total || 0;
    };

    const equipmentRevenue = getSum('equipment', 'purchaseDate', 'customerPrice');
    const selectCareRevenue = getSum('select_care', 'purchaseDate', 'monthlyFee');
    const drivingLogRevenue = getSum('driving_logs', 'createdAt', 'monthlyFee');

    const drivingLogsCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM driving_logs 
      WHERE strftime('%Y', createdAt) = ? ${filterClause}
    `).get(...filterParams).count || 0;

    // Expiring Select Care (within 6 months)
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    const sixMonthsStr = sixMonthsFromNow.toISOString().split('T')[0];
    
    let expiringSelectCare;
    let expiringContracts;

    const expiringFilterClause = sId !== null ? 'AND sellerId = ?' : '';
    const expiringParams = sId !== null ? [sixMonthsStr, sId] : [sixMonthsStr];

    expiringSelectCare = db.prepare(`
      SELECT sc.*, c.name as customerName
      FROM select_care sc
      JOIN customers c ON sc.customerId = c.id
      WHERE sc.endDate <= ? AND sc.endDate >= date('now') ${expiringFilterClause}
      ORDER BY sc.endDate ASC
    `).all(...expiringParams);

    expiringContracts = db.prepare(`
      SELECT con.*, c.name as customerName
      FROM contracts con
      JOIN customers c ON con.customerId = c.id
      WHERE con.endDate <= ? AND con.endDate >= date('now') ${expiringFilterClause}
      ORDER BY con.endDate ASC
    `).all(...expiringParams);

    // Top Sellers (filtered by year)
    const topSellers = db.prepare(`
      SELECT u.firstName, u.lastName, SUM(t.total) as totalRevenue
      FROM (
        SELECT sellerId, SUM(customerPrice) as total FROM equipment WHERE strftime('%Y', purchaseDate) = ? GROUP BY sellerId
        UNION ALL
        SELECT sellerId, SUM(monthlyFee) as total FROM select_care WHERE strftime('%Y', purchaseDate) = ? GROUP BY sellerId
        UNION ALL
        SELECT sellerId, SUM(monthlyFee) as total FROM driving_logs WHERE strftime('%Y', createdAt) = ? GROUP BY sellerId
        UNION ALL
        SELECT sellerId, SUM(customerPrice) as total FROM it_equipment WHERE strftime('%Y', purchaseDate) = ? GROUP BY sellerId
      ) t
      JOIN users u ON t.sellerId = u.id
      GROUP BY t.sellerId
      ORDER BY totalRevenue DESC
      LIMIT 10
    `).all(yearStr, yearStr, yearStr, yearStr);

    res.json({
      customerCount,
      equipmentSales,
      selectCareSales,
      drivingLogSales,
      itEquipmentSales,
      topModel,
      equipmentRevenue,
      selectCareRevenue,
      drivingLogRevenue,
      drivingLogsCount,
      expiringSelectCare,
      expiringContracts,
      topSellers,
      topMobiles
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
