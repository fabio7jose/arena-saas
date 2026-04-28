'use client';

import { useState, useEffect } from 'react';
import { AuthContext } from '@/lib/auth-context';
import type { AuthUser } from '@/lib/mockUsers';
import { MOCK_USERS } from '@/lib/mockUsers';

const DEFAULT_USER: AuthUser = { ...MOCK_USERS.admin, tenant: 'demo' };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser>(DEFAULT_USER);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('arena_auth_user');
      if (stored) setUserState(JSON.parse(stored) as AuthUser);
    } catch {
      // ignore
    }
  }, []);

  function setUser(u: AuthUser) {
    setUserState(u);
    try {
      localStorage.setItem('arena_auth_user', JSON.stringify(u));
    } catch {
      // ignore
    }
  }

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
