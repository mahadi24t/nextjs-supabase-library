'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Member } from '@/app/lib/types';

interface MemberAuthContextType {
  currentMember: Member | null;
  isMemberLoggedIn: boolean;
  loginMember: (member: Member) => void;
  logoutMember: () => void;
  /** Alias for loginMember */
  login: (member: Member) => void;
  /** Alias for logoutMember */
  logout: () => void;
}

const MemberAuthContext = createContext<MemberAuthContextType>({
  currentMember: null,
  isMemberLoggedIn: false,
  loginMember: () => {},
  logoutMember: () => {},
  login: () => {},
  logout: () => {},
});

const STORAGE_KEY = 'libstack_current_member';
const AUTH_EVENT = 'libstack_member_auth_change';

export function MemberAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentMember, setCurrentMember] = useState<Member | null>(null);

  // Read member safely on client mount
  useEffect(() => {
    const syncMember = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Member;
          setCurrentMember(parsed);
        } else {
          setCurrentMember(null);
        }
      } catch (err) {
        console.error('Failed to parse member from localStorage', err);
        localStorage.removeItem(STORAGE_KEY);
        setCurrentMember(null);
      }
    };

    syncMember();

    window.addEventListener(AUTH_EVENT, syncMember);
    window.addEventListener('storage', syncMember);

    return () => {
      window.removeEventListener(AUTH_EVENT, syncMember);
      window.removeEventListener('storage', syncMember);
    };
  }, []);

  const loginMember = useCallback((member: Member) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(member));
      setCurrentMember(member);
      window.dispatchEvent(new Event(AUTH_EVENT));
    } catch (err) {
      console.error('Failed to save member', err);
    }
  }, []);

  const logoutMember = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setCurrentMember(null);
      window.dispatchEvent(new Event(AUTH_EVENT));
    } catch (err) {
      console.error('Failed to clear member', err);
    }
  }, []);

  return (
    <MemberAuthContext.Provider
      value={{
        currentMember,
        isMemberLoggedIn: !!currentMember,
        loginMember,
        logoutMember,
        login: loginMember,
        logout: logoutMember,
      }}
    >
      {children}
    </MemberAuthContext.Provider>
  );
}

export function useMemberAuth() {
  return useContext(MemberAuthContext);
}
