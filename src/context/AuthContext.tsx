import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as User;
            if (userData.status === 'approved') {
              setUser(userData);
            } else {
              await signOut(auth);
              setUser(null);
            }
          } else {
            // Check if there's a legacy user in localStorage (for migration)
            const savedUser = localStorage.getItem('select_telecom_user');
            if (savedUser) {
              setUser(JSON.parse(savedUser));
            } else {
              setUser(null);
            }
          }
        } catch (e) {
          console.error('Auth error:', e);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('select_telecom_user', JSON.stringify(userData));
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    localStorage.removeItem('select_telecom_user');
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('select_telecom_user', JSON.stringify(userData));
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
