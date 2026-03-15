import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({ id: firebaseUser.uid as any, ...userDoc.data() } as User);
        } else {
          // Create new user if doesn't exist (default to pending)
          const newUser: User = {
            id: firebaseUser.uid as any,
            firstName: firebaseUser.displayName?.split(' ')[0] || '',
            lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
            email: firebaseUser.email || '',
            phone: '',
            role: 'Säljare',
            status: 'pending',
            isAdmin: 0,
            isSupport: 0
          };
          
          // Check if it's the bootstrap admin
          if (firebaseUser.email === 'luisvidal74@gmail.com') {
            newUser.isAdmin = 1;
            newUser.status = 'approved';
            newUser.role = 'Administratör';
          }

          await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen for real-time updates to the current user document
  useEffect(() => {
    if (user?.id) {
      const unsubscribe = onSnapshot(doc(db, 'users', user.id.toString()), (doc) => {
        if (doc.exists()) {
          setUser({ id: doc.id as any, ...doc.data() } as User);
        }
      });
      return () => unsubscribe();
    }
  }, [user?.id]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateUser = async (userData: User) => {
    if (auth.currentUser) {
      await setDoc(doc(db, 'users', auth.currentUser.uid), userData, { merge: true });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
