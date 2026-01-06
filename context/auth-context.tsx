"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string; // ID
  name: string; // Display Name
  publicKey?: string;
  encryptedPrivateKey?: string;
}

interface AuthContextType {
  user: User | null;
  privateKey: string | null; // The decrypted private key
  login: (userData: User, decryptedPrivateKey: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check local storage on mount
    const storedUser = localStorage.getItem("wazzup_user");
    const storedKey = localStorage.getItem("wazzup_private_key"); // Storing decrypted key in LS is risky but ok for this demo
    // Better: Store encoded key and ask for password again? 
    // For MVP "Modern App" feel, we keep it in memory or LS. LS is easiest persistence.
    // Ideally: Session Storage.
    
    if (storedUser && storedKey) {
      setUser(JSON.parse(storedUser));
      setPrivateKey(storedKey);
    }
    setIsLoading(false);
  }, []);

  const login = (userData: User, decryptedPrivateKey: string) => {
    setUser(userData);
    setPrivateKey(decryptedPrivateKey);
    localStorage.setItem("wazzup_user", JSON.stringify(userData));
    localStorage.setItem("wazzup_private_key", decryptedPrivateKey); // CAUTION: In real app, don't persist plaintext private key
    router.push("/inbox");
  };

  const logout = () => {
    setUser(null);
    setPrivateKey(null);
    localStorage.removeItem("wazzup_user");
    localStorage.removeItem("wazzup_private_key");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, privateKey, login, logout, isLoading }}>
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
