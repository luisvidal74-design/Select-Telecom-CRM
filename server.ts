import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import multer from "multer";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { firestore } from "./src/lib/firestore-wrapper.js";
import firebaseConfig from "./firebase-applet-config.json";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin for Auth
const firebaseApp = initializeApp({
  credential: applicationDefault(),
  projectId: firebaseConfig.projectId,
});
const adminAuth = getAuth(firebaseApp);

// Removed SQLite initialization

// Removed SQLite initialization

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = process.env.PORT || 3000;

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
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const trimmedEmail = email?.trim();
    const trimmedPassword = password?.trim();
    console.log(`Login attempt for: ${trimmedEmail}`);
    
    try {
      const usersRef = firestore.collection('users');
      const snapshot = await usersRef.where('email', '==', trimmedEmail).get();
      
      if (snapshot.empty) {
        console.log(`Login failed for: ${trimmedEmail}`);
        return res.status(401).json({ error: "Fel e-post eller lösenord." });
      }

      const userDoc = snapshot.docs[0];
      const user = { id: userDoc.id, ...userDoc.data() } as any;

      if (user.password === trimmedPassword) {
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
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: "Ett fel uppstod vid inloggning." });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    try {
      const usersSnapshot = await firestore.collection('users').where('email', '==', email?.trim()).get();
      const userDoc = usersSnapshot.docs[0];
      
      if (userDoc) {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
        
        await userDoc.ref.update({ resetToken: token, resetTokenExpires: expires });
        
        const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
        console.log(`Password reset requested for ${email}. Reset link: ${resetLink}`);
        
        res.json({ success: true, message: "Om e-postadressen finns i vårt system har ett mejl skickats.", debugToken: token });
      } else {
        res.json({ success: true, message: "Om e-postadressen finns i vårt system har ett mejl skickats." });
      }
    } catch (error) {
      res.status(500).json({ error: "Ett fel uppstod vid begäran om lösenordsåterställning." });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { token, password } = req.body;
    try {
      const usersSnapshot = await firestore.collection('users')
        .where('resetToken', '==', token)
        .where('resetTokenExpires', '>', new Date().toISOString())
        .get();
      
      const userDoc = usersSnapshot.docs[0];
      
      if (userDoc) {
        await userDoc.ref.update({ 
          password, 
          resetToken: null, 
          resetTokenExpires: null 
        });
        res.json({ success: true });
      } else {
        res.status(400).json({ error: "Länken är ogiltig eller har gått ut." });
      }
    } catch (error) {
      res.status(500).json({ error: "Ett fel uppstod vid återställning av lösenord." });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    const { firstName, lastName, email, password, phone, office } = req.body;
    try {
      const existingUser = await firestore.collection('users').where('email', '==', email).get();
      if (!existingUser.empty) {
        return res.status(400).json({ error: "E-postadressen används redan." });
      }

      await firestore.collection('users').add({
        firstName,
        lastName,
        email,
        password,
        phone,
        status: 'pending',
        office: office || null,
        createdAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Kunde inte registrera användaren." });
    }
  });

  // User Management
  app.get("/api/users", async (req, res) => {
    try {
      const snapshot = await firestore.collection('users').get();
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Kunde inte hämta användare." });
    }
  });

  app.get("/api/users/pending/count", async (req, res) => {
    try {
      const snapshot = await firestore.collection('users').where('status', '==', 'pending').get();
      res.json({ count: snapshot.size });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte hämta antal väntande användare." });
    }
  });

  app.post("/api/users/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      await firestore.collection('users').doc(id).update({ status });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte uppdatera status." });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, password, profilePic, role, isAdmin, isSupport, phone, office } = req.body;
    
    try {
      const userRef = firestore.collection('users').doc(id);
      const userDoc = await userRef.get();
      if (!userDoc.exists) return res.status(404).json({ error: "Användaren hittades inte" });
      const currentUser = userDoc.data()!;

      const updateData: any = {
        firstName: firstName || currentUser.firstName,
        lastName: lastName || currentUser.lastName,
        profilePic: profilePic || currentUser.profilePic,
        role: role || currentUser.role,
        isAdmin: isAdmin !== undefined ? isAdmin : currentUser.isAdmin,
        isSupport: isSupport !== undefined ? isSupport : currentUser.isSupport,
        phone: phone || currentUser.phone,
        office: office || currentUser.office,
        updatedAt: new Date().toISOString()
      };

      if (password) {
        updateData.password = password;
      }

      await userRef.update(updateData);
      const updatedUser = await userRef.get();
      res.json({ id: updatedUser.id, ...updatedUser.data() });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte uppdatera användaren." });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await firestore.collection('users').doc(id).delete();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte ta bort användaren." });
    }
  });

  app.post("/api/users/:id/read-news", async (req, res) => {
    const { id } = req.params;
    const timestamp = new Date().toISOString();
    try {
      await firestore.collection('users').doc(id).update({ lastReadNewsTimestamp: timestamp });
      res.json({ success: true, timestamp });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte uppdatera nyhetsstämpel." });
    }
  });

  // Helper to activate a service for a customer
  const activateService = async (customerId: string, serviceName: string) => {
    try {
      const customerRef = firestore.collection('customers').doc(customerId);
      const customerDoc = await customerRef.get();
      if (!customerDoc.exists) return;
      const customer = customerDoc.data()!;

      let services = [];
      try {
        services = typeof customer.services === 'string' ? JSON.parse(customer.services || '[]') : (customer.services || []);
      } catch (e) {
        services = [];
      }

      if (!Array.isArray(services)) services = [];

      if (!services.includes(serviceName)) {
        services.push(serviceName);
        await customerRef.update({ services: JSON.stringify(services) });
      }
    } catch (error) {
      console.error('Failed to activate service:', error);
    }
  };

  // Customers
  app.get("/api/customers", async (req, res) => {
    const { userId, isAdmin, role } = req.query;
    const isPrivileged = isAdmin === 'true' || isAdmin === '1' || role?.toString().toLowerCase() === 'administratör' || role?.toString().toLowerCase() === 'support';
    
    try {
      let customers;
      if (isPrivileged) {
        const snapshot = await firestore.collection('customers').get();
        customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else if (role === 'Kund') {
        const userDoc = await firestore.collection('users').doc(userId?.toString() || '').get();
        const user = userDoc.data();
        if (user && user.customerId) {
          const customerDoc = await firestore.collection('customers').doc(user.customerId).get();
          customers = customerDoc.exists ? [{ id: customerDoc.id, ...customerDoc.data() }] : [];
        } else {
          customers = [];
        }
      } else {
        const userDoc = await firestore.collection('users').doc(userId?.toString() || '').get();
        const user = userDoc.data();
        const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
        const snapshot = await firestore.collection('customers').where('responsibleSeller', '==', fullName).get();
        customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Kunde inte hämta kunder." });
    }
  });

  app.post("/api/customers", async (req, res) => {
    const { name, orgNumber, address, city, zipCode, contactPerson, contactPhone, contactEmail, responsibleSeller, website, services } = req.body;
    
    try {
      const docRef = await firestore.collection('customers').add({
        name,
        orgNumber,
        address,
        city,
        zipCode,
        contactPerson,
        contactPhone,
        contactEmail,
        responsibleSeller,
        website,
        services: services || '[]',
        createdAt: new Date().toISOString()
      });
      
      const customerId = docRef.id;

      // Automatically create a customer user
      if (contactPerson && contactEmail) {
        const names = contactPerson.split(' ');
        const firstName = names[0] || '';
        const lastName = names.slice(1).join(' ') || '';
        
        await firestore.collection('customer_users').add({
          customerId,
          firstName,
          lastName,
          email: contactEmail,
          phone: contactPhone || '',
          role: 'Kontaktperson',
          createdAt: new Date().toISOString()
        });
      }

      res.json({ id: customerId });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte spara kunden." });
    }
  });

  app.post("/api/customers/bulk", async (req, res) => {
    const { customers } = req.body;
    if (!Array.isArray(customers)) return res.status(400).json({ error: "Invalid data format" });

    try {
      const results = [];
      const batch = firestore.batch();

      for (const item of customers) {
        const customerRef = firestore.collection('customers').doc();
        batch.set(customerRef, {
          name: item.name,
          orgNumber: item.orgNumber,
          address: item.address || '',
          city: item.city || '',
          zipCode: item.zipCode || '',
          contactPerson: item.contactPerson || '',
          contactPhone: item.contactPhone || '',
          contactEmail: item.contactEmail || '',
          responsibleSeller: item.responsibleSeller || '',
          website: item.website || '',
          services: item.services || '[]',
          createdAt: new Date().toISOString()
        });
        
        const customerId = customerRef.id;
        results.push(customerId);
        
        if (item.contactPerson && item.contactEmail) {
          const names = item.contactPerson.split(' ');
          const firstName = names[0] || '';
          const lastName = names.slice(1).join(' ') || '';
          const userRef = firestore.collection('customer_users').doc();
          batch.set(userRef, {
            customerId,
            firstName,
            lastName,
            email: item.contactEmail,
            phone: item.contactPhone || '',
            role: 'Kontaktperson',
            createdAt: new Date().toISOString()
          });
        }
      }

      await batch.commit();
      res.json({ success: true, count: results.length });
    } catch (e) {
      console.error('Bulk import error:', e);
      res.status(500).json({ error: "Ett fel uppstod vid massimport." });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    const { id } = req.params;
    const { userId, isAdmin, role } = req.query;
    const isPrivileged = isAdmin === 'true' || isAdmin === '1' || role?.toString().toLowerCase() === 'administratör' || role?.toString().toLowerCase() === 'support';

    try {
      const customerDoc = await firestore.collection('customers').doc(id).get();
      if (!customerDoc.exists) return res.status(404).json({ error: "Customer not found" });
      const customer = customerDoc.data()!;

      if (!isPrivileged) {
        if (role === 'Kund') {
          const userDoc = await firestore.collection('users').doc(userId?.toString() || '').get();
          const user = userDoc.data();
          if (!user || user.customerId !== id) {
            return res.status(403).json({ error: "Du har inte tillgång till denna kund." });
          }
        } else {
          const userDoc = await firestore.collection('users').doc(userId?.toString() || '').get();
          const user = userDoc.data();
          const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
          if (customer.responsibleSeller !== fullName) {
            return res.status(403).json({ error: "Du har inte tillgång till denna kund." });
          }
        }
      }

      const usersSnapshot = await firestore.collection('customer_users').where('customerId', '==', id).get();
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const equipmentSnapshot = await firestore.collection('equipment').where('customerId', '==', id).get();
      let equipment = equipmentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const selectCareSnapshot = await firestore.collection('select_care').where('customerId', '==', id).get();
      let selectCare = selectCareSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const contractsSnapshot = await firestore.collection('contracts').where('customerId', '==', id).orderBy('createdAt', 'desc').get();
      let contracts = contractsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (!isPrivileged) {
        contracts = contracts.filter((c: any) => c.sellerId === userId);
      }
      
      const itEquipmentSnapshot = await firestore.collection('it_equipment').where('customerId', '==', id).orderBy('createdAt', 'desc').get();
      let itEquipment = await Promise.all(itEquipmentSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const userDoc = await firestore.collection('customer_users').doc(data.userId || '').get();
        const sellerDoc = await firestore.collection('users').doc(data.sellerId || '').get();
        return {
          id: doc.id,
          ...data,
          userName: userDoc.exists ? `${userDoc.data()?.firstName} ${userDoc.data()?.lastName}` : 'Okänd',
          sellerName: sellerDoc.exists ? `${sellerDoc.data()?.firstName} ${sellerDoc.data()?.lastName}` : 'Okänd'
        };
      }));

      const o365Snapshot = await firestore.collection('o365_licenses').where('customerId', '==', id).orderBy('createdAt', 'desc').get();
      let o365Licenses = await Promise.all(o365Snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const userDoc = await firestore.collection('customer_users').doc(data.userId || '').get();
        return {
          id: doc.id,
          ...data,
          userName: userDoc.exists ? `${userDoc.data()?.firstName} ${userDoc.data()?.lastName}` : 'Okänd'
        };
      }));

      if (role === 'Kund') {
        equipment = equipment.map((e: any) => {
          const { purchasePrice, notes, ...rest } = e;
          return rest;
        });
        itEquipment = itEquipment.map((e: any) => {
          const { purchasePrice, comment, ...rest } = e;
          return rest;
        });
        o365Licenses = o365Licenses.map((l: any) => {
          const { password, ...rest } = l;
          return rest;
        });
        selectCare = selectCare.map((sc: any) => {
          const { purchasePrice, ...rest } = sc;
          return rest;
        });
        contracts = [];
      } else if (isAdmin !== 'true' && isAdmin !== '1') {
        o365Licenses = o365Licenses.map((l: any) => {
          const { password, ...rest } = l;
          return rest;
        });
      }

      const contractsWithFiles = await Promise.all(contracts.map(async (c: any) => {
        const filesSnapshot = await firestore.collection('contract_files').where('contractId', '==', c.id).get();
        const files = filesSnapshot.docs.map(doc => {
          const { data, ...rest } = doc.data();
          return { id: doc.id, ...rest };
        });
        return { ...c, files };
      }));

      const selectCareWithLogs = await Promise.all(selectCare.map(async (sc: any) => {
        let logs = [];
        if (role !== 'Kund') {
          const logsSnapshot = await firestore.collection('select_care_logs').where('selectCareId', '==', sc.id).orderBy('createdAt', 'desc').get();
          logs = logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        return { ...sc, logs };
      }));

      const historySnapshot = await firestore.collection('select_care_history').where('customerId', '==', id).orderBy('deletedAt', 'desc').get();
      const selectCareHistory = role === 'Kund' ? [] : historySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      res.json({ 
        id: customerDoc.id,
        ...customer, 
        users, 
        equipment, 
        itEquipment, 
        o365Licenses, 
        selectCare: selectCareWithLogs, 
        selectCareHistory, 
        contracts: contractsWithFiles 
      });
    } catch (error) {
      console.error('Error fetching customer details:', error);
      res.status(500).json({ error: "Kunde inte hämta kunduppgifter." });
    }
  });

  app.put("/api/customers/:id", async (req, res) => {
    const { name, orgNumber, address, city, zipCode, contactPerson, contactPhone, contactEmail, responsibleSeller, website, services } = req.body;
    try {
      await firestore.collection('customers').doc(req.params.id).update({
        name,
        orgNumber,
        address,
        city,
        zipCode,
        contactPerson,
        contactPhone,
        contactEmail,
        responsibleSeller,
        website,
        services: typeof services === 'string' ? services : JSON.stringify(services),
        updatedAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte uppdatera kunden." });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const batch = firestore.batch();
      
      const usersSnapshot = await firestore.collection('customer_users').where('customerId', '==', id).get();
      usersSnapshot.forEach(doc => batch.delete(doc.ref));
      
      const equipmentSnapshot = await firestore.collection('equipment').where('customerId', '==', id).get();
      equipmentSnapshot.forEach(doc => batch.delete(doc.ref));
      
      const scSnapshot = await firestore.collection('select_care').where('customerId', '==', id).get();
      scSnapshot.forEach(doc => batch.delete(doc.ref));
      
      const historySnapshot = await firestore.collection('select_care_history').where('customerId', '==', id).get();
      historySnapshot.forEach(doc => batch.delete(doc.ref));
      
      batch.delete(firestore.collection('customers').doc(id));
      
      await batch.commit();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte ta bort kunden." });
    }
  });

  // Customer Users
  app.post("/api/customers/:id/users", async (req, res) => {
    const { firstName, lastName, email, phone, role, office, isAuthorizedBuyer, isDrivingLogAdmin } = req.body;
    try {
      await firestore.collection('customer_users').add({
        customerId: req.params.id,
        firstName,
        lastName,
        email,
        phone,
        role,
        office,
        isAuthorizedBuyer: isAuthorizedBuyer || 0,
        isDrivingLogAdmin: isDrivingLogAdmin || 0,
        createdAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte lägga till användare." });
    }
  });

  app.delete("/api/customer-users/:id", async (req, res) => {
    try {
      await firestore.collection('customer_users').doc(req.params.id).delete();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte ta bort användaren." });
    }
  });

  app.put("/api/customer-users/:id", async (req, res) => {
    const { firstName, lastName, email, phone, role, office, isAuthorizedBuyer, isDrivingLogAdmin } = req.body;
    try {
      await firestore.collection('customer_users').doc(req.params.id).update({
        firstName,
        lastName,
        email,
        phone,
        role,
        office,
        isAuthorizedBuyer: isAuthorizedBuyer || 0,
        isDrivingLogAdmin: isDrivingLogAdmin || 0,
        updatedAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte uppdatera användaren." });
    }
  });

  // Brands
  app.get("/api/brands", async (req, res) => {
    try {
      const snapshot = await firestore.collection('brands').get();
      const brands = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(brands);
    } catch (error) {
      res.status(500).json({ error: "Kunde inte hämta märken" });
    }
  });

  app.post("/api/brands", async (req, res) => {
    const { name } = req.body;
    try {
      const docRef = await firestore.collection('brands').add({ name });
      res.json({ id: docRef.id, success: true });
    } catch (e) {
      res.status(400).json({ error: "Kunde inte spara märket" });
    }
  });

  // Models
  app.get("/api/models", async (req, res) => {
    try {
      const snapshot = await firestore.collection('models').get();
      const models = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(models);
    } catch (error) {
      res.status(500).json({ error: "Kunde inte hämta modeller" });
    }
  });

  app.post("/api/models", async (req, res) => {
    const { name } = req.body;
    try {
      const docRef = await firestore.collection('models').add({ name });
      res.json({ id: docRef.id, success: true });
    } catch (e) {
      res.status(400).json({ error: "Kunde inte spara modellen" });
    }
  });

  // Colors
  app.get("/api/colors", async (req, res) => {
    try {
      const snapshot = await firestore.collection('colors').get();
      const colors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(colors);
    } catch (error) {
      res.status(500).json({ error: "Kunde inte hämta färger" });
    }
  });

  app.post("/api/colors", async (req, res) => {
    const { name } = req.body;
    try {
      const docRef = await firestore.collection('colors').add({ name });
      res.json({ id: docRef.id, success: true });
    } catch (e) {
      res.status(400).json({ error: "Kunde inte spara färgen" });
    }
  });

  // Memories
  app.get("/api/memories", async (req, res) => {
    try {
      const snapshot = await firestore.collection('memories').get();
      const memories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(memories);
    } catch (error) {
      res.status(500).json({ error: "Kunde inte hämta minnen" });
    }
  });

  app.post("/api/memories", async (req, res) => {
    const { name } = req.body;
    try {
      const docRef = await firestore.collection('memories').add({ name });
      res.json({ id: docRef.id, success: true });
    } catch (e) {
      res.status(400).json({ error: "Kunde inte spara minnet" });
    }
  });

  // Equipment
  app.get("/api/it-equipment/suggestions", async (req, res) => {
    try {
      const brandsSnapshot = await firestore.collection('it_brands').orderBy('name', 'asc').get();
      const modelsSnapshot = await firestore.collection('it_models').orderBy('name', 'asc').get();
      const memorySnapshot = await firestore.collection('it_memory').orderBy('name', 'asc').get();
      const purchasePlacesSnapshot = await firestore.collection('it_purchase_places').orderBy('name', 'asc').get();
      
      const brands = brandsSnapshot.docs.map(doc => doc.data().name);
      const models = modelsSnapshot.docs.map(doc => doc.data().name);
      const memory = memorySnapshot.docs.map(doc => doc.data().name);
      const purchasePlaces = purchasePlacesSnapshot.docs.map(doc => doc.data().name);
      
      const equipmentSnapshot = await firestore.collection('it_equipment').get();
      const equipmentData = equipmentSnapshot.docs.map(doc => doc.data());

      res.json({
        brands: [...new Set([...brands, ...equipmentData.map(r => r.brand).filter(Boolean)])],
        models: [...new Set([...models, ...equipmentData.map(r => r.model).filter(Boolean)])],
        memory: [...new Set([...memory, ...equipmentData.map(r => r.memory).filter(Boolean)])],
        purchasePlaces: [...new Set([...purchasePlaces, ...equipmentData.map(r => r.purchasePlace).filter(Boolean)])]
      });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte hämta förslag" });
    }
  });

  app.post("/api/it-equipment/brands", async (req, res) => {
    const { name } = req.body;
    try {
      await firestore.collection("it_brands").add({ name });
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Kunde inte spara märket" });
    }
  });

  app.post("/api/it-equipment/models", async (req, res) => {
    const { name } = req.body;
    try {
      await firestore.collection("it_models").add({ name });
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Kunde inte spara modellen" });
    }
  });

  app.post("/api/it-equipment/memory", async (req, res) => {
    const { name } = req.body;
    try {
      await firestore.collection("it_memory").add({ name });
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Kunde inte spara minnet" });
    }
  });

  app.post("/api/it-equipment/purchase-places", async (req, res) => {
    const { name } = req.body;
    try {
      await firestore.collection("it_purchase_places").add({ name });
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Kunde inte spara inköpsstället" });
    }
  });

  app.get("/api/customers/:id/it-equipment", async (req, res) => {
    try {
      const snapshot = await firestore.collection('it_equipment')
        .where('customerId', '==', req.params.id)
        .orderBy('createdAt', 'desc')
        .get();
      
      const equipment = await Promise.all(snapshot.docs.map(async (doc) => {
        const data = doc.data();
        let userName = '';
        let sellerName = '';

        if (data.userId) {
          const userDoc = await firestore.collection('customer_users').doc(data.userId.toString()).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            userName = `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim();
          }
        }

        if (data.sellerId) {
          const sellerDoc = await firestore.collection('users').doc(data.sellerId.toString()).get();
          if (sellerDoc.exists) {
            const sellerData = sellerDoc.data();
            sellerName = `${sellerData?.firstName || ''} ${sellerData?.lastName || ''}`.trim();
          }
        }

        return { id: doc.id, ...data, userName, sellerName };
      }));

      res.json(equipment);
    } catch (error) {
      res.status(500).json({ error: "Kunde inte hämta IT-utrustning" });
    }
  });

  app.post("/api/customers/:id/it-equipment", async (req, res) => {
    try {
      const { deviceName, brand, model, memory, serialNumber, trackingNumber, purchasePlace, orderNumber, purchaseDate, purchasePrice, customerPrice, sellerId, userId, comment } = req.body;
      const docRef = await firestore.collection('it_equipment').add({
        customerId: req.params.id,
        deviceName,
        brand,
        model,
        memory,
        serialNumber,
        trackingNumber,
        purchasePlace,
        orderNumber,
        purchaseDate,
        purchasePrice,
        customerPrice,
        sellerId,
        userId,
        comment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      res.json({ id: docRef.id });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte spara IT-utrustning" });
    }
  });

  app.put("/api/it-equipment/:id", async (req, res) => {
    try {
      const { deviceName, brand, model, memory, serialNumber, trackingNumber, purchasePlace, orderNumber, purchaseDate, purchasePrice, customerPrice, sellerId, userId, comment } = req.body;
      await firestore.collection('it_equipment').doc(req.params.id).update({
        deviceName,
        brand,
        model,
        memory,
        serialNumber,
        trackingNumber,
        purchasePlace,
        orderNumber,
        purchaseDate,
        purchasePrice,
        customerPrice,
        sellerId,
        userId,
        comment,
        updatedAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte uppdatera IT-utrustning" });
    }
  });

  app.delete("/api/it-equipment/:id", async (req, res) => {
    try {
      await firestore.collection('it_equipment').doc(req.params.id).delete();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte radera IT-utrustning" });
    }
  });

  // O365 Licenses
  app.get("/api/o365-licenses/types", async (req, res) => {
    try {
      const snapshot = await firestore.collection('o365_license_types').orderBy('name', 'asc').get();
      const types = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(types);
    } catch (error) {
      res.status(500).json({ error: "Kunde inte hämta licenstyper" });
    }
  });

  app.post("/api/o365-licenses/types", async (req, res) => {
    const { name } = req.body;
    try {
      const docRef = await firestore.collection('o365_license_types').add({ name });
      res.json({ id: docRef.id });
    } catch (e) {
      res.status(400).json({ error: "Licenstypen finns redan" });
    }
  });

  app.post("/api/o365-licenses", async (req, res) => {
    const { customerId, licenseType, email, password, price, startDate, bindingPeriod, endDate, userId, notes } = req.body;
    
    try {
      // Save license type if it doesn't exist (using a query to check)
      const typeSnapshot = await firestore.collection('o365_license_types').where('name', '==', licenseType).get();
      if (typeSnapshot.empty) {
        await firestore.collection('o365_license_types').add({ name: licenseType });
      }

      const docRef = await firestore.collection('o365_licenses').add({
        customerId,
        licenseType,
        email,
        password: password || null,
        price: price || null,
        startDate,
        bindingPeriod,
        endDate,
        userId: userId || null,
        notes: notes || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Auto-activate "O365 licenser" service
      await activateService(customerId, 'O365 licenser');
      
      res.json({ id: docRef.id });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte spara licens" });
    }
  });

  app.put("/api/o365-licenses/:id", async (req, res) => {
    const { licenseType, email, password, price, startDate, bindingPeriod, endDate, userId, notes } = req.body;
    const { id } = req.params;

    try {
      // Save license type if it doesn't exist
      const typeSnapshot = await firestore.collection('o365_license_types').where('name', '==', licenseType).get();
      if (typeSnapshot.empty) {
        await firestore.collection('o365_license_types').add({ name: licenseType });
      }

      await firestore.collection('o365_licenses').doc(id).update({
        licenseType,
        email,
        password: password || null,
        price: price || null,
        startDate,
        bindingPeriod,
        endDate,
        userId: userId || null,
        notes: notes || null,
        updatedAt: new Date().toISOString()
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte uppdatera licens" });
    }
  });

  app.delete("/api/o365-licenses/:id", async (req, res) => {
    try {
      await firestore.collection('o365_licenses').doc(req.params.id).delete();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte radera licens" });
    }
  });

  app.get("/api/equipment/suggestions", async (req, res) => {
    try {
      const equipmentSnapshot = await firestore.collection('equipment').get();
      const equipmentData = equipmentSnapshot.docs.map(doc => doc.data());

      const brandsSnapshot = await firestore.collection('brands').get();
      const modelsSnapshot = await firestore.collection('models').get();
      const colorsSnapshot = await firestore.collection('colors').get();
      const memoriesSnapshot = await firestore.collection('memories').get();

      const brands = [
        ...new Set([
          ...equipmentData.map(r => r.brand).filter(Boolean),
          ...brandsSnapshot.docs.map(doc => doc.data().name)
        ])
      ];
      const models = [
        ...new Set([
          ...equipmentData.map(r => r.model).filter(Boolean),
          ...modelsSnapshot.docs.map(doc => doc.data().name)
        ])
      ];
      const colors = [
        ...new Set([
          ...equipmentData.map(r => r.color).filter(Boolean),
          ...colorsSnapshot.docs.map(doc => doc.data().name)
        ])
      ];
      const memories = [
        ...new Set([
          ...equipmentData.map(r => r.memory).filter(Boolean),
          ...memoriesSnapshot.docs.map(doc => doc.data().name)
        ])
      ];
      res.json({ brands, models, colors, memories });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte hämta förslag" });
    }
  });

  app.post("/api/customers/:id/equipment", async (req, res) => {
    const { brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, customerPrice, sellerId, userId, trackingNumber, notes } = req.body;
    try {
      await firestore.collection('equipment').add({
        customerId: req.params.id,
        brand,
        model,
        color,
        memory,
        imei,
        purchasePlace,
        orderNumber,
        purchaseDate,
        purchasePrice,
        customerPrice,
        sellerId: sellerId || null,
        userId: userId || null,
        trackingNumber: trackingNumber || null,
        notes: notes || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Auto-activate "Telefoni" service
      await activateService(req.params.id, 'Telefoni');
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte spara utrustning" });
    }
  });

  app.delete("/api/equipment/:id", async (req, res) => {
    try {
      await firestore.collection('equipment').doc(req.params.id).delete();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte radera utrustning" });
    }
  });

  app.put("/api/equipment/:id", async (req, res) => {
    const { brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, customerPrice, sellerId, userId, trackingNumber, notes } = req.body;
    try {
      await firestore.collection('equipment').doc(req.params.id).update({
        brand,
        model,
        color,
        memory,
        imei,
        purchasePlace,
        orderNumber,
        purchaseDate,
        purchasePrice,
        customerPrice,
        sellerId: sellerId || null,
        userId: userId || null,
        trackingNumber: trackingNumber || null,
        notes: notes || null,
        updatedAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte uppdatera utrustning" });
    }
  });

  // News
  app.get("/api/news", async (req, res) => {
    try {
      const snapshot = await firestore.collection('news').orderBy('createdAt', 'desc').get();
      const news = await Promise.all(snapshot.docs.map(async (doc) => {
        const data = doc.data();
        let firstName = '';
        let lastName = '';
        if (data.authorId) {
          const userDoc = await firestore.collection('users').doc(data.authorId.toString()).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            firstName = userData?.firstName || '';
            lastName = userData?.lastName || '';
          }
        }
        return { id: doc.id, ...data, firstName, lastName };
      }));
      res.json(news);
    } catch (error) {
      res.status(500).json({ error: "Kunde inte hämta nyheter" });
    }
  });

  app.get("/api/news/:id", async (req, res) => {
    try {
      const doc = await firestore.collection('news').doc(req.params.id).get();
      if (!doc.exists) {
        return res.status(404).json({ error: "Nyheten hittades inte" });
      }
      const data = doc.data();
      let firstName = '';
      let lastName = '';
      if (data?.authorId) {
        const userDoc = await firestore.collection('users').doc(data.authorId.toString()).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          firstName = userData?.firstName || '';
          lastName = userData?.lastName || '';
        }
      }
      res.json({ id: doc.id, ...data, firstName, lastName });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte hämta nyheten" });
    }
  });

  app.post("/api/news", async (req, res) => {
    const { title, content, imageUrl, imageSize, authorId } = req.body;
    try {
      const docRef = await firestore.collection('news').add({
        title,
        content,
        imageUrl,
        imageSize: imageSize || 'large',
        authorId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Broadcast news update to all connected clients
      const payload = JSON.stringify({ type: 'news_update' });
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
      
      res.json({ id: docRef.id });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte spara nyhet" });
    }
  });

  app.put("/api/news/:id", async (req, res) => {
    const { title, content, imageUrl, imageSize } = req.body;
    try {
      await firestore.collection('news').doc(req.params.id).update({
        title,
        content,
        imageUrl,
        imageSize: imageSize || 'large',
        updatedAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte uppdatera nyhet" });
    }
  });

  app.delete("/api/news/:id", async (req, res) => {
    try {
      await firestore.collection('news').doc(req.params.id).delete();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte radera nyhet" });
    }
  });

  // Driving Logs Routes
  app.get("/api/customers/:id/driving-logs", async (req, res) => {
    try {
      const snapshot = await firestore.collection('driving_logs')
        .where('customerId', '==', req.params.id)
        .orderBy('createdAt', 'desc')
        .get();
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Kunde inte hämta körjournaler" });
    }
  });

  app.post("/api/customers/:id/driving-logs/bulk", async (req, res) => {
    const { logs, sellerId } = req.body; // Array of { regNo, driverName, email }
    const customerId = req.params.id;

    try {
      const batch = firestore.batch();
      
      // Delete existing logs for this customer
      const existingLogsSnapshot = await firestore.collection('driving_logs').where('customerId', '==', customerId).get();
      existingLogsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

      for (const log of logs) {
        const logRef = firestore.collection('driving_logs').doc();
        batch.set(logRef, {
          customerId,
          regNo: log.regNo,
          driverName: log.driverName,
          email: log.email,
          sellerId: sellerId || null,
          deviceType: log.deviceType || null,
          schema: log.schema || null,
          monthlyFee: log.monthlyFee || 0,
          password: log.password || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        // Check if user exists, if not create them, otherwise update
        const userSnapshot = await firestore.collection('customer_users')
          .where('customerId', '==', customerId)
          .where('email', '==', log.email)
          .get();

        const names = log.driverName.split(' ');
        const firstName = names[0] || '';
        const lastName = names.slice(1).join(' ') || '';

        if (userSnapshot.empty) {
          const userRef = firestore.collection('customer_users').doc();
          batch.set(userRef, {
            customerId,
            firstName,
            lastName,
            email: log.email,
            role: 'Förare',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } else {
          const userDoc = userSnapshot.docs[0];
          batch.update(userDoc.ref, {
            firstName,
            lastName,
            updatedAt: new Date().toISOString()
          });
        }
      }

      await batch.commit();
      
      // Auto-activate "Körjournaler" service
      await activateService(customerId, 'Körjournaler');
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte spara körjournaler" });
    }
  });

  app.delete("/api/driving-logs/:id", async (req, res) => {
    try {
      await firestore.collection('driving_logs').doc(req.params.id).delete();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte radera körjournal" });
    }
  });

  app.put("/api/driving-logs/:id", async (req, res) => {
    const { regNo, driverName, email, deviceType, schema, monthlyFee, sellerId, password } = req.body;
    try {
      await firestore.collection('driving_logs').doc(req.params.id).update({
        regNo,
        driverName,
        email,
        deviceType: deviceType || null,
        schema: schema || null,
        monthlyFee: monthlyFee || 0,
        sellerId: sellerId || null,
        password: password || null,
        updatedAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte uppdatera körjournal" });
    }
  });

  // Select Care
  app.get("/api/select-care", async (req, res) => {
    const { sellerId } = req.query;
    try {
      let query: any = firestore.collection('select_care');
      if (sellerId) {
        query = query.where('sellerId', '==', sellerId);
      }
      const snapshot = await query.get();
      const items = await Promise.all(snapshot.docs.map(async (doc) => {
        const data = doc.data();
        let customerName = '';
        if (data.customerId) {
          const customerDoc = await firestore.collection('customers').doc(data.customerId.toString()).get();
          if (customerDoc.exists) {
            customerName = customerDoc.data()?.name || '';
          }
        }
        return { id: doc.id, ...data, customerName };
      }));
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Kunde inte hämta Select Care" });
    }
  });

  app.post("/api/customers/:id/select-care", async (req, res) => {
    const { brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, monthlyFee, userId, contractPeriod, endDate, siemensContractNumber, sellerId, trackingNumber } = req.body;
    try {
      await firestore.collection('select_care').add({
        customerId: req.params.id,
        brand,
        model,
        color,
        memory,
        imei,
        purchasePlace,
        orderNumber,
        purchaseDate,
        purchasePrice,
        monthlyFee,
        userId,
        contractPeriod,
        endDate,
        siemensContractNumber,
        sellerId,
        trackingNumber: trackingNumber || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Auto-activate "Select Care" service
      await activateService(req.params.id, 'Select Care');
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte spara Select Care" });
    }
  });

  app.delete("/api/select-care/:id", async (req, res) => {
    const { id } = req.params;
    const deletedBy = req.query.deletedBy as string || 'Okänd';
    
    try {
      const docRef = firestore.collection('select_care').doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return res.status(404).json({ error: "Avtalet hittades inte" });
      }

      const item = doc.data()!;

      await firestore.runTransaction(async (transaction) => {
        transaction.set(firestore.collection('select_care_history').doc(), {
          originalId: id,
          ...item,
          deletedAt: new Date().toISOString(),
          deletedBy
        });
        transaction.delete(docRef);
      });
      
      res.json({ success: true, message: "Avtalet har raderats och arkiverats." });
    } catch (e: any) {
      res.status(500).json({ error: "Ett internt serverfel uppstod vid radering." });
    }
  });

  app.patch("/api/select-care/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status, notes, userId } = req.body;
    
    try {
      const docRef = firestore.collection('select_care').doc(id);
      const doc = await docRef.get();
      if (!doc.exists) return res.status(404).json({ error: 'Item not found' });
      const item = doc.data()!;

      await firestore.runTransaction(async (transaction) => {
        transaction.update(docRef, { status, updatedAt: new Date().toISOString() });
        transaction.set(firestore.collection('select_care_logs').doc(), {
          selectCareId: id,
          userId: userId || null,
          fromStatus: item.status,
          toStatus: status,
          notes: notes || '',
          createdAt: new Date().toISOString()
        });

        // If status is 'Under reparation', create a support ticket automatically
        if (status === 'Under reparation') {
          const ticketNumber = `SUP-${Date.now().toString().slice(-6)}`;
          const customerDoc = await firestore.collection('customers').doc(item.customerId.toString()).get();
          const customer = customerDoc.data();
          const title = `Reparation: ${item.brand} ${item.model} - ${customer?.name || 'Okänd kund'}`;
          
          const ticketRef = firestore.collection('support_tickets').doc();
          transaction.set(ticketRef, {
            ticketNumber,
            customerId: item.customerId,
            selectCareId: id,
            title,
            description: notes || 'Skickad för reparation via Select Care',
            status: 'Skickat för reparation',
            createdBy: userId || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

          transaction.set(firestore.collection('support_ticket_logs').doc(), {
            ticketId: ticketRef.id,
            userId: userId || null,
            action: 'Skapad',
            note: 'Automatiskt skapad vid reparationsanmälan',
            createdAt: new Date().toISOString()
          });
        } else if (status === 'Aktiv' && item.status === 'Under reparation') {
          // If moving from 'Under reparation' back to 'Aktiv', find and close the ticket
          const openTicketsSnapshot = await firestore.collection('support_tickets')
            .where('selectCareId', '==', id)
            .where('status', '!=', 'Avslutad')
            .get();
          
          openTicketsSnapshot.docs.forEach(ticketDoc => {
            transaction.update(ticketDoc.ref, { status: 'Avslutad', updatedAt: new Date().toISOString() });
            transaction.set(firestore.collection('support_ticket_logs').doc(), {
              ticketId: ticketDoc.id,
              userId: userId || null,
              action: 'Status ändrad',
              note: 'Avslutad automatiskt då enheten markerats som Aktiv',
              createdAt: new Date().toISOString()
            });
          });
        }
      });

      res.json({ success: true });
    } catch (e: any) {
      console.error('[API] Error updating status:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/select-care/:id", async (req, res) => {
    try {
      const { brand, model, color, memory, imei, purchasePlace, orderNumber, purchaseDate, purchasePrice, monthlyFee, userId, contractPeriod, endDate, siemensContractNumber, sellerId, trackingNumber } = req.body;
      await firestore.collection('select_care').doc(req.params.id).update({
        brand,
        model,
        color,
        memory,
        imei,
        purchasePlace,
        orderNumber,
        purchaseDate,
        purchasePrice,
        monthlyFee,
        userId,
        contractPeriod,
        endDate,
        siemensContractNumber,
        sellerId,
        trackingNumber: trackingNumber || null,
        updatedAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (e: any) {
      console.error('Update SC Error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Contracts
  app.get("/api/contracts", async (req, res) => {
    const { userId, isAdmin, role, sellerId } = req.query;
    
    if (!userId) {
      return res.status(401).json({ error: "Användar-ID saknas." });
    }

    const isPrivileged = isAdmin === 'true' || isAdmin === '1' || role?.toString().toLowerCase() === 'administratör' || role?.toString().toLowerCase() === 'support';
    
    try {
      let query: any = firestore.collection('contracts');
      if (isPrivileged) {
        if (sellerId) {
          query = query.where('sellerId', '==', sellerId);
        }
      } else {
        query = query.where('sellerId', '==', userId);
      }
      
      const snapshot = await query.orderBy('createdAt', 'desc').get();
      const contracts = await Promise.all(snapshot.docs.map(async (doc) => {
        const data = doc.data();
        let customerName = '';
        if (data.customerId) {
          const customerDoc = await firestore.collection('customers').doc(data.customerId.toString()).get();
          if (customerDoc.exists) {
            customerName = customerDoc.data()?.name || '';
          }
        }
        
        // Fetch files for each contract
        const filesSnapshot = await firestore.collection('contract_files').where('contractId', '==', doc.id).get();
        const files = filesSnapshot.docs.map(fileDoc => {
          const fileData = fileDoc.data();
          return {
            id: fileDoc.id,
            name: fileData.name,
            mimeType: fileData.mimeType,
            size: fileData.size,
            createdAt: fileData.createdAt
          };
        });

        return { id: doc.id, ...data, customerName, files };
      }));

      res.json(contracts);
    } catch (error) {
      res.status(500).json({ error: "Kunde inte hämta avtal" });
    }
  });

  app.post("/api/contracts", upload.array('files'), async (req, res) => {
    const { customerId, type, startDate, contractPeriod, endDate, sellerId, contractCategory, customFields, company, userId, isAdmin, role } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!userId) {
      return res.status(401).json({ error: "Användar-ID saknas. Vänligen logga in igen." });
    }

    try {
      const isPrivileged = isAdmin === 'true' || isAdmin === '1' || role?.toString().toLowerCase() === 'administratör' || role?.toString().toLowerCase() === 'support';
      const customerDoc = await firestore.collection('customers').doc(customerId.toString()).get();
      const customer = customerDoc.data();
      
      if (!customer) {
        return res.status(404).json({ error: "Kund hittades inte." });
      }

      const userDoc = await firestore.collection('users').doc(userId.toString()).get();
      const user = userDoc.data();
      if (!user) {
        return res.status(401).json({ error: "Användare hittades inte." });
      }
      const fullName = `${user.firstName} ${user.lastName}`;

      if (!isPrivileged && customer.responsibleSeller !== fullName) {
        return res.status(403).json({ error: "Du har inte behörighet att lägga till avtal för denna kund." });
      }

      const docRef = await firestore.collection('contracts').add({
        customerId,
        type,
        startDate,
        contractPeriod,
        endDate,
        sellerId,
        contractCategory,
        customFields,
        company,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      if (files && files.length > 0) {
        for (const file of files) {
          await firestore.collection('contract_files').add({
            contractId: docRef.id,
            name: file.originalname,
            mimeType: file.mimetype,
            data: file.buffer.toString('base64'), // Store as base64 in Firestore
            size: file.size,
            createdAt: new Date().toISOString()
          });
        }
      }

      res.json({ id: docRef.id });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte spara avtal" });
    }
  });

  app.put("/api/contracts/:id", upload.array('files'), async (req, res) => {
    const { customerId, type, startDate, contractPeriod, endDate, sellerId, contractCategory, customFields, company, userId, isAdmin, role } = req.body;
    const files = req.files as Express.Multer.File[];
    const id = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "Användar-ID saknas. Vänligen logga in igen." });
    }

    try {
      const isPrivileged = isAdmin === 'true' || isAdmin === '1' || role?.toString().toLowerCase() === 'administratör' || role?.toString().toLowerCase() === 'support';
      const customerDoc = await firestore.collection('customers').doc(customerId.toString()).get();
      const customer = customerDoc.data();
      
      if (!customer) {
        return res.status(404).json({ error: "Kund hittades inte." });
      }

      const userDoc = await firestore.collection('users').doc(userId.toString()).get();
      const user = userDoc.data();
      if (!user) {
        return res.status(401).json({ error: "Användare hittades inte." });
      }
      const fullName = `${user.firstName} ${user.lastName}`;

      if (!isPrivileged && customer.responsibleSeller !== fullName) {
        return res.status(403).json({ error: "Du har inte behörighet att redigera detta avtal." });
      }

      await firestore.collection('contracts').doc(id).update({
        customerId,
        type,
        startDate,
        contractPeriod,
        endDate,
        sellerId,
        contractCategory,
        customFields,
        company,
        updatedAt: new Date().toISOString()
      });

      if (files && files.length > 0) {
        for (const file of files) {
          await firestore.collection('contract_files').add({
            contractId: id,
            name: file.originalname,
            mimeType: file.mimetype,
            data: file.buffer.toString('base64'),
            size: file.size,
            createdAt: new Date().toISOString()
          });
        }
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte uppdatera avtal" });
    }
  });

  app.get("/api/files/:id", async (req, res) => {
    try {
      const doc = await firestore.collection('contract_files').doc(req.params.id).get();
      if (!doc.exists) return res.status(404).send('File not found');
      const file = doc.data()!;

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
      res.send(Buffer.from(file.data, 'base64'));
    } catch (error) {
      res.status(500).send('Internal Server Error');
    }
  });

  app.get("/api/files/:id/download", async (req, res) => {
    try {
      const doc = await firestore.collection('contract_files').doc(req.params.id).get();
      if (!doc.exists) return res.status(404).send('File not found');
      const file = doc.data()!;

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
      res.send(Buffer.from(file.data, 'base64'));
    } catch (error) {
      res.status(500).send('Internal Server Error');
    }
  });

  app.delete("/api/files/:id", async (req, res) => {
    try {
      await firestore.collection('contract_files').doc(req.params.id).delete();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte radera fil" });
    }
  });

  app.delete("/api/contracts/:id", async (req, res) => {
    const { id } = req.params;
    const { userId, isAdmin, role } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "Användar-ID saknas. Vänligen logga in igen." });
    }

    try {
      const isPrivileged = isAdmin === 'true' || isAdmin === '1' || role?.toString().toLowerCase() === 'administratör' || role?.toString().toLowerCase() === 'support';
      const contractDoc = await firestore.collection('contracts').doc(id).get();
      if (!contractDoc.exists) return res.status(404).json({ error: "Avtal hittades inte." });
      const contract = contractDoc.data()!;

      const customerDoc = await firestore.collection('customers').doc(contract.customerId.toString()).get();
      if (!customerDoc.exists) return res.status(404).json({ error: "Kund hittades inte." });
      const customer = customerDoc.data()!;

      const userDoc = await firestore.collection('users').doc(userId.toString()).get();
      if (!userDoc.exists) return res.status(401).json({ error: "Användare hittades inte." });
      const user = userDoc.data()!;
      const fullName = `${user.firstName} ${user.lastName}`;

      if (!isPrivileged && customer.responsibleSeller !== fullName) {
        return res.status(403).json({ error: "Du har inte behörighet att radera detta avtal." });
      }

      await firestore.runTransaction(async (transaction) => {
        const filesSnapshot = await firestore.collection('contract_files').where('contractId', '==', id).get();
        filesSnapshot.docs.forEach(fileDoc => transaction.delete(fileDoc.ref));
        transaction.delete(contractDoc.ref);
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte radera avtal" });
    }
  });

  // Contract Companies
  app.get("/api/contract-companies", async (req, res) => {
    const { userId, isAdmin } = req.query;
    if (!userId) return res.status(400).json({ error: "userId saknas" });

    try {
      let query: any = firestore.collection('contract_companies');
      if (!(isAdmin === 'true' || isAdmin === '1')) {
        query = query.where('userId', '==', userId);
      }
      const snapshot = await query.orderBy('name', 'asc').get();
      const companies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(companies);
    } catch (error) {
      res.status(500).json({ error: "Kunde inte hämta företag" });
    }
  });

  app.post("/api/contract-companies", async (req, res) => {
    const { userId, name } = req.body;
    if (!userId || !name) return res.status(400).json({ error: "userId och name saknas" });

    try {
      await firestore.collection('contract_companies').add({ userId, name });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Kunde inte spara företaget" });
    }
  });

  // Support Tickets
  app.get('/api/users/support-staff', async (req, res) => {
    try {
      const snapshot = await firestore.collection('users').get();
      const staff = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }))
        .filter(u => u.isAdmin === 1 || u.role === 'Support' || u.isAdmin === true)
        .sort((a, b) => a.firstName.localeCompare(b.firstName));
      res.json(staff);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch support staff' });
    }
  });

  app.post('/api/support-tickets/:id/assign', async (req, res) => {
    const { id } = req.params;
    const { assignedTo, userId, note } = req.body;

    try {
      const ticketRef = firestore.collection('support_tickets').doc(id);
      const ticketDoc = await ticketRef.get();
      if (!ticketDoc.exists) return res.status(404).json({ error: 'Ticket not found' });

      const assigneeDoc = await firestore.collection('users').doc(assignedTo.toString()).get();
      const assigneeData = assigneeDoc.data();
      const assigneeName = assigneeData ? `${assigneeData.firstName} ${assigneeData.lastName}` : 'Ingen';

      await firestore.runTransaction(async (transaction) => {
        transaction.update(ticketRef, { assignedTo, isReadByAdmin: 0, updatedAt: new Date().toISOString() });
        transaction.set(firestore.collection('support_ticket_logs').doc(), {
          ticketId: id,
          userId,
          action: 'Tilldelning',
          note: note || `Ärendet tilldelades till ${assigneeName}`,
          createdAt: new Date().toISOString()
        });
      });

      // Broadcast notification via WebSocket if assignee is online
      const notification = JSON.stringify({
        type: 'notification',
        message: `Du har tilldelats supportärende ${id}`,
        ticketId: id
      });

      wss.clients.forEach((client) => {
        const user = activeUsers.get(client);
        if (user && user.id.toString() === assignedTo.toString() && client.readyState === WebSocket.OPEN) {
          client.send(notification);
        }
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to assign ticket' });
    }
  });

  app.get("/api/support-tickets/new/count", async (req, res) => {
    const { userId, isAdmin, role } = req.query;
    const isPrivileged = isAdmin === 'true' || isAdmin === '1' || role?.toString().toLowerCase() === 'administratör' || role?.toString().toLowerCase() === 'support';
    
    try {
      const ticketsSnapshot = await firestore.collection('support_tickets').get();
      let count = 0;
      
      if (isPrivileged) {
        count = ticketsSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.isReadByAdmin === 0 || (data.isTagged === 1 && data.taggedUserId?.toString() === userId?.toString());
        }).length;
      } else {
        const userDoc = await firestore.collection('users').doc(userId?.toString() || '').get();
        const userData = userDoc.data();
        const userFullName = `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim();

        const customersSnapshot = await firestore.collection('customers').where('responsibleSeller', '==', userFullName).get();
        const customerIds = customersSnapshot.docs.map(doc => doc.id);

        count = ticketsSnapshot.docs.filter(doc => {
          const data = doc.data();
          const isCreator = data.createdBy?.toString() === userId?.toString();
          const isResponsible = customerIds.includes(data.customerId?.toString());
          return (data.isReadByCreator === 0 && (isResponsible || isCreator)) || (data.isTagged === 1 && data.taggedUserId?.toString() === userId?.toString());
        }).length;
      }
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch ticket count' });
    }
  });

  app.get("/api/support-tickets", async (req, res) => {
    const { userId, isAdmin, role, customerId } = req.query;
    const isPrivileged = isAdmin === 'true' || isAdmin === '1' || role?.toString().toLowerCase() === 'administratör' || role?.toString().toLowerCase() === 'support';
    
    try {
      let query: any = firestore.collection('support_tickets');
      
      if (!isPrivileged) {
        // Non-privileged users can only see tickets for customers they are responsible for OR where they are tagged
        const userDoc = await firestore.collection('users').doc(userId?.toString() || '').get();
        const userData = userDoc.data();
        const userFullName = `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim();

        const customersSnapshot = await firestore.collection('customers').where('responsibleSeller', '==', userFullName).get();
        const customerIds = customersSnapshot.docs.map(doc => doc.id);

        // Firestore doesn't support OR across different fields easily without multiple queries or 'in' operator
        // For simplicity, we'll fetch all and filter in memory if it's not too many, or use multiple queries
        const ticketsSnapshot = await firestore.collection('support_tickets').get();
        let tickets = ticketsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        
        tickets = tickets.filter(t => 
          customerIds.includes(t.customerId?.toString()) || 
          t.taggedUserId?.toString() === userId?.toString() ||
          t.createdBy?.toString() === userId?.toString()
        );

        if (customerId) {
          tickets = tickets.filter(t => t.customerId?.toString() === customerId.toString());
        }

        tickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        
        // Enrich with names
        const enrichedTickets = await Promise.all(tickets.map(async (t) => {
          const customerDoc = await firestore.collection('customers').doc(t.customerId?.toString() || '').get();
          const creatorDoc = await firestore.collection('users').doc(t.createdBy?.toString() || '').get();
          const assignedDoc = await firestore.collection('users').doc(t.assignedTo?.toString() || '').get();
          const scDoc = t.selectCareId ? await firestore.collection('select_care').doc(t.selectCareId).get() : null;

          return {
            ...t,
            customerName: customerDoc.data()?.name || 'Okänd kund',
            creatorName: creatorDoc.data() ? `${creatorDoc.data()?.firstName} ${creatorDoc.data()?.lastName}` : 'System',
            assignedName: assignedDoc.data() ? `${assignedDoc.data()?.firstName} ${assignedDoc.data()?.lastName}` : 'Ingen',
            deviceName: scDoc?.data() ? `${scDoc.data()?.brand} ${scDoc.data()?.model}` : null
          };
        }));

        return res.json(enrichedTickets);
      } else {
        if (customerId) {
          query = query.where('customerId', '==', customerId);
        }
        const snapshot = await query.orderBy('updatedAt', 'desc').get();
        const tickets = await Promise.all(snapshot.docs.map(async (doc) => {
          const t = doc.data();
          const customerDoc = await firestore.collection('customers').doc(t.customerId?.toString() || '').get();
          const creatorDoc = await firestore.collection('users').doc(t.createdBy?.toString() || '').get();
          const assignedDoc = await firestore.collection('users').doc(t.assignedTo?.toString() || '').get();
          const scDoc = t.selectCareId ? await firestore.collection('select_care').doc(t.selectCareId).get() : null;

          return {
            id: doc.id,
            ...t,
            customerName: customerDoc.data()?.name || 'Okänd kund',
            creatorName: creatorDoc.data() ? `${creatorDoc.data()?.firstName} ${creatorDoc.data()?.lastName}` : 'System',
            assignedName: assignedDoc.data() ? `${assignedDoc.data()?.firstName} ${assignedDoc.data()?.lastName}` : 'Ingen',
            deviceName: scDoc?.data() ? `${scDoc.data()?.brand} ${scDoc.data()?.model}` : null
          };
        }));
        res.json(tickets);
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tickets' });
    }
  });

  app.get("/api/support-tickets/:id", async (req, res) => {
    try {
      const ticketDoc = await firestore.collection('support_tickets').doc(req.params.id).get();
      if (!ticketDoc.exists) return res.status(404).json({ error: "Ticket not found" });
      const ticket = ticketDoc.data()!;

      const customerDoc = await firestore.collection('customers').doc(ticket.customerId?.toString() || '').get();
      const creatorDoc = await firestore.collection('users').doc(ticket.createdBy?.toString() || '').get();
      const assignedDoc = await firestore.collection('users').doc(ticket.assignedTo?.toString() || '').get();
      const scDoc = ticket.selectCareId ? await firestore.collection('select_care').doc(ticket.selectCareId).get() : null;

      const enrichedTicket = {
        id: ticketDoc.id,
        ...ticket,
        customerName: customerDoc.data()?.name || 'Okänd kund',
        responsibleSeller: customerDoc.data()?.responsibleSeller,
        creatorName: creatorDoc.data() ? `${creatorDoc.data()?.firstName} ${creatorDoc.data()?.lastName}` : 'System',
        assignedName: assignedDoc.data() ? `${assignedDoc.data()?.firstName} ${assignedDoc.data()?.lastName}` : 'Ingen',
        deviceName: scDoc?.data() ? `${scDoc.data()?.brand} ${scDoc.data()?.model}` : null
      };

      const { userId, isAdmin, role } = req.query;
      const isPrivileged = isAdmin === 'true' || isAdmin === '1' || role?.toString().toLowerCase() === 'administratör' || role?.toString().toLowerCase() === 'support';

      // Mark as read when viewed
      if (isPrivileged) {
        await firestore.collection('support_tickets').doc(req.params.id).update({ isReadByAdmin: 1, isTagged: 0 });
      } else {
        await firestore.collection('support_tickets').doc(req.params.id).update({ isReadByCreator: 1, isTagged: 0 });
      }
      
      const logsSnapshot = await firestore.collection('support_ticket_logs').where('ticketId', '==', req.params.id).orderBy('createdAt', 'desc').get();
      const logs = await Promise.all(logsSnapshot.docs.map(async (doc) => {
        const logData = doc.data();
        const userDoc = await firestore.collection('users').doc(logData.userId?.toString() || '').get();
        const userData = userDoc.data();
        return {
          id: doc.id,
          ...logData,
          userName: userData ? `${userData.firstName} ${userData.lastName}` : 'System',
          timestamp: logData.createdAt // Use createdAt as timestamp
        };
      }));
      
      res.json({ ...enrichedTicket, logs });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch ticket' });
    }
  });

  app.post("/api/support-tickets", async (req, res) => {
    try {
      const { customerId, selectCareId, title, description, status, priority, createdBy, assignedTo } = req.body;
      
      if (!customerId || !title) {
        return res.status(400).json({ error: "Företag och titel krävs" });
      }

      const ticketNumber = `SUP-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      
      const userDoc = await firestore.collection('users').doc(createdBy?.toString() || '').get();
      const user = userDoc.data();
      const isPrivileged = user && (user.isAdmin === 1 || user.role?.toLowerCase() === 'administratör' || user.role?.toLowerCase() === 'support' || user.isAdmin === true);
      
      let isReadByAdmin = isPrivileged ? 1 : 0;
      if (assignedTo) {
        isReadByAdmin = 0;
      } else if (!isPrivileged) {
        isReadByAdmin = 0;
      }
      
      const isReadByCreator = isPrivileged ? 0 : 1;

      const docRef = await firestore.collection('support_tickets').add({
        ticketNumber,
        customerId,
        selectCareId: selectCareId || null,
        title,
        description,
        status: status || 'Registrerad',
        priority: priority || 'Normal',
        createdBy: createdBy || null,
        assignedTo: assignedTo || null,
        isReadByAdmin,
        isReadByCreator,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      await firestore.collection('support_ticket_logs').add({
        ticketId: docRef.id,
        userId: createdBy || null,
        action: 'Skapad',
        note: assignedTo ? `Ärendet har registrerats och tilldelats` : 'Ärendet har registrerats',
        createdAt: new Date().toISOString()
      });
      
      res.json({ id: docRef.id, ticketNumber });
    } catch (error) {
      res.status(500).json({ error: "Kunde inte spara supportärendet" });
    }
  });

  app.put("/api/support-tickets/:id", async (req, res) => {
    const { title, description, status, priority, userId, note } = req.body;
    const { id } = req.params;
    
    try {
      const ticketRef = firestore.collection('support_tickets').doc(id);
      const ticketDoc = await ticketRef.get();
      if (!ticketDoc.exists) return res.status(404).json({ error: 'Ticket not found' });
      const oldTicket = ticketDoc.data()!;

      const userDoc = await firestore.collection('users').doc(userId?.toString() || '').get();
      const user = userDoc.data();
      const isPrivileged = user && (user.isAdmin === 1 || user.role?.toLowerCase() === 'administratör' || user.role?.toLowerCase() === 'support' || user.isAdmin === true);

      await firestore.runTransaction(async (transaction) => {
        transaction.update(ticketRef, {
          title,
          description,
          status,
          priority,
          updatedAt: new Date().toISOString(),
          isReadByAdmin: isPrivileged ? 1 : 0,
          isReadByCreator: isPrivileged ? 0 : 1,
          isTagged: 0
        });
        
        let action = 'Uppdaterad';
        if (oldTicket.status !== status) {
          action = `Status ändrad till ${status}`;
        }
        
        transaction.set(firestore.collection('support_ticket_logs').doc(), {
          ticketId: id,
          userId,
          action,
          note: note || '',
          createdAt: new Date().toISOString()
        });

        // If status is changed to 'Avslutad' and there is a selectCareId, activate the unit
        if (status === 'Avslutad' && oldTicket.selectCareId) {
          const scRef = firestore.collection('select_care').doc(oldTicket.selectCareId);
          const scDoc = await transaction.get(scRef);
          const sc = scDoc.data();
          if (sc && sc.status === 'Under reparation') {
            transaction.update(scRef, { status: 'Aktiv', updatedAt: new Date().toISOString() });
            
            transaction.set(firestore.collection('select_care_logs').doc(), {
              selectCareId: oldTicket.selectCareId,
              userId: userId || null,
              fromStatus: 'Under reparation',
              toStatus: 'Aktiv',
              notes: `Aktiverad via supportärende ${id}: ${note || 'Ärendet avslutat'}`,
              createdAt: new Date().toISOString()
            });
          }
        }
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update ticket' });
    }
  });

  app.post("/api/support-tickets/:id/logs", async (req, res) => {
    const { userId, note, action } = req.body;
    const { id } = req.params;
    
    try {
      const ticketRef = firestore.collection('support_tickets').doc(id);
      const ticketDoc = await ticketRef.get();
      if (!ticketDoc.exists) return res.status(404).json({ error: 'Ticket not found' });
      const ticket = ticketDoc.data()!;

      const userDoc = await firestore.collection('users').doc(userId?.toString() || '').get();
      const user = userDoc.data();
      const isPrivileged = user && (user.isAdmin === 1 || user.role?.toLowerCase() === 'administratör' || user.role?.toLowerCase() === 'support' || user.isAdmin === true);

      await firestore.runTransaction(async (transaction) => {
        transaction.set(firestore.collection('support_ticket_logs').doc(), {
          ticketId: id,
          userId,
          action: action || 'Kommentar',
          note,
          createdAt: new Date().toISOString()
        });
        
        if (isPrivileged) {
          transaction.update(ticketRef, { updatedAt: new Date().toISOString(), isReadByCreator: 0, isReadByAdmin: 1 });
        } else {
          transaction.update(ticketRef, { updatedAt: new Date().toISOString(), isReadByAdmin: 0, isReadByCreator: 1 });
        }

        // Also log to Select Care history if linked
        if (ticket.selectCareId) {
          transaction.set(firestore.collection('select_care_logs').doc(), {
            selectCareId: ticket.selectCareId,
            userId: userId || null,
            fromStatus: 'Under reparation',
            toStatus: 'Under reparation',
            notes: `Uppdatering via supportärende: ${note}`,
            createdAt: new Date().toISOString()
          });
        }
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add log' });
    }
  });

  app.post("/api/support-tickets/:id/tag-seller", async (req, res) => {
    const { userId, sellerName } = req.body;
    const { id } = req.params;
    
    try {
      const usersSnapshot = await firestore.collection('users').get();
      const seller = usersSnapshot.docs.find(doc => {
        const data = doc.data();
        return `${data.firstName} ${data.lastName}` === sellerName;
      });
      const sellerId = seller?.id;

      await firestore.runTransaction(async (transaction) => {
        transaction.set(firestore.collection('support_ticket_logs').doc(), {
          ticketId: id,
          userId,
          action: 'Säljare taggad',
          note: `Säljaren ${sellerName} har taggats i ärendet.`,
          createdAt: new Date().toISOString()
        });
        
        transaction.update(firestore.collection('support_tickets').doc(id), { 
          updatedAt: new Date().toISOString(), 
          isTagged: 1, 
          taggedUserId: sellerId || null 
        });
      });

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
  app.get("/api/calendar-events", async (req, res) => {
    const { sellerId } = req.query;
    try {
      let query: any = firestore.collection('calendar_events');
      if (sellerId) {
        query = query.where('sellerId', '==', sellerId);
      }
      const snapshot = await query.get();
      const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch calendar events' });
    }
  });

  app.post("/api/calendar-events", async (req, res) => {
    const { title, description, startDate, endDate, sellerId, type, relatedId } = req.body;
    try {
      const docRef = await firestore.collection('calendar_events').add({
        title,
        description,
        startDate,
        endDate,
        sellerId,
        type,
        relatedId,
        createdAt: new Date().toISOString()
      });
      res.json({ id: docRef.id });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create calendar event' });
    }
  });

  app.put("/api/calendar-events/:id", async (req, res) => {
    const { title, description, startDate, endDate, sellerId, type, relatedId } = req.body;
    try {
      await firestore.collection('calendar_events').doc(req.params.id).update({
        title,
        description,
        startDate,
        endDate,
        sellerId,
        type,
        relatedId,
        updatedAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update calendar event' });
    }
  });

  app.delete("/api/calendar-events/:id", async (req, res) => {
    try {
      await firestore.collection('calendar_events').doc(req.params.id).delete();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete calendar event' });
    }
  });

  // Statistics
  app.get("/api/stats", async (req, res) => {
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

    try {
      const sId = sellerId && sellerId !== 'undefined' && sellerId !== 'null' && sellerId !== '' ? sellerId.toString() : null;

      let customerCount = 0;
      if (sId !== null) {
        const userDoc = await firestore.collection('users').doc(sId).get();
        const user = userDoc.data();
        if (user) {
          const fullName = `${user.firstName} ${user.lastName}`;
          const snapshot = await firestore.collection('customers').where('responsibleSeller', '==', fullName).count().get();
          customerCount = snapshot.data().count;
        }
      } else if (isUserAdmin) {
        const snapshot = await firestore.collection('customers').count().get();
        customerCount = snapshot.data().count;
      } else {
        return res.status(403).json({ error: "Obehörig åtkomst" });
      }

      // Helper to get monthly stats from Firestore
      const getMonthlyStats = async (collectionName: string, dateCol: string, revenueCol: string) => {
        let query: any = firestore.collection(collectionName);
        
        const startOfYear = `${yearStr}-01-01T00:00:00.000Z`;
        const endOfYear = `${yearStr}-12-31T23:59:59.999Z`;
        
        query = query.where(dateCol, '>=', startOfYear).where(dateCol, '<=', endOfYear);
        
        if (sId !== null) {
          query = query.where('sellerId', '==', sId);
        }

        const snapshot = await query.get();
        const data = snapshot.docs.map((doc: any) => doc.data());

        const monthlyData = months.map(m => {
          const monthDocs = data.filter((d: any) => d[dateCol] && d[dateCol].startsWith(m));
          const revenue = monthDocs.reduce((sum: number, d: any) => sum + (Number(d[revenueCol]) || 0), 0);
          return {
            month: m,
            count: monthDocs.length,
            revenue
          };
        });

        return monthlyData;
      };

      const equipmentSales = await getMonthlyStats('equipment', 'purchaseDate', 'customerPrice');
      const selectCareSales = await getMonthlyStats('select_care', 'purchaseDate', 'monthlyFee');
      const drivingLogSales = await getMonthlyStats('driving_logs', 'createdAt', 'monthlyFee');
      const itEquipmentSales = await getMonthlyStats('it_equipment', 'purchaseDate', 'customerPrice');

      // Top items
      const getTopItems = async (collectionName: string, limit: number = 1) => {
        let query: any = firestore.collection(collectionName);
        const startOfYear = `${yearStr}-01-01T00:00:00.000Z`;
        const endOfYear = `${yearStr}-12-31T23:59:59.999Z`;
        query = query.where('purchaseDate', '>=', startOfYear).where('purchaseDate', '<=', endOfYear);
        
        if (sId !== null) {
          query = query.where('sellerId', '==', sId);
        }

        const snapshot = await query.get();
        const counts: { [key: string]: { brand: string, model: string, count: number } } = {};
        
        snapshot.docs.forEach((doc: any) => {
          const data = doc.data();
          const key = `${data.brand}|${data.model}`;
          if (!counts[key]) {
            counts[key] = { brand: data.brand, model: data.model, count: 0 };
          }
          counts[key].count++;
        });

        const sorted = Object.values(counts).sort((a, b) => b.count - a.count);
        return limit === 1 ? (sorted[0] || null) : sorted.slice(0, limit);
      };

      const topModel = await getTopItems('equipment', 1);
      const topMobiles = await getTopItems('equipment', 5);

      // Total Revenue
      const equipmentRevenue = equipmentSales.reduce((sum, m) => sum + m.revenue, 0);
      const selectCareRevenue = selectCareSales.reduce((sum, m) => sum + m.revenue, 0);
      const drivingLogRevenue = drivingLogSales.reduce((sum, m) => sum + m.revenue, 0);
      const itRevenue = itEquipmentSales.reduce((sum, m) => sum + m.revenue, 0);
      const drivingLogsCount = drivingLogSales.reduce((sum, m) => sum + m.count, 0);

      // Expiring items
      const now = new Date();
      const nowStr = now.toISOString();
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      const sixMonthsStr = sixMonthsFromNow.toISOString();

      const getExpiring = async (collectionName: string) => {
        let query: any = firestore.collection(collectionName)
          .where('endDate', '<=', sixMonthsStr)
          .where('endDate', '>=', nowStr);
        
        if (sId !== null) {
          query = query.where('sellerId', '==', sId);
        }

        const snapshot = await query.orderBy('endDate', 'asc').get();
        return Promise.all(snapshot.docs.map(async (doc: any) => {
          const data = doc.data();
          const customerDoc = await firestore.collection('customers').doc(data.customerId).get();
          return {
            id: doc.id,
            ...data,
            customerName: customerDoc.exists ? customerDoc.data()?.name : 'Okänd'
          };
        }));
      };

      const expiringSelectCare = await getExpiring('select_care');
      const expiringContracts = await getExpiring('contracts');

      // Top Sellers (filtered by year)
      const getSellersRevenue = async () => {
        const collections = [
          { name: 'equipment', dateCol: 'purchaseDate', revCol: 'customerPrice' },
          { name: 'select_care', dateCol: 'purchaseDate', revCol: 'monthlyFee' },
          { name: 'driving_logs', dateCol: 'createdAt', revCol: 'monthlyFee' },
          { name: 'it_equipment', dateCol: 'purchaseDate', revCol: 'customerPrice' }
        ];

        const sellerRevenues: { [key: string]: number } = {};
        const startOfYear = `${yearStr}-01-01T00:00:00.000Z`;
        const endOfYear = `${yearStr}-12-31T23:59:59.999Z`;

        for (const col of collections) {
          const snapshot = await firestore.collection(col.name)
            .where(col.dateCol, '>=', startOfYear)
            .where(col.dateCol, '<=', endOfYear)
            .get();
          
          snapshot.docs.forEach((doc: any) => {
            const data = doc.data();
            if (data.sellerId) {
              sellerRevenues[data.sellerId] = (sellerRevenues[data.sellerId] || 0) + (Number(data[col.revCol]) || 0);
            }
          });
        }

        const sortedSellers = await Promise.all(
          Object.entries(sellerRevenues)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(async ([id, totalRevenue]) => {
              const userDoc = await firestore.collection('users').doc(id).get();
              const userData = userDoc.data();
              return {
                firstName: userData?.firstName || 'Okänd',
                lastName: userData?.lastName || '',
                totalRevenue
              };
            })
        );

        return sortedSellers;
      };

      const topSellers = await getSellersRevenue();

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
        itRevenue,
        drivingLogsCount,
        expiringSelectCare,
        expiringContracts,
        topSellers,
        topMobiles
      });
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({ error: "Kunde inte hämta statistik." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    const isCompiled = __dirname.endsWith("dist");
    const finalDistPath = isCompiled ? __dirname : distPath;

    app.use(express.static(finalDistPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(finalDistPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
