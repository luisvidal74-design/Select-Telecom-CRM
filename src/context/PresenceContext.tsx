import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User } from '../types';
import { useAuth } from './AuthContext';

interface PresenceContextType {
  activeUsers: User[];
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setActiveUsers([]);
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socketRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'join', user }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'presence') {
          setActiveUsers(data.users);
        }
      } catch (e) {
        console.error('Presence WS Error:', e);
      }
    };

    socket.onclose = () => {
      console.log('Presence WS Closed');
    };

    return () => {
      socket.close();
    };
  }, [user]);

  return (
    <PresenceContext.Provider value={{ activeUsers }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error('usePresence must be used within a PresenceProvider');
  }
  return context;
}
