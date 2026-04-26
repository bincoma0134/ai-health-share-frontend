"use client";

import { createContext, useContext, useState, useEffect, ReactNode, Dispatch, SetStateAction, useCallback } from "react";

export type UITheme = "light" | "dark";

// Đảm bảo interface này được khai báo rõ ràng để Vercel không báo lỗi nữa
export interface UIContextType {
  isNotifOpen: boolean;
  setIsNotifOpen: Dispatch<SetStateAction<boolean>>;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: Dispatch<SetStateAction<boolean>>;
  theme: UITheme;
  toggleTheme: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);
const THEME_STORAGE_KEY = "ai-health-share-theme";

export function UIProvider({ children }: { children: ReactNode }) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [theme, setTheme] = useState<UITheme>("light");

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as UITheme | null;
    if (stored === "dark" || stored === "light") { setTheme(stored); return; }
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) { setTheme("dark"); }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => { setTheme((t) => (t === "dark" ? "light" : "dark")); }, []);

  return (
    <UIContext.Provider value={{ isNotifOpen, setIsNotifOpen, isAuthModalOpen, setIsAuthModalOpen, theme, toggleTheme }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used within UIProvider");
  return context;
}