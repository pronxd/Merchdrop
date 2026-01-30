"use client";

import { createContext, useContext } from "react";
import { useRouter } from "next/navigation";

interface TransitionContextType {
  startTransition: (url: string) => void;
}

const TransitionContext = createContext<TransitionContextType | undefined>(undefined);

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const startTransition = (url: string) => {
    // Set sessionStorage flag
    sessionStorage.setItem('showCircleTransition', 'true');
    console.log('Set sessionStorage flag, navigating to:', url);
    // Navigate immediately
    router.push(url);
  };

  return (
    <TransitionContext.Provider value={{ startTransition }}>
      {children}
    </TransitionContext.Provider>
  );
}

export function useTransition() {
  const context = useContext(TransitionContext);
  if (!context) {
    throw new Error("useTransition must be used within TransitionProvider");
  }
  return context;
}
