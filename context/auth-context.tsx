"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string;
  publicKey?: string;
  encryptedPrivateKey?: string;
}

interface AuthContextType {
  user: User | null;
  privateKey: string | null;
  sessionToken: string | null;
  login: (userData: User, decryptedPrivateKey: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Generate a secure session token
const generateSessionToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Session storage keys
const STORAGE_KEYS = {
  USER: "wazzup_user",
  PRIVATE_KEY: "wazzup_pk", // Shortened, less obvious
  SESSION_TOKEN: "wazzup_st",
} as const;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Clear all session data
  const clearSession = useCallback(() => {
    setUser(null);
    setPrivateKey(null);
    setSessionToken(null);
    
    // Use sessionStorage instead of localStorage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEYS.USER);
      sessionStorage.removeItem(STORAGE_KEYS.PRIVATE_KEY);
      sessionStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      // Use sessionStorage - data cleared when tab closes
      const storedUser = sessionStorage.getItem(STORAGE_KEYS.USER);
      const storedKey = sessionStorage.getItem(STORAGE_KEYS.PRIVATE_KEY);
      const storedToken = sessionStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);

      if (storedUser && storedKey && storedToken) {
        setUser(JSON.parse(storedUser));
        setPrivateKey(storedKey);
        setSessionToken(storedToken);
      }
    } catch (error) {
      console.error("Failed to restore session:", error);
      clearSession();
    }
    
    setIsLoading(false);
  }, [clearSession]);

  // Auto-logout on storage tampering or window focus (optional security)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      // If session data was modified externally, logout for security
      if (e.key && Object.values(STORAGE_KEYS).includes(e.key as any)) {
        console.warn("Session storage tampering detected, logging out");
        clearSession();
        router.push("/login");
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [clearSession, router]);

  const login = useCallback((userData: User, decryptedPrivateKey: string) => {
    const newToken = generateSessionToken();
    
    setUser(userData);
    setPrivateKey(decryptedPrivateKey);
    setSessionToken(newToken);

    // Store in sessionStorage (cleared when tab/browser closes)
    // This is more secure than localStorage
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    sessionStorage.setItem(STORAGE_KEYS.PRIVATE_KEY, decryptedPrivateKey);
    sessionStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, newToken);

    router.push("/inbox");
  }, [router]);

  const logout = useCallback(() => {
    clearSession();
    router.push("/login");
  }, [clearSession, router]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      privateKey, 
      sessionToken,
      login, 
      logout, 
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
