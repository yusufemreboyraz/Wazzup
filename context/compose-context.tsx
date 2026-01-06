"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ComposeOptions {
  recipient?: string;
  subject?: string;
  message?: string;
}

interface ComposeContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  composeOptions: ComposeOptions;
  openCompose: (options?: ComposeOptions) => void;
}

const ComposeContext = createContext<ComposeContextType | undefined>(undefined);

export function ComposeProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [composeOptions, setComposeOptions] = useState<ComposeOptions>({});

  const openCompose = (options: ComposeOptions = {}) => {
    setComposeOptions(options);
    setOpen(true);
  };

  return (
    <ComposeContext.Provider value={{ open, setOpen, composeOptions, openCompose }}>
      {children}
    </ComposeContext.Provider>
  );
}

export function useCompose() {
  const context = useContext(ComposeContext);
  if (context === undefined) {
    throw new Error("useCompose must be used within a ComposeProvider");
  }
  return context;
}
