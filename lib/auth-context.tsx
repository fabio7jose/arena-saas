'use client';

import { createContext, useContext, useState } from 'react';
import type { AuthUser } from './mockUsers';
import { MOCK_USERS } from './mockUsers';

type AuthContextValue = {
  user: AuthUser | null;
  setUser: (user: AuthUser) => void;
};

export const AuthContext = createContext<AuthContextValue>({
  user: { ...MOCK_USERS.admin, tenant: 'demo' },
  setUser: () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
