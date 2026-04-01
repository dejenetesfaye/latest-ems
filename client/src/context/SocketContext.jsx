import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Only connect when user is logged in
    if (user) {
      const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const newSocket = io(socketUrl, {
        withCredentials: true,
      });
      newSocket.on('connect', () => {
        newSocket.emit('join', user._id);
        console.log('Joined real-time room:', user._id);
      });
      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
