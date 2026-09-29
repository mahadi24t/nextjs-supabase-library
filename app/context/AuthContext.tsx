'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AuthContextType {
  isAdmin: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  isLoginModalOpen: boolean;
  openLoginModal: (reason?: string) => void;
  closeLoginModal: () => void;
  loginPromptReason: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Lazy initial state reads localStorage safely without triggering cascading renders in useEffect
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('libstack_admin_auth') === 'true';
    }
    return false;
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginPromptReason, setLoginPromptReason] = useState<string | null>(null);

  const login = useCallback((password: string): boolean => {
    const configuredPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
    if (password === configuredPassword) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('libstack_admin_auth', 'true');
      }
      setIsAdmin(true);
      setIsLoginModalOpen(false);
      setLoginPromptReason(null);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('libstack_admin_auth');
    }
    setIsAdmin(false);
  }, []);

  const openLoginModal = useCallback((reason?: string) => {
    setLoginPromptReason(reason ?? null);
    setIsLoginModalOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setIsLoginModalOpen(false);
    setLoginPromptReason(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAdmin,
        login,
        logout,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        loginPromptReason,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
