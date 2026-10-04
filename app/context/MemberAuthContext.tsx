'use client';

import {
  createContext,
  useContext,
  useCallback,
  useSyncExternalStore,
  ReactNode,
} from 'react';
import type { Member } from '@/app/lib/types';

const STORAGE_KEY = 'libstack_current_member';

interface MemberAuthContextType {
  currentMember: Member | null;
  isMemberLoggedIn: boolean;
  login: (member: Member) => void;
  logout: () => void;
}

const MemberAuthContext = createContext<MemberAuthContextType | undefined>(undefined);

function subscribeToMemberAuth(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('libstack_member_auth_change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('libstack_member_auth_change', callback);
  };
}

function getMemberSnapshot(): Member | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Member) : null;
  } catch {
    return null;
  }
}

function getServerMemberSnapshot(): Member | null {
  return null;
}

function dispatchMemberChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('libstack_member_auth_change'));
  }
}

export function MemberAuthProvider({ children }: { children: ReactNode }) {
  const currentMember = useSyncExternalStore(
    subscribeToMemberAuth,
    getMemberSnapshot,
    getServerMemberSnapshot,
  );

  const login = useCallback((member: Member) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(member));
      dispatchMemberChange();
    }
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      dispatchMemberChange();
    }
  }, []);

  return (
    <MemberAuthContext.Provider
      value={{
        currentMember,
        isMemberLoggedIn: currentMember !== null,
        login,
        logout,
      }}
    >
      {children}
    </MemberAuthContext.Provider>
  );
}

export function useMemberAuth() {
  const context = useContext(MemberAuthContext);
  if (!context) {
    throw new Error('useMemberAuth must be used within a MemberAuthProvider');
  }
  return context;
}
