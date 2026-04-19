"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface UIContextType {
  isNotifOpen: boolean;
  setIsNotifOpen: (val: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  return (
    <UIContext.Provider value={{ isNotifOpen, setIsNotifOpen }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used within UIProvider");
  return context;
}