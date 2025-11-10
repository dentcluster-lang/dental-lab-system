import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/config/firebase';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase Auth 상태 리스너
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setLoading(false);
      console.log('Auth state changed:', user ? 'Logged in' : 'Logged out');
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    // TODO: 로딩 스크린 추가
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <AppNavigator isAuthenticated={isAuthenticated} />
    </>
  );
}
