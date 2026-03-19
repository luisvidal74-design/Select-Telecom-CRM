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
    if (user && Notification.permission === 'default') {
      Notification.requestPermission();
    }

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
        } else if (data.type === 'notification') {
          // Simple browser notification if supported, otherwise alert
          if (Notification.permission === 'granted') {
            new Notification('Select Telecom Support', {
              body: data.message,
              icon: 'https://usercontent.one/wp/rejban.se/wp-content/uploads/2025/04/Select-Telecom-Logotyp.png'
            });
          } else {
            alert(data.message);
          }
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
