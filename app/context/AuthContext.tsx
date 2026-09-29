'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useSyncExternalStore,
  ReactNode,
} from 'react';

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

function subscribeToAuth(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('libstack_auth_change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('libstack_auth_change', callback);
  };
}

function getAuthSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('libstack_admin_auth') === 'true';
}

function getServerAuthSnapshot(): boolean {
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Subscribes cleanly to localStorage; strictly defaults to false during SSR
  const isAdmin = useSyncExternalStore(subscribeToAuth, getAuthSnapshot, getServerAuthSnapshot);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginPromptReason, setLoginPromptReason] = useState<string | null>(null);

  const login = useCallback((password: string): boolean => {
    const configuredPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
    if (password === configuredPassword) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('libstack_admin_auth', 'true');
        window.dispatchEvent(new Event('libstack_auth_change'));
      }
      setIsLoginModalOpen(false);
      setLoginPromptReason(null);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('libstack_admin_auth');
      window.dispatchEvent(new Event('libstack_auth_change'));
    }
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
