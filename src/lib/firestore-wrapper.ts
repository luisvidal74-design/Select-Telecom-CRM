import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getCountFromServer,
  writeBatch,
  runTransaction
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

class DocumentReferenceWrapper {
  constructor(public collectionPath: string, public id: string) {}
  async get() {
    const d = await getDoc(doc(db, this.collectionPath, this.id));
    return {
      exists: d.exists(),
      data: () => d.data(),
      id: d.id
    };
  }
  async update(data: any) {
    return await updateDoc(doc(db, this.collectionPath, this.id), data);
  }
  async delete() {
    return await deleteDoc(doc(db, this.collectionPath, this.id));
  }
}

class QueryWrapper {
  constructor(protected collectionPath: string, protected constraints: any[] = []) {}
  where(field: string, op: string, value: any) {
    return new QueryWrapper(this.collectionPath, [...this.constraints, where(field, op as any, value)]);
  }
  orderBy(field: string, direction: string = 'asc') {
    return new QueryWrapper(this.collectionPath, [...this.constraints, orderBy(field, direction as any)]);
  }
  limit(n: number) {
    return new QueryWrapper(this.collectionPath, [...this.constraints, limit(n)]);
  }
  async get() {
    const q = query(collection(db, this.collectionPath), ...this.constraints);
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => ({
      id: d.id,
      data: () => d.data(),
      ref: new DocumentReferenceWrapper(this.collectionPath, d.id)
    }));
    return {
      docs,
      size: snap.size,
      empty: snap.empty,
      forEach: (cb: any) => docs.forEach(cb)
    };
  }
  count() {
    return {
      get: async () => {
        const q = query(collection(db, this.collectionPath), ...this.constraints);
        const snap = await getCountFromServer(q);
        return {
          data: () => ({ count: snap.data().count })
        };
      }
    };
  }
}

class CollectionReferenceWrapper extends QueryWrapper {
  constructor(collectionPath: string) {
    super(collectionPath);
  }
  doc(id?: string) {
    if (!id) {
       // For add() we don't need id, but for doc().set() we do.
       // In firebase-admin, doc() without id generates a new ref.
       const newDoc = doc(collection(db, this.collectionPath));
       return new DocumentReferenceWrapper(this.collectionPath, newDoc.id);
    }
    return new DocumentReferenceWrapper(this.collectionPath, id);
  }
  async add(data: any) {
    const d = await addDoc(collection(db, this.collectionPath), data);
    return { id: d.id };
  }
}

export const firestore = {
  collection: (path: string) => new CollectionReferenceWrapper(path),
  batch: () => {
    const b = writeBatch(db);
    return {
      delete: (docRef: any) => b.delete(doc(db, docRef.collectionPath, docRef.id)),
      update: (docRef: any, data: any) => b.update(doc(db, docRef.collectionPath, docRef.id), data),
      set: (docRef: any, data: any) => b.set(doc(db, docRef.collectionPath, docRef.id), data),
      commit: () => b.commit()
    };
  },
  runTransaction: async (updateFunction: (transaction: any) => Promise<any>) => {
    return await runTransaction(db, async (transaction) => {
      const wrappedTransaction = {
        get: async (docRef: any) => {
          const d = await transaction.get(doc(db, docRef.collectionPath, docRef.id));
          return {
            exists: d.exists(),
            data: () => d.data(),
            id: d.id
          };
        },
        update: (docRef: any, data: any) => {
          transaction.update(doc(db, docRef.collectionPath, docRef.id), data);
          return wrappedTransaction;
        },
        delete: (docRef: any) => {
          transaction.delete(doc(db, docRef.collectionPath, docRef.id));
          return wrappedTransaction;
        },
        set: (docRef: any, data: any) => {
          transaction.set(doc(db, docRef.collectionPath, docRef.id), data);
          return wrappedTransaction;
        }
      };
      return await updateFunction(wrappedTransaction);
    });
  }
};
